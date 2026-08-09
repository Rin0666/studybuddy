import { useState, useCallback } from "react";
import { z } from "zod";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { deepDiveSchema, type DeepDiveResponse, type DiveStatus, type Scope, type Model } from "@/types";
import supabase from "@/lib/supabase";
import { withDeepDiveArrayFormat } from "@/lib/deepDiveFormat";

export interface UseDeepDive {
  status: DiveStatus;
  error: string | null;
  data: DeepDiveResponse | null;
  dive: (request: {
    topic: string;
    context: string;
    target: string;
    focus: "overview" | "key-concept" | "subtopic";
    scope: Scope;
    model: Model;
  }) => Promise<void>;
  reset: () => void;
}

async function readFunctionError(error: FunctionsHttpError): Promise<string> {
  try {
    const errorData = await error.context.json();
    return errorData?.error ?? error.message;
  } catch {
    return error.message;
  }
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
    scope: Scope;
    model: Model;
  }) => {
    setStatus("loading");
    setError(null);

    try {
      const body = {
        ...request,
        context: withDeepDiveArrayFormat(request.context),
        difficulty: "Intermediate",
      };

      let result = await supabase.functions.invoke("studyforge-dive", {
        body,
      });

      if (result.error) {
        const firstMessage = await readFunctionError(result.error);
        const isLegacyArrayFormatError =
          firstMessage.includes('"expected": "array"') ||
          firstMessage.toLowerCase().includes("expected array");

        if (!isLegacyArrayFormatError) throw new Error(firstMessage);

        // The older hosted validator rejects malformed model output before the
        // browser can normalize it. A fresh generation usually corrects the
        // stochastic formatting mistake.
        result = await supabase.functions.invoke("studyforge-dive", {
          body: {
            ...body,
            target: `${request.target} (strict JSON arrays required)`.slice(0, 200),
          },
        });

        if (result.error) throw new Error(await readFunctionError(result.error));
      }

      const { data: rawData } = result;
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
