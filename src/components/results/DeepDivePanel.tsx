import { useDeepDive } from "@/hooks/useDeepDive";
import type { DeepDiveResponse, StudySet, Model } from "@/types";
import { ArrowDownCircle, Sparkles, Loader2, AlertCircle, RotateCcw } from "lucide-react";

export function DiveButton({
  label,
  isOpen,
  onClick,
  size = "md",
}: {
  label: string;
  isOpen: boolean;
  onClick: () => void;
  size?: "sm" | "md";
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 text-primary font-semibold transition-all duration-200 hover:bg-primary/20 active:scale-[0.97] cursor-pointer shrink-0 ${
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"
      }`}
      aria-expanded={isOpen}
    >
      {isOpen ? (
        <>
          <ArrowDownCircle className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
          <span>Close</span>
        </>
      ) : (
        <>
          <Sparkles className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

interface DeepDivePanelProps {
  topic: string;
  context: string;
  target: string;
  focus: "overview" | "key-concept" | "subtopic";
  difficulty: StudySet["difficulty"];
  model: Model;
  onClose: () => void;
}

export function DeepDivePanel({ topic, context, target, focus, difficulty, model, onClose }: DeepDivePanelProps) {
  const { status, error, data, dive, reset } = useDeepDive();

  const handleDive = () => {
    reset();
    dive({ topic, context, target, focus, difficulty, model });
  };

  const closed = () => {
    reset();
    onClose();
  };

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/[0.02] p-4 sm:p-6 animate-in fade-in slide-in-from-top-1 duration-300 ease-out">
      {status === "idle" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm text-foreground/70">
            Generate a richer explanation, examples, and analogies for{" "}
            <strong className="text-foreground">{target}</strong>.
          </p>
          <button
            onClick={handleDive}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-all duration-200 hover:bg-secondary active:scale-[0.97] cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            Generate deep dive
          </button>
        </div>
      )}

      {status === "loading" && (
        <div className="flex items-center gap-3 py-6 text-foreground/70">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <p className="text-sm">
            Exploring <strong className="text-foreground">{target}</strong>…
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-destructive/10 border border-destructive/20 p-4">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">We couldn't dive deeper</p>
              <p className="text-sm text-foreground/70 mt-1">{error}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDive}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary transition-all duration-200 hover:bg-secondary active:scale-[0.97] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Try again
            </button>
            <button
              onClick={closed}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-border active:scale-[0.97] cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {status === "success" && data && <DeepDiveContent data={data} onClose={closed} />}
    </div>
  );
}

function DeepDiveContent({ data, onClose }: { data: DeepDiveResponse; onClose: () => void }) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <h4 className="text-base sm:text-lg font-bold text-foreground">{data.title}</h4>
        <button
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-border active:scale-[0.97] cursor-pointer shrink-0"
        >
          Close
        </button>
      </div>

      <div className="text-foreground/80 leading-relaxed space-y-4">
        {data.content
          .split(/\n\s*\n/)
          .filter(Boolean)
          .map((p, i) => (
            <p key={i}>{p}</p>
          ))}
      </div>

      {data.examples.length > 0 && (
        <section>
          <h5 className="text-sm font-bold text-foreground mb-2">Examples</h5>
          <ul className="list-disc list-inside space-y-1 text-sm text-foreground/80 marker:text-primary">
            {data.examples.map((ex, i) => (
              <li key={i}>{ex}</li>
            ))}
          </ul>
        </section>
      )}

      {data.analogies.length > 0 && (
        <section>
          <h5 className="text-sm font-bold text-foreground mb-2">Analogies</h5>
          <ul className="list-disc list-inside space-y-1 text-sm text-foreground/80 marker:text-accent">
            {data.analogies.map((an, i) => (
              <li key={i}>{an}</li>
            ))}
          </ul>
        </section>
      )}

      {data.relatedConcepts.length > 0 && (
        <section>
          <h5 className="text-sm font-bold text-foreground mb-2">Related concepts to explore</h5>
          <div className="flex flex-wrap gap-2">
            {data.relatedConcepts.map((rc, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground/80 border border-border"
              >
                {rc}
              </span>
            ))}
          </div>
        </section>
      )}

      {data.followUpQuestions.length > 0 && (
        <section>
          <h5 className="text-sm font-bold text-foreground mb-2">Questions to check your understanding</h5>
          <ul className="space-y-2">
            {data.followUpQuestions.map((q, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-foreground/80">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
