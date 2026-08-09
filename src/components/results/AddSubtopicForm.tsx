import { useState } from "react";
import { Plus, Loader2, AlertCircle, X, CheckCircle2 } from "lucide-react";
import type { AddSubtopicStatus } from "@/types";

interface AddSubtopicFormProps {
  parentTitle: string;
  onAdd: (title: string) => Promise<boolean>;
  status: AddSubtopicStatus;
  error: { message: string; suggestion?: string } | null;
}

export function AddSubtopicForm({ parentTitle, onAdd, status, error }: AddSubtopicFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");

  const isLoading = status === "loading";
  const isSuccess = status === "success";

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
    if (!trimmed || isLoading) return;
    const success = await onAdd(trimmed);
    if (success) {
      setTitle("");
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border bg-white px-3 py-2 text-xs font-semibold text-foreground/70 transition-all duration-200 hover:border-primary/40 hover:text-primary hover:bg-primary/[0.02] active:scale-[0.97] cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        Add subtopic
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200 ease-out">
      <div className="flex flex-col sm:flex-row gap-2">
        <label htmlFor="new-subtopic-title" className="sr-only">
          New subtopic under {parentTitle}
        </label>
        <input
          id="new-subtopic-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`Drill deeper into ${parentTitle}…`}
          disabled={isLoading}
          className="min-w-0 flex-1 rounded-xl border border-border bg-white px-3.5 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-60"
          autoFocus
        />
        <div className="flex items-center gap-2">
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
            {error.suggestion && (
              <p className="text-sm text-foreground/70 mt-1">
                Did you mean: <span className="font-semibold text-foreground">{error.suggestion}</span>?
              </p>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
