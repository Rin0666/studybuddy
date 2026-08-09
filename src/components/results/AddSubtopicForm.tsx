import { useId, useState } from "react";
import { Plus, Loader2, AlertCircle, X, CheckCircle2, Compass, Sparkles } from "lucide-react";
import type { AddSubtopicStatus, SubtopicAddError } from "@/types";

interface AddSubtopicFormProps {
  parentTitle: string;
  onAdd: (title: string) => Promise<boolean>;
  onSuggest?: () => Promise<boolean>;
  status: AddSubtopicStatus;
  error: SubtopicAddError | null;
  variant?: "child" | "root" | "root-dive";
}

export function AddSubtopicForm({
  parentTitle,
  onAdd,
  onSuggest,
  status,
  error,
  variant = "child",
}: AddSubtopicFormProps) {
  const id = useId();
  const inputId = `new-subtopic-title-${id}`;
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");

  const isLoading = status === "loading";
  const isSuccess = status === "success";
  const isRootDive = variant === "root-dive";
  const suggestionOptions = error?.suggestions ?? (error?.suggestion ? [error.suggestion] : []);

  const handleOpen = () => {
    setIsOpen(true);
    setTitle("");
  };

  const handleClose = () => {
    setIsOpen(false);
    setTitle("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    if (isLoading) return;
    const success = await onAdd(trimmed);
    if (success) {
      setTitle("");
      setIsOpen(false);
    }
  };

  const handleRootDive = async () => {
    if (isLoading) return;
    await onAdd("");
  };

  const handleSuggestionChoice = async (suggestion: string) => {
    if (isLoading) return;
    setTitle(suggestion);
    const success = await onAdd(suggestion);
    if (success) {
      setTitle("");
      setIsOpen(false);
    }
  };

  const handleSuggestAndAdd = async () => {
    if (!onSuggest || isLoading) return;
    const success = await onSuggest();
    if (success) {
      setTitle("");
      setIsOpen(false);
    }
  };

  // A root deep dive is a one-click action: generation starts immediately and
  // the resulting subtopic is appended alongside the other root subtopics.
  if (isRootDive) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleRootDive}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary/40 bg-primary/[0.02] px-3 py-2 text-xs font-semibold text-primary transition-all duration-200 hover:border-primary hover:bg-primary/[0.05] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          aria-label={`Generate another root subtopic for ${parentTitle}`}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Compass className="w-3.5 h-3.5" />
          )}
          {isLoading ? "Diving deeper…" : isSuccess ? "Root subtopic added" : "Dive deeper"}
        </button>

        {error && (
          <div
            className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200 ease-out"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground/80">{error.message}</p>
              <SuggestionChoices
                suggestions={suggestionOptions}
                onChoose={handleSuggestionChoice}
                disabled={isLoading}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.97] cursor-pointer ${
          variant === "root"
            ? "border-primary/40 bg-primary/[0.02] text-primary hover:border-primary hover:bg-primary/[0.05]"
            : "border-border bg-white text-foreground/70 hover:border-primary/40 hover:text-primary hover:bg-primary/[0.02]"
        }`}
      >
        <Plus className="w-3.5 h-3.5" />
        {variant === "root" ? `Add root subtopic to ${parentTitle}` : "Add subtopic"}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200 ease-out">
      <div className="flex flex-col sm:flex-row gap-2">
        <label htmlFor={inputId} className="sr-only">
          New subtopic under {parentTitle}
        </label>
        <input
          id={inputId}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            variant === "root"
              ? `Add a new top-level area of ${parentTitle}…`
              : `Drill deeper into ${parentTitle}…`
          }
          disabled={isLoading}
          className="min-w-0 flex-1 rounded-xl border border-border bg-white px-3.5 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-60"
          autoFocus
        />
        <div className="flex items-center gap-2">
          {onSuggest && (
            <button
              type="button"
              onClick={handleSuggestAndAdd}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/[0.04] px-3 py-2 text-xs font-semibold text-primary transition-all duration-200 hover:border-primary hover:bg-primary/[0.08] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Suggest &amp; add
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !title.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary transition-all duration-200 hover:bg-secondary active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Adding…
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Added
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                Add
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-lg bg-muted p-2 text-foreground/70 transition-colors hover:bg-border active:scale-[0.97] disabled:opacity-50 cursor-pointer"
            aria-label="Cancel adding subtopic"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200 ease-out">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground/80">{error.message}</p>
            <SuggestionChoices
              suggestions={suggestionOptions}
              onChoose={handleSuggestionChoice}
              disabled={isLoading}
            />
          </div>
        </div>
      )}
    </form>
  );
}

function SuggestionChoices({
  suggestions,
  onChoose,
  disabled,
}: {
  suggestions: string[];
  onChoose: (suggestion: string) => void;
  disabled: boolean;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs font-semibold text-foreground/70">
        {suggestions.length === 1 ? "Try this narrower topic:" : "Choose a narrower topic:"}
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onChoose(suggestion)}
            disabled={disabled}
            className="rounded-lg border border-primary/30 bg-white px-3 py-1.5 text-left text-xs font-semibold text-primary transition-colors hover:border-primary hover:bg-primary/[0.06] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
