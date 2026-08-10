import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSavedStudySets } from "@/hooks/useSavedStudySets";
import { useAuth } from "@/lib/auth";
import type { SavedStudySet } from "@/lib/studySets";
import {
  Sparkles,
  Loader2,
  Trash2,
  ExternalLink,
  BookOpen,
  AlertCircle,
  ArrowLeft,
  FolderOpen,
  Users,
} from "lucide-react";

export default function SavedStudySetsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { list, receivedList, listStatus, listError, refresh, remove, removeStatus, removeError } = useSavedStudySets();
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setShowSignInPrompt(true);
      return;
    }
    refresh();
  }, [authLoading, user, refresh]);

  if (authLoading || listStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground/60">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (showSignInPrompt) {
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
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center">
          <div className="rounded-2xl border border-border bg-white p-8 max-w-md mx-auto">
            <FolderOpen className="w-10 h-10 text-primary mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">Sign in to see saved lessons</h1>
            <p className="text-sm text-foreground/70 mb-6">Your saved study sets live here once you sign in.</p>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-all hover:bg-secondary active:scale-[0.97] cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Back to StudyForge
            </button>
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
            <ArrowLeft className="w-4 h-4" />
            StudyForge
          </Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">Saved lessons</h1>
            <p className="text-foreground/70 mt-1">Pick up where you left off.</p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-all hover:bg-secondary active:scale-[0.97] cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            New lesson
          </Link>
        </div>

        {listError && (
          <div className="mb-6 rounded-xl bg-destructive/10 border border-destructive/20 p-4 flex items-start gap-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {listError}
          </div>
        )}
        {removeError && (
          <div className="mb-6 rounded-xl bg-destructive/10 border border-destructive/20 p-4 flex items-start gap-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {removeError}
          </div>
        )}

        {list.length === 0 && receivedList.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white p-10 text-center">
            <FolderOpen className="w-10 h-10 text-foreground/30 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground mb-2">No saved lessons yet</h2>
            <p className="text-sm text-foreground/70 mb-6 max-w-sm mx-auto">
              Lessons you save or that someone shares with you will appear here.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-all hover:bg-secondary active:scale-[0.97] cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Create a lesson
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {list.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-foreground mb-4">Your lessons</h2>
                <LessonGrid
                  lessons={list}
                  removeStatus={removeStatus}
                  onDelete={remove}
                  onOpen={(item) =>
                    navigate("/", {
                      state: { studySet: item.payload, savedId: item.id },
                    })
                  }
                />
              </section>
            )}

            {receivedList.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">Shared with you</h2>
                </div>
                <LessonGrid
                  lessons={receivedList.map(({ studySet }) => studySet)}
                  shared
                  removeStatus={removeStatus}
                  onOpen={(item) =>
                    navigate("/", { state: { studySet: item.payload } })
                  }
                />
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

interface LessonGridProps {
  lessons: SavedStudySet[];
  shared?: boolean;
  removeStatus: string;
  onOpen: (lesson: SavedStudySet) => void;
  onDelete?: (id: string) => Promise<void>;
}

function LessonGrid({ lessons, shared = false, removeStatus, onOpen, onDelete }: LessonGridProps) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {lessons.map((item) => (
        <li
          key={item.id}
          className="group flex flex-col justify-between rounded-2xl border border-border bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
        >
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  {item.scope}
                </span>
                {shared && (
                  <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                    Shared
                  </span>
                )}
              </div>
              {!shared && onDelete && (
                <button
                  onClick={async () => {
                    if (confirm("Delete this saved lesson?")) await onDelete(item.id);
                  }}
                  disabled={removeStatus === "loading"}
                  className="text-foreground/40 hover:text-destructive transition-colors cursor-pointer p-1"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <h3 className="font-bold text-foreground line-clamp-2 mb-2">{item.topic}</h3>
            <p className="text-xs text-foreground/50 flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {item.payload.subtopics.length} subtopic{item.payload.subtopics.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-border flex items-center gap-2">
            <button
              onClick={() => onOpen(item)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-border active:scale-[0.97] cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
