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

export type GeneratorStatus = "idle" | "loading" | "success" | "error";

export interface GenerateRequest {
  topic: string;
  difficulty: Difficulty;
  model: Model;
}
