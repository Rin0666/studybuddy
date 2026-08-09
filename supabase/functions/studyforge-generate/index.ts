import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from "npm:zod@3.23.8";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const scopeSchema = z.enum(["Quick", "Standard", "Comprehensive"]);
type Scope = z.infer<typeof scopeSchema>;

const SCOPE_CONFIG: Record<Scope, { minimum: number; guidance: string; maxTokens: number }> = {
  Quick: {
    minimum: 3,
    guidance: "Prioritize the smallest useful set of essential sections. Usually 3-4 root subtopics is appropriate.",
    maxTokens: 4096,
  },
  Standard: {
    minimum: 5,
    guidance: "Cover every major area needed for a balanced understanding. Use as many distinct root subtopics as the subject genuinely needs; 5-8 is common, but it is not a maximum.",
    maxTokens: 8192,
  },
  Comprehensive: {
    minimum: 7,
    guidance: "Create a full curriculum map. Include every important, non-overlapping area needed to learn the subject well, with no fixed maximum. Stop only when another section would be optional, overly specialized, or repetitive.",
    maxTokens: 12288,
  },
};

const questionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
});

const quizSchema = z.object({
  questions: z.array(questionSchema).length(3),
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

const studySetSchema = z.object({
  topic: z.string().min(1),
  scope: scopeSchema,
  summary: z.string().min(1),
  keyTakeaways: z.array(z.string()),
  subtopics: z.array(subtopicSchema).min(3),
}).superRefine((data, ctx) => {
  const minimum = SCOPE_CONFIG[data.scope].minimum;
  if (data.subtopics.length < minimum) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["subtopics"],
      message: `${data.scope} scope requires at least ${minimum} root subtopics`,
    });
  }
});

const generateRequestSchema = z.object({
  topic: z.string().min(1).max(200),
  scope: scopeSchema,
  model: z.enum([
    "Qwen/Qwen2.5-7B-Instruct",
    "Qwen/Qwen3-32B",
    "meta-llama/Meta-Llama-3.1-70B-Instruct",
  ]),
});

function buildSchemaString(topic: string, scope: Scope): string {
  const config = SCOPE_CONFIG[scope];
  const overviewDepth = scope === "Quick"
    ? "1-2 concise paragraphs covering the essential picture"
    : scope === "Comprehensive"
      ? "3-5 substantial paragraphs connecting all major areas, applications, and limitations"
      : "2-3 paragraphs covering the major areas and how they connect";
  const sectionDepth = scope === "Quick"
    ? "1 concise paragraph focused on essential knowledge"
    : scope === "Comprehensive"
      ? "2-4 substantive paragraphs with connections, nuances, and examples"
      : "2-3 paragraphs with the major ideas, connections, and examples";
  return `Return only valid JSON matching the following schema for the topic "${topic}" with ${scope} scope.

${config.guidance}

Together, the subtopics must form a coherent learning path and cover the requested breadth rather than isolated facts. Include, where relevant: foundations and terminology, core principles or mechanisms, major components and their relationships, practical applications and examples, common misconceptions or limitations, and advanced or emerging directions. Adapt these categories naturally to the subject, avoid overlap, and do not create filler sections merely to increase the count.

For every subtopic, provide a substantive summary, key takeaways, learning objectives, key concepts with supporting details, and a short quiz.

{
  "topic": "string",
  "scope": "${scope}",
  "summary": "string (${overviewDepth})",
  "keyTakeaways": ["string (include the most important takeaways across the selected scope)"],
  "subtopics": [
    {
      "title": "string (subtopic heading)",
      "summary": "string (${sectionDepth})",
      "keyTakeaways": ["string (include the takeaways needed for this section)"],
      "objectives": ["string (include measurable learning objectives appropriate to the scope)"],
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
  ]
}

Each subtopic quiz must contain exactly 3 multiple-choice questions. Each question must have exactly 4 options, one correctIndex (0-3), and a brief explanation. There is no maximum number of root subtopics; choose the count based on what is genuinely important for the selected scope. Before answering, plan the full coverage silently and make sure the sections do not overlap.`;
}

function buildSystemMessage(scope: Scope): string {
  return `You are a curriculum designer creating study materials with ${scope.toLowerCase()} breadth. ${SCOPE_CONFIG[scope].guidance} Build a logically ordered overview of non-overlapping root subtopics, not disconnected facts. Use clear language, define specialized terms, connect ideas across sections, and include real-world analogies or examples. Return ONLY valid JSON with no markdown formatting, no code fences, and no commentary outside the JSON object. CRITICAL: every subtopic must have exactly 3 multiple-choice questions, each with exactly 4 options, one correctIndex, and a clear explanation.`;
}

function buildRetryMessage(attempt: number, issue: string): string {
  if (attempt <= 0) return "";
  return `Retry ${attempt}/2: the previous response had a validation issue (${issue}). Please fix it and return strictly valid JSON matching the schema.`;
}

const FEATHERLESS_TIMEOUT_MS = 65_000; // Two attempts remain under the Edge Function limit
const MAX_ATTEMPTS = 2;

async function callFeatherless(
  apiKey: string,
  model: string,
  system: string,
  userContent: string,
  maxTokens: number
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
        temperature: 0.6,
        max_tokens: maxTokens,
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
      throw new Error("Featherless API timed out while generating the study plan. Try a faster model or a narrower topic.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
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

function summarizeIssues(error: z.ZodError): string {
  return error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
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
    const parsed = generateRequestSchema.parse(rawBody);
    const { topic, scope, model } = parsed;

    const system = buildSystemMessage(scope);
    const baseUserContent = [
      `Topic: ${topic}`,
      `Scope: ${scope}`,
      buildSchemaString(topic, scope),
    ].join("\n\n");

    let lastValidationError: z.ZodError | null = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const issue = lastValidationError ? summarizeIssues(lastValidationError) : "";
      const userContent = [baseUserContent, buildRetryMessage(attempt, issue)]
        .filter(Boolean)
        .join("\n\n");

      const json = await callFeatherless(apiKey, model, system, userContent, SCOPE_CONFIG[scope].maxTokens);
      const rawContent = json?.choices?.[0]?.message?.content;
      if (!rawContent || typeof rawContent !== "string") {
        throw new Error("Invalid response from Featherless AI.");
      }

      const contentData = parseContent(rawContent);
      const parseResult = studySetSchema.safeParse(contentData);

      if (parseResult.success) {
        return new Response(JSON.stringify(parseResult.data), {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      lastValidationError = parseResult.error;
      console.warn(`studyforge-generate validation attempt ${attempt + 1} failed:`, parseResult.error.issues);
    }

    throw lastValidationError ?? new Error("Failed to generate a valid study set after multiple attempts.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong generating your lesson — try again.";
    console.error("studyforge-generate error:", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
