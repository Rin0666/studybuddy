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
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]),
  model: z.enum([
    "Qwen/Qwen2.5-7B-Instruct",
    "Qwen/Qwen3-32B",
    "meta-llama/Meta-Llama-3.1-70B-Instruct",
  ]),
  parentSubtopic: subtopicSchema.optional(),
  subjectSummary: z.string().optional(),
  siblingTitles: z.array(z.string()),
  requestedTitle: z.string().min(1).max(200),
});

const successResponseSchema = z.object({
  valid: z.literal(true),
  subtopic: subtopicSchema,
});

const invalidResponseSchema = z.object({
  valid: z.literal(false),
  reason: z.string().min(1),
  suggestion: z.string().optional(),
});

const responseSchema = z.union([successResponseSchema, invalidResponseSchema]);

const FEATHERLESS_TIMEOUT_MS = 45_000;
const MAX_FEATHERLESS_TOKENS = 3072;

function buildSystemMessage(difficulty: string, isRoot: boolean): string {
  return `You are a strict, helpful tutor for a ${difficulty.toLowerCase()}-level learner. A student wants to ${
    isRoot
      ? "extend the lesson plan by adding a new top-level (root) subtopic to the overall subject."
      : "drill deeper into a parent subtopic by adding a nested subtopic."
  } Your job has two steps:

1. Validate whether the requested title is a coherent, distinct, and appropriately scoped subtopic. Reject titles that are identical to the ${
    isRoot ? "overall subject" : "parent"
  }, already-covered siblings, off-topic, too broad, or not meaningfully distinct.
2. If valid, generate a complete, well-structured subtopic in the same style as the existing ones. The subtopic must be a full-root item with no parent reference.

Return ONLY valid JSON with no markdown formatting, no code fences, and no commentary outside the JSON object.`;
}

function buildUserContent(
  topic: string,
  difficulty: string,
  parentSubtopic: Record<string, unknown> | undefined,
  siblingTitles: string[],
  requestedTitle: string,
  subjectSummary?: string
): string {
  const contextLines = [
    `Overall topic: ${topic}`,
    `Difficulty level: ${difficulty}`,
  ];

  if (subjectSummary) {
    contextLines.push(`Subject summary:\n${subjectSummary}`);
  }

  if (parentSubtopic) {
    contextLines.push(`Parent subtopic:\n${JSON.stringify(parentSubtopic, null, 2)}`);
  }

  contextLines.push(
    `Existing sibling subtopics:\n${siblingTitles.map((t) => `- ${t}`).join("\n") || "(none yet)"}`,
    `Requested subtopic title: "${requestedTitle}"`
  );

  contextLines.push(`
First decide validity. If the request is invalid, return JSON exactly like:
{ "valid": false, "reason": "short reason", "suggestion": "optional better title if applicable" }

If valid, return JSON exactly like:
{
  "valid": true,
  "subtopic": {
    "title": "string (use or slightly refine the requested title)",
    "summary": "string (2-3 paragraphs explaining this subtopic in depth, with examples or analogies at the ${difficulty} level)",
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
    const { topic, difficulty, model, parentSubtopic, subjectSummary, siblingTitles, requestedTitle } = parsed;
    const isRoot = parentSubtopic === undefined;

    // Fast, deterministic duplicate/coherence guard before paying for an LLM call.
    const normalizedRequest = requestedTitle.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const normalizedSiblings = siblingTitles.map((t) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());
    const normalizedParent = parentSubtopic
      ? parentSubtopic.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
      : topic.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

    if (
      normalizedRequest === normalizedParent ||
      (normalizedParent.length > 4 && normalizedRequest.includes(normalizedParent))
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

    const duplicateSibling = normalizedSiblings.find(
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

    const system = buildSystemMessage(difficulty, isRoot);
    const userContent = buildUserContent(topic, difficulty, parentSubtopic as Record<string, unknown> | undefined, siblingTitles, requestedTitle, subjectSummary);

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
