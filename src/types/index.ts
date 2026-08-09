import { z } from "zod";

export const scopeSchema = z.enum(["Quick", "Standard", "Comprehensive"]);
export type Scope = z.infer<typeof scopeSchema>;

export const modelSchema = z.enum([
  "Qwen/Qwen2.5-7B-Instruct",
  "Qwen/Qwen3-32B",
  "meta-llama/Meta-Llama-3.1-70B-Instruct",
]);
export type Model = z.infer<typeof modelSchema>;

export const questionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
});
export type Question = z.infer<typeof questionSchema>;

export const quizSchema = z.object({
  questions: z.array(questionSchema).min(3).max(5),
});
export type Quiz = z.infer<typeof quizSchema>;

export const subtopicSchema = z.object({
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
  parentIndex: z.number().int().min(0).optional(),
});
export type Subtopic = z.infer<typeof subtopicSchema>;

export const studySetSchema = z.object({
  topic: z.string(),
  scope: scopeSchema,
  summary: z.string().min(1),
  keyTakeaways: z.array(z.string()),
  // No maximum: scope and topic complexity determine the useful coverage.
  subtopics: z.array(subtopicSchema).min(2),
});
export type StudySet = z.infer<typeof studySetSchema>;

const stringArraySchema = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Fall back to treating newline- or semicolon-delimited text as a list.
  }

  return trimmed
    .split(/\r?\n|;\s*/)
    .map((item) => item.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean);
}, z.array(z.string()));

export const deepDiveSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  examples: stringArraySchema,
  analogies: stringArraySchema,
  relatedConcepts: stringArraySchema,
  followUpQuestions: stringArraySchema,
});
export type DeepDiveResponse = z.infer<typeof deepDiveSchema>;

export type GeneratorStatus = "idle" | "loading" | "success" | "error";
export type DiveStatus = "idle" | "loading" | "success" | "error";
export type AddSubtopicStatus = "idle" | "loading" | "success" | "error";

export interface SubtopicAddError {
  message: string;
  suggestion?: string;
  suggestions?: string[];
}

export interface GenerateRequest {
  topic: string;
  scope: Scope;
  model: Model;
}

export interface DiveRequest {
  topic: string;
  context: string;
  target: string;
  focus: "overview" | "key-concept" | "subtopic";
  scope: Scope;
  model: Model;
}

export interface RootSubtopicRequest {
  topic: string;
  scope: Scope;
  model: Model;
  existingRootTitles: string[];
  requestedTitle: string;
}

export const subtopicAddRequestSchema = z.object({
  topic: z.string().min(1),
  scope: scopeSchema,
  model: modelSchema,
  parentSubtopic: subtopicSchema.omit({ parentIndex: true }).optional(),
  subjectSummary: z.string().optional(),
  siblingTitles: z.array(z.string()),
  requestedTitle: z.string().min(1).max(200),
  autoSuggest: z.boolean().optional(),
});
export type SubtopicAddRequest = z.infer<typeof subtopicAddRequestSchema>;

export const subtopicAddResponseSchema = z.union([
  z.object({
    valid: z.literal(true),
    subtopic: subtopicSchema.omit({ parentIndex: true }),
  }),
  z.object({
    valid: z.literal(false),
    reason: z.string().min(1),
    suggestion: z.string().optional(),
    suggestions: z.array(z.string()).optional(),
  }),
]);
export type SubtopicAddResponse = z.infer<typeof subtopicAddResponseSchema>;
