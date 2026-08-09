import { useState, useCallback, useEffect, useRef } from "react";
import { z } from "zod";
import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  subtopicAddResponseSchema,
  subtopicSchema,
  type StudySet,
  type Model,
  type Subtopic,
  type AddSubtopicStatus,
} from "@/types";
import supabase from "@/lib/supabase";

export interface UseSubtopicTree {
  subtopics: Subtopic[];
  addSubtopic: (parentIndex: number, requestedTitle: string) => Promise<boolean>;
  statusByParent: Record<number, AddSubtopicStatus>;
  errorByParent: Record<number, { message: string; suggestion?: string } | null>;
}

export function useSubtopicTree(data: StudySet, model: Model): UseSubtopicTree {
  const [subtopics, setSubtopics] = useState<Subtopic[]>(data.subtopics);
  const [statusByParent, setStatusByParent] = useState<Record<number, AddSubtopicStatus>>({});
  const [errorByParent, setErrorByParent] = useState<Record<number, { message: string; suggestion?: string } | null>>({});

  const keyRef = useRef(`${data.topic}:${data.difficulty}`);
  const currentKey = `${data.topic}:${data.difficulty}`;

  useEffect(() => {
    if (keyRef.current !== currentKey) {
      keyRef.current = currentKey;
      setSubtopics(data.subtopics);
      setStatusByParent({});
      setErrorByParent({});
    }
  }, [currentKey, data.subtopics]);

  const addSubtopic = useCallback(
    async (parentIndex: number, requestedTitle: string): Promise<boolean> => {
      setStatusByParent((prev) => ({ ...prev, [parentIndex]: "loading" }));
      setErrorByParent((prev) => ({ ...prev, [parentIndex]: null }));

      try {
        const parentSubtopic = subtopicSchema.omit({ parentIndex: true }).parse(subtopics[parentIndex]);
        const siblingTitles = subtopics
          .filter((s) => s.parentIndex === parentIndex)
          .map((s) => s.title);

        const { data: rawData, error: fnError } = await supabase.functions.invoke("studyforge-add-subtopic", {
          body: {
            topic: data.topic,
            difficulty: data.difficulty,
            model,
            parentSubtopic,
            siblingTitles,
            requestedTitle: requestedTitle.trim(),
          },
        });

        if (fnError) throw fnError;
        if (!rawData) throw new Error("No response from subtopic generator.");

        const response = subtopicAddResponseSchema.parse(rawData);

        if (!response.valid) {
          const message = response.reason ?? "That subtopic doesn't fit here — try something more specific.";
          setErrorByParent((prev) => ({
            ...prev,
            [parentIndex]: { message, suggestion: response.suggestion },
          }));
          setStatusByParent((prev) => ({ ...prev, [parentIndex]: "error" }));
          return false;
        }

        setSubtopics((prev) => [
          ...prev,
          {
            ...response.subtopic,
            parentIndex,
          },
        ]);
        setStatusByParent((prev) => ({ ...prev, [parentIndex]: "success" }));
        setTimeout(() => {
          setStatusByParent((prev) => ({
            ...prev,
            [parentIndex]: prev[parentIndex] === "success" ? "idle" : prev[parentIndex],
          }));
        }, 2000);
        return true;
      } catch (err) {
        let message = "Something went wrong adding that subtopic — try again.";
        let suggestion: string | undefined;

        if (err instanceof FunctionsHttpError) {
          try {
            const errData = await err.context.json();
            message = errData?.error ?? err.message;
          } catch {
            message = err.message;
          }
        } else if (err instanceof z.ZodError) {
          message = "The response didn't match the expected format. Please try again.";
        } else if (err instanceof Error) {
          message = err.message;
        }

        setErrorByParent((prev) => ({ ...prev, [parentIndex]: { message, suggestion } }));
        setStatusByParent((prev) => ({ ...prev, [parentIndex]: "error" }));
        return false;
      }
    },
    [data.difficulty, data.topic, model, subtopics]
  );

  return {
    subtopics,
    addSubtopic,
    statusByParent,
    errorByParent,
  };
}
