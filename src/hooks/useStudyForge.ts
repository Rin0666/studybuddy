import { useState, useCallback } from "react";
import { z } from "zod";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { studySetSchema, type GenerateRequest, type GeneratorStatus, type StudySet } from "@/types";
import supabase from "@/lib/supabase";

export interface UseStudyForge {
  status: GeneratorStatus;
  error: string | null;
  data: StudySet | null;
  generate: (request: GenerateRequest) => Promise<void>;
  reset: () => void;
}

export function useStudyForge(): UseStudyForge {
  const [status, setStatus] = useState<GeneratorStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StudySet | null>(null);

  const generate = useCallback(async (request: GenerateRequest) => {
    setStatus("loading");
    setError(null);

    try {
      const { data: rawData, error: fnError } = await supabase.functions.invoke("studyforge-generate", {
        body: request,
      });

      if (fnError) throw fnError;
      if (!rawData) throw new Error("No response from study generator.");

      const parsed = studySetSchema.parse(rawData);
      setData(parsed);
      setStatus("success");
    } catch (err) {
      let message = "Something went wrong generating your lesson — try again.";

      if (err instanceof FunctionsHttpError) {
        try {
          const data = await err.context.response.json();
          message = data?.error ?? err.message;
        } catch {
          message = err.message;
        }
      } else if (err instanceof z.ZodError) {
        message = "The study plan didn't match the expected format. Please try again.";
      } else if (err instanceof Error) {
        message = err.message;
      }

      setError(message);
      setStatus("error");
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setData(null);
  }, []);

  return {
    status,
    error,
    data,
    generate,
    reset,
  };
}
