import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getSharedStudySet } from "@/lib/studySets";
import { ResultsView } from "@/components/ResultsView";
import { Sparkles, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import type { StudySet } from "@/types";

export default function SharedView() {
  const { slug } = useParams<{ slug: string }>();
  const [studySet, setStudySet] = useState<StudySet | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setStatus("error");
      setError("Missing share link.");
      return;
    }

    let mounted = true;
    getSharedStudySet(slug)
      .then((res) => {
        if (!mounted) return;
        if (!res) {
          setStatus("error");
          setError("We couldn't find that shared lesson. It may have been removed or the link might be incorrect.");
          return;
        }
        setStudySet(res.studySet);
        setStatus("success");
      })
      .catch((err) => {
        if (!mounted) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to load shared lesson.");
      });

    return () => {
      mounted = false;
    };
  }, [slug]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground/60">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (status === "error" || !studySet) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans">
        <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-secondary transition-colors cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
              StudyForge
            </Link>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
            <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">Lesson not found</h1>
            <p className="text-foreground/70 max-w-md mx-auto">{error}</p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-all hover:bg-secondary active:scale-[0.97] cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Create your own lesson
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-secondary transition-colors cursor-pointer">
            <Sparkles className="w-4 h-4" />
            StudyForge
          </Link>
          <span className="text-xs font-semibold text-foreground/50 bg-muted px-2.5 py-1 rounded-full">Shared view</span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <ResultsView data={studySet} onReset={() => {}} />
      </main>
    </div>
  );
}
