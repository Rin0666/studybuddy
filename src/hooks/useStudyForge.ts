import { useState, useCallback } from "react";
import { z } from "zod";
import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  deepDiveSchema,
  studySetSchema,
  subtopicAddResponseSchema,
  type Scope,
  type Model,
  type GeneratorStatus,
  type StudySet,
  type Subtopic,
} from "@/types";
import supabase from "@/lib/supabase";
import { withDeepDiveArrayFormat } from "@/lib/deepDiveFormat";

const MINIMUM_ROOTS: Record<Scope, number> = {
  Quick: 3,
  Standard: 5,
  Comprehensive: 7,
};

const normalizeTitle = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function isDistinctTitle(candidate: string, existingTitles: string[]): boolean {
  const normalizedCandidate = normalizeTitle(candidate);
  if (!normalizedCandidate) return false;

  return existingTitles.every((existingTitle) => {
    const existing = normalizeTitle(existingTitle);
    return (
      existing !== normalizedCandidate &&
      !existing.includes(normalizedCandidate) &&
      !normalizedCandidate.includes(existing)
    );
  });
}

async function discoverMissingRootTitles(
  studySet: StudySet,
  request: { topic: string; scope: Scope; model: Model }
): Promise<string[]> {
  const existingTitles = studySet.subtopics.map((subtopic) => subtopic.title);
  const instruction = [
    `Identify every important root subtopic still missing from this ${request.scope} study guide.`,
    "Return each missing subtopic as a concise title in the relatedConcepts array.",
    "Do not repeat, rename, or overlap any covered title.",
    `Covered root subtopics:\n${existingTitles.map((title) => `- ${title}`).join("\n")}`,
    `Subject overview:\n${studySet.summary}`,
  ]
    .join("\n\n")
    .slice(0, 2000);

  const { data: rawData, error } = await supabase.functions.invoke("studyforge-dive", {
    body: {
      topic: request.topic,
      context: withDeepDiveArrayFormat(instruction),
      target: `The complete set of important missing learning areas for ${request.topic}`.slice(0, 200),
      focus: "overview",
      scope: request.scope,
      difficulty: "Intermediate",
      model: request.model,
    },
  });

  if (error) throw error;
  if (!rawData) throw new Error("No response while expanding the study guide.");

  const discovery = deepDiveSchema.parse(rawData);
  const candidates: string[] = [];

  for (const rawCandidate of discovery.relatedConcepts) {
    const candidate = rawCandidate.replace(/^[-*\d.)\s]+/, "").trim();
    if (
      candidate.length > 0 &&
      candidate.length <= 200 &&
      isDistinctTitle(candidate, [...existingTitles, ...candidates])
    ) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

async function generateMissingRoots(
  studySet: StudySet,
  request: { topic: string; scope: Scope; model: Model },
  titles: string[]
): Promise<Subtopic[]> {
  const siblingTitles = studySet.subtopics.map((subtopic) => subtopic.title);

  const results = await Promise.all(
    titles.map(async (requestedTitle) => {
      try {
        const { data: rawData, error } = await supabase.functions.invoke("studyforge-add-subtopic", {
          body: {
            topic: request.topic,
            scope: request.scope,
            difficulty: "Intermediate",
            model: request.model,
            subjectSummary: studySet.summary,
            siblingTitles,
            requestedTitle,
          },
        });

        if (error || !rawData) return null;
        const response = subtopicAddResponseSchema.parse(rawData);
        return response.valid ? response.subtopic : null;
      } catch {
        return null;
      }
    })
  );

  return results.filter((subtopic): subtopic is Subtopic => subtopic !== null);
}

async function expandLegacyStudySet(
  initialStudySet: StudySet,
  request: { topic: string; scope: Scope; model: Model }
): Promise<StudySet> {
  let expanded = initialStudySet;
  const minimum = MINIMUM_ROOTS[request.scope];

  for (let round = 0; round < 2 && expanded.subtopics.length < minimum; round++) {
    const discoveredTitles = await discoverMissingRootTitles(expanded, request);
    if (discoveredTitles.length === 0) break;

    const needed = minimum - expanded.subtopics.length;
    const selectedTitles = request.scope === "Comprehensive"
      ? discoveredTitles
      : discoveredTitles.slice(0, needed);
    const generatedSubtopics = await generateMissingRoots(expanded, request, selectedTitles);
    if (generatedSubtopics.length === 0) break;

    expanded = {
      ...expanded,
      subtopics: [...expanded.subtopics, ...generatedSubtopics],
    };
  }

  return expanded;
}

export interface UseStudyForge {
  status: GeneratorStatus;
  error: string | null;
  data: StudySet | null;
  generate: (request: { topic: string; scope: Scope; model: Model }) => Promise<void>;
  reset: () => void;
}

export function useStudyForge(): UseStudyForge {
  const [status, setStatus] = useState<GeneratorStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StudySet | null>(null);

  const generate = useCallback(async (request: { topic: string; scope: Scope; model: Model }) => {
    setStatus("loading");
    setError(null);

    try {
      const { data: rawData, error: fnError } = await supabase.functions.invoke("studyforge-generate", {
        // Keep compatibility with the previously deployed API until the
        // scope-aware Supabase function is deployed.
        body: { ...request, difficulty: "Intermediate" },
      });

      if (fnError) throw fnError;
      if (!rawData) throw new Error("No response from study generator.");

      const isLegacyResponse = rawData.scope === undefined;
      const parsed = studySetSchema.parse({ ...rawData, scope: rawData.scope ?? request.scope });
      const completeStudySet = isLegacyResponse
        ? await expandLegacyStudySet(parsed, request)
        : parsed;
      setData(completeStudySet);
      setStatus("success");
    } catch (err) {
      let message = "Something went wrong generating your lesson — try again.";

      if (err instanceof FunctionsHttpError) {
        try {
          const data = await err.context.json();
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
