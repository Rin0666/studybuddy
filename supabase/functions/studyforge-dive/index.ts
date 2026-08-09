import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from "npm:zod@3.23.8";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const diveRequestSchema = z.object({
  topic: z.string().min(1).max(200),
  context: z.string().min(1).max(2000),
  target: z.string().min(1).max(200),
  focus: z.enum(["overview", "key-concept", "subtopic"]),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]),
  model: z.enum([
    "Qwen/Qwen2.5-7B-Instruct",
    "Qwen/Qwen3-32B",
    "meta-llama/Meta-Llama-3.1-70B-Instruct",
  ]),
});

const deepDiveSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  examples: z.array(z.string()),
  analogies: z.array(z.string()),
  relatedConcepts: z.array(z.string()),
  followUpQuestions: z.array(z.string()),
});

function buildSystemMessage(difficulty: string): string {
  return `You are a helpful tutor creating an expanded deep-dive explanation for a ${difficulty.toLowerCase()}-level learner. Given a topic, surrounding context, and a specific focus, produce a richer explanation with concrete examples, analogies, related concepts, and follow-up questions. Return ONLY valid JSON with no markdown formatting, no code fences, and no commentary outside the JSON object.`;
}

function buildUserContent(topic: string, context: string, target: string, focus: string): string {
  return `Topic: ${topic}

Context: ${context}

Dive deeper into: "${target}" (${focus})

Return only valid JSON matching this schema:

{
  "title": "string (clear title for this deep dive)",
  "content": "string (2-4 paragraphs thoroughly explaining the target in depth, using language suitable for the difficulty level)",
  "examples": ["string (concrete, real-world examples)"],
  "analogies": ["string (helpful analogies that make the concept click)"],
  "relatedConcepts": ["string (related ideas the learner should explore next)"],
  "followUpQuestions": ["string (2-4 thought-provoking questions to test understanding)"]
}`;
}

const FEATHERLESS_TIMEOUT_MS = 45_000;
const MAX_FEATHERLESS_TOKENS = 2048;
const MAX_ATTEMPTS = 2;

async function callFeatherless(
  apiKey: string,
  model: string,
  difficulty: string,
  topic: string,
  context: string,
  target: string,
  focus: string
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
          { role: "system", content: buildSystemMessage(difficulty) },
          { role: "user", content: buildUserContent(topic, context, target, focus) },
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
      throw new Error("Deep dive generation timed out. Try a faster model or a narrower focus.");
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
    const parsed = diveRequestSchema.parse(rawBody);
    const { topic, context, target, focus, difficulty, model } = parsed;

    let lastValidationError: z.ZodError | null = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const json = await callFeatherless(apiKey, model, difficulty, topic, context, target, focus);
      const rawContent = json?.choices?.[0]?.message?.content;
      if (!rawContent || typeof rawContent !== "string") {
        throw new Error("Invalid response from Featherless AI.");
      }

      const contentData = parseContent(rawContent);
      const parseResult = deepDiveSchema.safeParse(contentData);

      if (parseResult.success) {
        return new Response(JSON.stringify(parseResult.data), {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      lastValidationError = parseResult.error;
      console.warn(`studyforge-dive validation attempt ${attempt + 1} failed:`, parseResult.error.issues);
    }

    throw lastValidationError ?? new Error("Failed to generate a valid deep dive after multiple attempts.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong generating the deep dive — try again.";
    console.error("studyforge-dive error:", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
