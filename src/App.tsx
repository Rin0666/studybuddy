import { useState, lazy, Suspense } from "react";
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { useStudyForge } from "@/hooks/useStudyForge";
import { GenerateForm, type GenerateFormRequest } from "@/components/GenerateForm";
import { ResultsView } from "@/components/ResultsView";
import { AuthButton } from "@/components/AuthButton";
import { Sparkles, Loader2 } from "lucide-react";
import { modelSchema, studySetSchema, type Model, type StudySet } from "@/types";

const SharedView = lazy(() => import("@/components/SharedView"));
const SavedStudySetsPage = lazy(() => import("@/components/SavedStudySetsPage"));
const LoginPage = lazy(() => import("@/components/LoginPage"));
const SignupPage = lazy(() => import("@/components/SignupPage"));
const ForgotPasswordPage = lazy(() => import("@/components/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/components/ResetPasswordPage"));

interface OpenedLesson {
  studySet: StudySet;
  savedId?: string;
  model?: Model;
}

function readOpenedLesson(state: unknown): OpenedLesson | null {
  if (!state || typeof state !== "object") return null;

  const routeState = state as {
    studySet?: unknown;
    savedId?: unknown;
    model?: unknown;
  };
  const studySet = studySetSchema.safeParse(routeState.studySet);
  if (!studySet.success) return null;

  const payloadModel = (routeState.studySet as {
    _meta?: { savedWithModel?: unknown };
  })._meta?.savedWithModel;
  const model = modelSchema.safeParse(routeState.model ?? payloadModel);

  return {
    studySet: studySet.data,
    savedId: typeof routeState.savedId === "string" ? routeState.savedId : undefined,
    model: model.success ? model.data : undefined,
  };
}

function MainApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const [openedLesson, setOpenedLesson] = useState<OpenedLesson | null>(() =>
    readOpenedLesson(location.state)
  );
  const studyForge = useStudyForge();
  const [showResults, setShowResults] = useState(() => openedLesson !== null);
  const [model, setModel] = useState<Model>(
    () => openedLesson?.model ?? "Qwen/Qwen2.5-7B-Instruct"
  );
  const displayedStudySet = openedLesson?.studySet ?? studyForge.data;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary text-on-primary rounded-lg p-1.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">StudyForge</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/saved"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-foreground/70 hover:text-foreground transition-colors cursor-pointer"
            >
              Saved
            </Link>
            <AuthButton />
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {showResults && displayedStudySet ? (
          <ResultsView
            data={displayedStudySet}
            model={model}
            savedId={openedLesson?.savedId}
            onReset={() => {
              setOpenedLesson(null);
              studyForge.reset();
              setShowResults(false);
              navigate("/", { replace: true, state: null });
            }}
          />
        ) : (
          <GenerateForm
            status={studyForge.status}
            error={studyForge.error}
            onGenerate={async (request: GenerateFormRequest) => {
              setOpenedLesson(null);
              setModel(request.model);
              await studyForge.generate(request);
              setShowResults(true);
            }}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainApp />} />
      <Route path="/login" element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />
      <Route path="/signup" element={<Suspense fallback={<PageLoader />}><SignupPage /></Suspense>} />
      <Route path="/forgot-password" element={<Suspense fallback={<PageLoader />}><ForgotPasswordPage /></Suspense>} />
      <Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPasswordPage /></Suspense>} />
      <Route path="/saved" element={<Suspense fallback={<PageLoader />}><SavedStudySetsPage /></Suspense>} />
      <Route path="/s/:slug" element={<Suspense fallback={<PageLoader />}><SharedView /></Suspense>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground/60">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  );
}
