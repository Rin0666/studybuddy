import { useState, useCallback, useEffect, useRef } from "react";
import { z } from "zod";
import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  deepDiveSchema,
  subtopicAddResponseSchema,
  subtopicSchema,
  type StudySet,
  type Model,
  type Subtopic,
  type AddSubtopicStatus,
  type SubtopicAddError,
} from "@/types";
import supabase from "@/lib/supabase";
import { withDeepDiveArrayFormat } from "@/lib/deepDiveFormat";

function cleanSuggestionTitle(value: string): string {
  return value
    .trim()
    .replace(/^(?:did you mean|suggestions?):\s*/i, "")
    .replace(/^[-*\d.)\s]+/, "")
    .replace(/^["'`*]+|["'`*?]+$/g, "")
    .trim();
}

function getSuggestionOptions(suggestion?: string, suggestions: string[] = []): string[] {
  const options = suggestions.map(cleanSuggestionTitle);

  if (suggestion) {
    let legacySuggestions: string[] = [];

    try {
      const parsed = JSON.parse(suggestion);
      if (Array.isArray(parsed)) {
        legacySuggestions = parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      legacySuggestions = suggestion.split(/\r?\n|\s+or\s+|\s*\|\s*/i);
    }

    options.push(...legacySuggestions.map(cleanSuggestionTitle));
  }

  return options
    .filter((option) => option.length > 0 && option.length <= 200)
    .filter((option, index, all) => {
      const normalized = option.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      return all.findIndex(
        (candidate) => candidate.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === normalized
      ) === index;
    });
}

export interface UseSubtopicTree {
  subtopics: Subtopic[];
  addSubtopic: (parentIndex: number, requestedTitle: string) => Promise<boolean>;
  addRootSubtopic: (requestedTitle: string) => Promise<boolean>;
  addRootDeepDiveSubtopic: (requestedTitle?: string) => Promise<boolean>;
  statusByParent: Partial<Record<number | "root" | "root-dive", AddSubtopicStatus>>;
  errorByParent: Partial<Record<number | "root" | "root-dive", SubtopicAddError | null>>;
}

export function useSubtopicTree(data: StudySet, model: Model): UseSubtopicTree {
  const [subtopics, setSubtopics] = useState<Subtopic[]>(data.subtopics);
  const [statusByParent, setStatusByParent] = useState<Partial<Record<number | "root" | "root-dive", AddSubtopicStatus>>>({});
  const [errorByParent, setErrorByParent] = useState<Partial<Record<number | "root" | "root-dive", SubtopicAddError | null>>>({});

  const keyRef = useRef(`${data.topic}:${data.scope}`);
  const currentKey = `${data.topic}:${data.scope}`;

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
    scope: StudySet["scope"];
    difficulty: "Intermediate";
    model: Model;
    subjectSummary?: string;
    parentSubtopic?: Omit<Subtopic, "parentIndex">;
    siblingTitles: string[];
    requestedTitle: string;
    autoSuggest?: boolean;
  };

  const invokeAddSubtopic = useCallback(
    async (
      statusKey: number | "root" | "root-dive",
      payload: AddSubtopicPayload,
      parentIndex?: number
    ): Promise<boolean> => {
      setStatusByParent((prev) => ({ ...prev, [statusKey]: "loading" }));
      setErrorByParent((prev) => ({ ...prev, [statusKey]: null }));

      try {
        const { data: rawData, error: fnError } = await supabase.functions.invoke("studyforge-add-subtopic", {
          body: payload,
        });

        if (fnError) throw fnError;
        if (!rawData) throw new Error("No response from subtopic generator.");

        let response = subtopicAddResponseSchema.parse(rawData);

        const initialSuggestionOptions = response.valid
          ? []
          : getSuggestionOptions(response.suggestion, response.suggestions);

        if (!response.valid && initialSuggestionOptions.length === 1) {
          const suggestedTitle = initialSuggestionOptions[0];
          const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
          const normalizedSuggestion = normalize(suggestedTitle);
          const suggestionIsUsable =
            suggestedTitle.length > 0 &&
            suggestedTitle.length <= 200 &&
            normalizedSuggestion !== normalize(payload.requestedTitle) &&
            payload.siblingTitles.every((title) => normalize(title) !== normalizedSuggestion);

          if (suggestionIsUsable) {
            const { data: retryData, error: retryError } = await supabase.functions.invoke(
              "studyforge-add-subtopic",
              {
                body: { ...payload, requestedTitle: suggestedTitle },
              }
            );

            if (retryError) throw retryError;
            if (!retryData) throw new Error("No response while refining the suggested subtopic.");
            response = subtopicAddResponseSchema.parse(retryData);
          }
        }

        if (!response.valid) {
          const message = response.reason ?? "That subtopic doesn't fit here — try something more specific.";
          const suggestionOptions = getSuggestionOptions(response.suggestion, response.suggestions);
          setErrorByParent((prev) => ({
            ...prev,
            [statusKey]: {
              message,
              suggestion: suggestionOptions.length === 1 ? suggestionOptions[0] : undefined,
              suggestions: suggestionOptions.length > 1 ? suggestionOptions : undefined,
            },
          }));
          setStatusByParent((prev) => ({ ...prev, [statusKey]: "error" }));
          return false;
        }

        setSubtopics((prev) => [
          ...prev,
          {
            ...response.subtopic,
            ...(parentIndex === undefined ? {} : { parentIndex }),
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

      const success = await invokeAddSubtopic(
        parentIndex,
        {
          topic: data.topic,
          scope: data.scope,
          difficulty: "Intermediate",
          model,
          parentSubtopic,
          siblingTitles,
          requestedTitle: requestedTitle.trim(),
        },
        parentIndex
      );
      return success;
    },
    [data.scope, data.topic, invokeAddSubtopic, model, subtopics]
  );

  const addRootSubtopic = useCallback(
    async (requestedTitle: string): Promise<boolean> => {
      const existingRootTitles = subtopics
        .filter((s) => s.parentIndex === undefined)
        .map((s) => s.title);

      return invokeAddSubtopic("root", {
        topic: data.topic,
        scope: data.scope,
        difficulty: "Intermediate",
        model,
        subjectSummary: data.summary,
        siblingTitles: existingRootTitles,
        requestedTitle: requestedTitle.trim(),
      });
    },
    [data.scope, data.summary, data.topic, invokeAddSubtopic, model, subtopics]
  );

  const addRootDeepDiveSubtopic = useCallback(async (requestedTitle?: string): Promise<boolean> => {
    const existingRootTitles = subtopics
      .filter((s) => s.parentIndex === undefined)
      .map((s) => s.title);

    if (requestedTitle?.trim()) {
      return invokeAddSubtopic("root-dive", {
        topic: data.topic,
        scope: data.scope,
        difficulty: "Intermediate",
        model,
        subjectSummary: data.summary,
        siblingTitles: existingRootTitles,
        requestedTitle: requestedTitle.trim(),
      });
    }

    setStatusByParent((prev) => ({ ...prev, "root-dive": "loading" }));
    setErrorByParent((prev) => ({ ...prev, "root-dive": null }));

    let suggestedTitle: string;

    try {
      const discoveryContext = [
        "Find one useful root subtopic that is not already covered by the titles below.",
        `Existing root subtopics:\n${existingRootTitles.map((title) => `- ${title}`).join("\n")}`,
        `Subject overview:\n${data.summary}`,
      ]
        .join("\n\n")
        .slice(0, 2000);

      const { data: rawDiveData, error: diveError } = await supabase.functions.invoke("studyforge-dive", {
        body: {
          topic: data.topic,
          context: withDeepDiveArrayFormat(discoveryContext),
          target: `A distinct uncovered root subtopic within ${data.topic}`.slice(0, 200),
          focus: "overview",
          scope: data.scope,
          difficulty: "Intermediate",
          model,
        },
      });

      if (diveError) throw diveError;
      if (!rawDiveData) throw new Error("No response from topic discovery.");

      const discovery = deepDiveSchema.parse(rawDiveData);
      const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const normalizedExisting = existingRootTitles.map(normalize);
      const candidates = [...discovery.relatedConcepts, discovery.title]
        .map((candidate) => candidate.replace(/^[-*\d.)\s]+/, "").trim())
        .filter((candidate) => candidate.length > 0 && candidate.length <= 200);

      const distinctCandidate = candidates.find((candidate) => {
        const normalizedCandidate = normalize(candidate);
        return normalizedExisting.every(
          (existing) =>
            existing !== normalizedCandidate &&
            !existing.includes(normalizedCandidate) &&
            !normalizedCandidate.includes(existing)
        );
      });

      if (!distinctCandidate) {
        throw new Error("The topic explorer did not find a new area. Please try Dive deeper again.");
      }

      suggestedTitle = distinctCandidate;
    } catch (err) {
      let message = "Something went wrong finding a new root subtopic — try again.";

      if (err instanceof FunctionsHttpError) {
        try {
          const errData = await err.context.json();
          message = errData?.error ?? err.message;
        } catch {
          message = err.message;
        }
      } else if (err instanceof z.ZodError) {
        message = "The topic discovery response didn't match the expected format. Please try again.";
      } else if (err instanceof Error) {
        message = err.message;
      }

      setErrorByParent((prev) => ({ ...prev, "root-dive": { message } }));
      setStatusByParent((prev) => ({ ...prev, "root-dive": "error" }));
      return false;
    }

    return invokeAddSubtopic("root-dive", {
      topic: data.topic,
      scope: data.scope,
      difficulty: "Intermediate",
      model,
      subjectSummary: data.summary,
      siblingTitles: existingRootTitles,
      requestedTitle: suggestedTitle,
    });
  }, [data.scope, data.summary, data.topic, invokeAddSubtopic, model, subtopics]);

  return {
    subtopics,
    addSubtopic,
    addRootSubtopic,
    addRootDeepDiveSubtopic,
    statusByParent,
    errorByParent,
  };
}
