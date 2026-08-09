import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from "npm:zod@3.23.8";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const questionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
});

const quizSchema = z.object({
  questions: z.array(questionSchema).min(3).max(5),
});

const subtopicSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  keyTakeaways: z.array(z.string()),
  objectives: z.array(z.string()),
  keyConcepts: z.array(
    z.object({
      concept: z.string(),
      details: z.array(z.string()),
    })
  ),
  quiz: quizSchema,
});

const requestSchema = z.object({
  topic: z.string().min(1),
  scope: z.enum(["Quick", "Standard", "Comprehensive"]),
  model: z.enum([
    "Qwen/Qwen2.5-7B-Instruct",
    "Qwen/Qwen3-32B",
    "meta-llama/Meta-Llama-3.1-70B-Instruct",
  ]),
  parentSubtopic: subtopicSchema.optional(),
  subjectSummary: z.string().optional(),
  siblingTitles: z.array(z.string()),
  requestedTitle: z.string().min(1).max(200),
  autoSuggest: z.boolean().optional().default(false),
});

const successResponseSchema = z.object({
  valid: z.literal(true),
  subtopic: subtopicSchema,
});

const invalidResponseSchema = z.object({
  valid: z.literal(false),
  reason: z.string().min(1),
  suggestion: z.string().optional(),
  suggestions: z.array(z.string()).optional(),
});

const responseSchema = z.union([successResponseSchema, invalidResponseSchema]);

const FEATHERLESS_TIMEOUT_MS = 45_000;
const MAX_FEATHERLESS_TOKENS = 3072;

function scopeGuidance(scope: string): string {
  if (scope === "Quick") return "Keep the new section concise and focused on essential knowledge.";
  if (scope === "Comprehensive") return "Develop the new section thoroughly, including important nuances, connections, and examples.";
  return "Give the new section balanced depth with its major ideas and practical connections.";
}

function buildSystemMessage(scope: string, isRoot: boolean, autoSuggest: boolean): string {
  return `You are a strict, helpful tutor. ${scopeGuidance(scope)} A student wants to ${
    isRoot
      ? "extend the lesson plan by adding a new top-level (root) subtopic to the overall subject."
      : "drill deeper into a parent subtopic by adding a nested subtopic."
  } ${
    autoSuggest
      ? "The student wants you to choose the next topic. Propose one meaningful root subtopic that is not already covered."
      : "The student has supplied the subtopic title."
  } Your job has two steps:

1. ${autoSuggest ? "Choose and validate a title that" : "Validate whether the requested title"} is a coherent, distinct, and appropriately scoped subtopic. Reject titles that are identical to the ${
    isRoot ? "overall subject" : "parent"
  }, already-covered siblings, off-topic, too broad, or not meaningfully distinct.
2. If valid, generate a complete, well-structured subtopic in the same style as the existing ones. Do not include a parent reference; the client attaches generated nested subtopics to their parent.

Return ONLY valid JSON with no markdown formatting, no code fences, and no commentary outside the JSON object.`;
}

