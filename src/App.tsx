import { useState, lazy, Suspense } from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import { useStudyForge } from "@/hooks/useStudyForge";
import { GenerateForm, type GenerateFormRequest } from "@/components/GenerateForm";
import { ResultsView } from "@/components/ResultsView";
import { AuthButton } from "@/components/AuthButton";
import { Sparkles, Loader2 } from "lucide-react";
import type { Model } from "@/types";

const SharedView = lazy(() => import("@/components/SharedView"));
const SavedStudySetsPage = lazy(() => import("@/components/SavedStudySetsPage"));
const LoginPage = lazy(() => import("@/components/LoginPage"));
const SignupPage = lazy(() => import("@/components/SignupPage"));
const ForgotPasswordPage = lazy(() => import("@/components/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/components/ResetPasswordPage"));

function MainApp() {
  const studyForge = useStudyForge();
  const [showResults, setShowResults] = useState(false);
  const [model, setModel] = useState<Model>("Qwen/Qwen2.5-7B-Instruct");

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
        {showResults && studyForge.data ? (
          <ResultsView
            data={studyForge.data}
            model={model}
            onReset={() => {
              studyForge.reset();
              setShowResults(false);
            }}
          />
        ) : (
          <GenerateForm
            status={studyForge.status}
            error={studyForge.error}
            onGenerate={async (request: GenerateFormRequest) => {
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
