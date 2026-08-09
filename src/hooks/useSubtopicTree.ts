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
  addRootSubtopic: (requestedTitle: string) => Promise<boolean>;
  addRootDeepDiveSubtopic: () => Promise<boolean>;
  statusByParent: Record<number | "root" | "root-dive", AddSubtopicStatus>;
  errorByParent: Record<number | "root" | "root-dive", { message: string; suggestion?: string } | null>;
}

export function useSubtopicTree(data: StudySet, model: Model): UseSubtopicTree {
  const [subtopics, setSubtopics] = useState<Subtopic[]>(data.subtopics);
  const [statusByParent, setStatusByParent] = useState<Record<number | "root" | "root-dive", AddSubtopicStatus>>({});
  const [errorByParent, setErrorByParent] = useState<Record<number | "root" | "root-dive", { message: string; suggestion?: string } | null>>({});

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

  type AddSubtopicPayload = {
    topic: string;
    difficulty: StudySet["difficulty"];
    model: Model;
    subjectSummary?: string;
    parentSubtopic?: Omit<Subtopic, "parentIndex">;
    siblingTitles: string[];
    requestedTitle: string;
  };

  const invokeAddSubtopic = useCallback(
    async (
      statusKey: number | "root" | "root-dive",
      payload: AddSubtopicPayload
    ): Promise<boolean> => {
      setStatusByParent((prev) => ({ ...prev, [statusKey]: "loading" }));
      setErrorByParent((prev) => ({ ...prev, [statusKey]: null }));

      try {
        const { data: rawData, error: fnError } = await supabase.functions.invoke("studyforge-add-subtopic", {
          body: payload,
        });

        if (fnError) throw fnError;
        if (!rawData) throw new Error("No response from subtopic generator.");

        const response = subtopicAddResponseSchema.parse(rawData);

        if (!response.valid) {
          const message = response.reason ?? "That subtopic doesn't fit here — try something more specific.";
          setErrorByParent((prev) => ({
            ...prev,
            [statusKey]: { message, suggestion: response.suggestion },
          }));
          setStatusByParent((prev) => ({ ...prev, [statusKey]: "error" }));
          return false;
        }

        setSubtopics((prev) => [
          ...prev,
          {
            ...response.subtopic,
            parentIndex: payload.parentSubtopic ? undefined : undefined,
          },
        ]);
        setStatusByParent((prev) => ({ ...prev, [statusKey]: "success" }));
        setTimeout(() => {
          setStatusByParent((prev) => ({
            ...prev,
            [statusKey]: prev[statusKey] === "success" ? "idle" : prev[statusKey],
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

        setErrorByParent((prev) => ({ ...prev, [statusKey]: { message, suggestion } }));
        setStatusByParent((prev) => ({ ...prev, [statusKey]: "error" }));
        return false;
      }
    },
    []
  );

  const addSubtopic = useCallback(
    async (parentIndex: number, requestedTitle: string): Promise<boolean> => {
      const parentSubtopic = subtopicSchema.omit({ parentIndex: true }).parse(subtopics[parentIndex]);
      const siblingTitles = subtopics
        .filter((s) => s.parentIndex === parentIndex)
        .map((s) => s.title);

      const success = await invokeAddSubtopic(parentIndex, {
        topic: data.topic,
        difficulty: data.difficulty,
        model,
        parentSubtopic,
        siblingTitles,
        requestedTitle: requestedTitle.trim(),
      });
      return success;
    },
    [data.difficulty, data.topic, invokeAddSubtopic, model, subtopics]
  );

  const addRootSubtopic = useCallback(
    async (requestedTitle: string): Promise<boolean> => {
      const existingRootTitles = subtopics
        .filter((s) => s.parentIndex === undefined)
        .map((s) => s.title);

      return invokeAddSubtopic("root", {
        topic: data.topic,
        difficulty: data.difficulty,
        model,
        subjectSummary: data.summary,
        siblingTitles: existingRootTitles,
        requestedTitle: requestedTitle.trim(),
      });
    },
    [data.difficulty, data.summary, data.topic, invokeAddSubtopic, model, subtopics]
  );

  const addRootDeepDiveSubtopic = useCallback(async (): Promise<boolean> => {
    const existingRootTitles = subtopics
      .filter((s) => s.parentIndex === undefined)
      .map((s) => s.title);

    return invokeAddSubtopic("root-dive", {
      topic: data.topic,
      difficulty: data.difficulty,
      model,
      subjectSummary: data.summary,
      siblingTitles: existingRootTitles,
      requestedTitle: "Explore a deeper or broader root subtopic not yet covered",
    });
  }, [data.difficulty, data.summary, data.topic, invokeAddSubtopic, model, subtopics]);

  return {
    subtopics,
    addSubtopic,
    addRootSubtopic,
    addRootDeepDiveSubtopic,
    statusByParent,
    errorByParent,
  };
}