function buildUserContent(
  topic: string,
  scope: string,
  parentSubtopic: Record<string, unknown> | undefined,
  siblingTitles: string[],
  requestedTitle: string,
  subjectSummary?: string,
  autoSuggest = false
): string {
  const contextLines = [
    `Overall topic: ${topic}`,
    `Requested scope: ${scope}`,
  ];

  if (subjectSummary) {
    contextLines.push(`Subject summary:\n${subjectSummary}`);
  }

  if (parentSubtopic) {
    contextLines.push(`Parent subtopic:\n${JSON.stringify(parentSubtopic, null, 2)}`);
  }

  contextLines.push(
    `Existing sibling subtopics:\n${siblingTitles.map((t) => `- ${t}`).join("\n") || "(none yet)"}`,
    autoSuggest
      ? "Requested action: Choose one new top-level subtopic that explores a useful deeper or broader area not covered by the existing root subtopics."
      : `Requested subtopic title: "${requestedTitle}"`
  );

  contextLines.push(`
First decide validity. If the request is invalid, return JSON exactly like:
{ "valid": false, "reason": "short reason", "suggestions": ["one or more concise, distinct title options"] }

When multiple narrower directions would work, return each one as a separate item in suggestions. Never combine alternatives into a single title using "or".

If valid, return JSON exactly like:
{
  "valid": true,
  "subtopic": {
    "title": "string (${autoSuggest ? "choose a distinct title not present in the existing sibling list" : "use or slightly refine the requested title"})",
    "summary": "string (explain this subtopic with breadth appropriate for ${scope} scope, including useful examples or analogies)",
    "keyTakeaways": ["string"],
    "objectives": ["string"],
    "keyConcepts": [
      { "concept": "string", "details": ["string"] }
    ],
    "quiz": {
      "questions": [
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correctIndex": 0,
          "explanation": "string"
        }
      ]
    }
  }
}

The quiz must contain 3 to 5 multiple-choice questions, each with exactly 4 options, one correctIndex (0-3), and a clear explanation.`);

  return contextLines.join("\n\n");
}

function parseContent(rawContent: string): unknown {
  try {
    return JSON.parse(rawContent);
  } catch {
    const cleaned = rawContent
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    return JSON.parse(cleaned);
  }
}

async function callFeatherless(
  apiKey: string,
  model: string,
  system: string,
  userContent: string
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FEATHERLESS_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.featherless.ai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        temperature: 0.5,
        max_tokens: MAX_FEATHERLESS_TOKENS,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Featherless API error ${response.status}: ${text}`);
    }

    return response.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Featherless API timed out while adding the subtopic. Try a faster model or a narrower request.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("FEATHERLESS_API_KEY");
    if (!apiKey) {
      throw new Error("FEATHERLESS_API_KEY is not configured.");
    }

    const rawBody = await req.json();
    const parsed = requestSchema.parse(rawBody);
    const { topic, scope, model, parentSubtopic, subjectSummary, siblingTitles, requestedTitle, autoSuggest } = parsed;
    const isRoot = parentSubtopic === undefined;

    // Fast, deterministic duplicate/coherence guard before paying for an LLM call.
    const normalizedRequest = requestedTitle.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const normalizedSiblings = siblingTitles.map((t) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());
    const normalizedParent = parentSubtopic
      ? parentSubtopic.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
      : topic.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

    if (
      !autoSuggest &&
      (normalizedRequest === normalizedParent ||
        (normalizedParent.length > 4 && normalizedRequest.includes(normalizedParent)))
    ) {
      return new Response(
        JSON.stringify({
          valid: false,
          reason: isRoot
            ? "That title is the same as the overall subject. Try a distinct top-level subtopic."
            : "That title is the same as the parent subtopic. Try a more specific area within it.",
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const duplicateSibling = autoSuggest
      ? undefined
      : normalizedSiblings.find(
          (s) => s === normalizedRequest || s.includes(normalizedRequest) || normalizedRequest.includes(s)
        );
    if (duplicateSibling) {
      return new Response(
        JSON.stringify({
          valid: false,
          reason: isRoot
            ? "A root subtopic like that already exists."
            : "A subtopic like that already exists under this parent.",
          suggestion: siblingTitles.find(
            (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === duplicateSibling
          ),
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const system = buildSystemMessage(scope, isRoot, autoSuggest);
    const userContent = buildUserContent(
      topic,
      scope,
      parentSubtopic as Record<string, unknown> | undefined,
      siblingTitles,
      requestedTitle,
      subjectSummary,
      autoSuggest
    );

    const json = await callFeatherless(apiKey, model, system, userContent);
    const rawContent = json?.choices?.[0]?.message?.content;
    if (!rawContent || typeof rawContent !== "string") {
      throw new Error("Invalid response from Featherless AI.");
    }

    const contentData = parseContent(rawContent);
    const response = responseSchema.parse(contentData);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong adding the subtopic — try again.";
    console.error("studyforge-add-subtopic error:", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
