const MAX_DEEP_DIVE_CONTEXT_LENGTH = 2000;

const ARRAY_FORMAT_INSTRUCTION = [
  "JSON formatting requirement:",
  "examples, analogies, relatedConcepts, and followUpQuestions must each be JSON arrays of strings.",
  "Even when there is only one item, use an array such as [\"one item\"]. Never return a plain string for these fields.",
].join(" ");

export function withDeepDiveArrayFormat(context: string): string {
  const separator = "\n\n";
  const availableLength = MAX_DEEP_DIVE_CONTEXT_LENGTH - ARRAY_FORMAT_INSTRUCTION.length - separator.length;
  return `${context.slice(0, Math.max(0, availableLength))}${separator}${ARRAY_FORMAT_INSTRUCTION}`;
}