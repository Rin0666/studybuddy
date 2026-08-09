import { z } from "zod";

export const difficultySchema = z.enum(["Beginner", "Intermediate", "Advanced"]);
export type Difficulty = z.infer<typeof difficultySchema>;

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
});
export type Subtopic = z.infer<typeof subtopicSchema>;

export const studySetSchema = z.object({
  topic: z.string(),
  difficulty: difficultySchema,
  summary: z.string().min(1),
  keyTakeaways: z.array(z.string()),
  subtopics: z.array(subtopicSchema).min(2).max(6),
});
export type StudySet = z.infer<typeof studySetSchema>;

export const deepDiveSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  examples: z.array(z.string()),
  analogies: z.array(z.string()),
  relatedConcepts: z.array(z.string()),
  followUpQuestions: z.array(z.string()),
});
export type DeepDiveResponse = z.infer<typeof deepDiveSchema>;

export type GeneratorStatus = "idle" | "loading" | "success" | "error";
export type DiveStatus = "idle" | "loading" | "success" | "error";

export interface GenerateRequest {
  topic: string;
  difficulty: Difficulty;
  model: Model;
}

export interface DiveRequest {
  topic: string;
  context: string;
  target: string;
  focus: "overview" | "key-concept" | "subtopic";
  difficulty: Difficulty;
  model: Model;
}
