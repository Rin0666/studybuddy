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

const studySetSchema = z.object({
  topic: z.string().min(1),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]),
  summary: z.string().min(1),
  keyTakeaways: z.array(z.string()),
  subtopics: z.array(subtopicSchema).min(2).max(6),
});

const generateRequestSchema = z.object({
  topic: z.string().min(1).max(200),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]),
  model: z.enum([
    "Qwen/Qwen2.5-7B-Instruct",
    "Qwen/Qwen3-32B",
    "meta-llama/Meta-Llama-3.1-70B-Instruct",
  ]),
});

function buildSchemaString(topic: string, difficulty: string): string {
  return `Return only valid JSON matching the following schema for the topic "${topic}" at ${difficulty} level.

The response should give an in-depth breakdown of the topic into 2 to 6 focused subtopics. For each subtopic, provide a concise summary, key takeaways, learning objectives, key concepts with supporting details, and a short quiz.

{
  "topic": "string",
  "difficulty": "string",
  "summary": "string (2-3 short paragraphs overviewing the whole topic with real-world examples or analogies)",
  "keyTakeaways": ["string"],
  "subtopics": [
    {
      "title": "string (subtopic heading)",
      "summary": "string (2-3 paragraphs explaining this subtopic in depth)",
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
  ]
}

Each subtopic quiz must contain 3 to 5 multiple-choice questions. Each question must have exactly 4 options, one correctIndex (0-3), and a brief explanation. Include between 2 and 6 subtopics total.`;
}

function buildSystemMessage(difficulty: string): string {
  return `You are a helpful tutor creating in-depth study materials for a ${difficulty.toLowerCase()}-level learner. Break the topic into focused subtopics and explore each one thoroughly. Use plain language appropriate to the level, define any specialized terms, and include real-world analogies or examples. Return ONLY valid JSON with no markdown formatting, no code fences, and no commentary outside the JSON object. CRITICAL: every subtopic must have 3-5 multiple-choice questions, each with exactly 4 options, one correctIndex, and a clear explanation.`;
}

function buildRetryMessage(attempt: number, issue: string): string {
  if (attempt <= 0) return "";
  return `Retry ${attempt}/2: the previous response had a validation issue (${issue}). Please fix it and return strictly valid JSON matching the schema.`;
}

const FEATHERLESS_TIMEOUT_MS = 45_000; // Keep well under Edge Function 150s limit
const MAX_FEATHERLESS_TOKENS = 4096; // Lower = faster, less timeout risk
const MAX_ATTEMPTS = 2;

async function callFeatherless(
  apiKey: string,
  model: string,
  difficulty: string,
  topic: string,
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
        temperature: 0.6,
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
    const { topic, difficulty, model } = parsed;

    const system = buildSystemMessage(difficulty);
    const baseUserContent = [
      `Topic: ${topic}`,
      `Difficulty: ${difficulty}`,
      buildSchemaString(topic, difficulty),
    ].join("\n\n");

    let lastValidationError: z.ZodError | null = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const issue = lastValidationError ? summarizeIssues(lastValidationError) : "";
      const userContent = [baseUserContent, buildRetryMessage(attempt, issue)]
        .filter(Boolean)
        .join("\n\n");

      const json = await callFeatherless(apiKey, model, difficulty, topic, system, userContent);
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
