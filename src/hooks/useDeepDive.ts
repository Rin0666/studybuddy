import { useState, useCallback } from "react";
import { z } from "zod";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { deepDiveSchema, type DeepDiveResponse, type DiveStatus, type Difficulty, type Model } from "@/types";
import supabase from "@/lib/supabase";

export interface UseDeepDive {
  status: DiveStatus;
  error: string | null;
  data: DeepDiveResponse | null;
  dive: (request: {
    topic: string;
    context: string;
    target: string;
    focus: "overview" | "key-concept" | "subtopic";
    difficulty: Difficulty;
    model: Model;
  }) => Promise<void>;
  reset: () => void;
}

export function useDeepDive(): UseDeepDive {
  const [status, setStatus] = useState<DiveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DeepDiveResponse | null>(null);

  const dive = useCallback(async (request: {
    topic: string;
    context: string;
    target: string;
    focus: "overview" | "key-concept" | "subtopic";
    difficulty: Difficulty;
    model: Model;
  }) => {
    setStatus("loading");
    setError(null);

    try {
      const { data: rawData, error: fnError } = await supabase.functions.invoke("studyforge-dive", {
        body: request,
      });

      if (fnError) throw fnError;
      if (!rawData) throw new Error("No response from deep dive generator.");

      const parsed = deepDiveSchema.parse(rawData);
      setData(parsed);
      setStatus("success");
    } catch (err) {
      let message = "Something went wrong generating the deep dive — try again.";

      if (err instanceof FunctionsHttpError) {
        try {
          const data = await err.context.json();
          message = data?.error ?? err.message;
        } catch {
          message = err.message;
        }
      } else if (err instanceof z.ZodError) {
        message = "The deep dive didn't match the expected format. Please try again.";
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
    dive,
    reset,
  };
}
