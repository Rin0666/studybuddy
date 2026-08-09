import { useState } from "react";
import { useStudyForge } from "@/hooks/useStudyForge";
import { GenerateForm } from "@/components/GenerateForm";
import { ResultsView } from "@/components/ResultsView";
import type { GenerateRequest } from "@/types";
import { Sparkles } from "lucide-react";

export default function App() {
  const studyForge = useStudyForge();
  const [showResults, setShowResults] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-2.5">
          <div className="bg-primary text-on-primary rounded-lg p-1.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">StudyForge</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {showResults && studyForge.data ? (
          <ResultsView
            data={studyForge.data}
            onReset={() => {
              studyForge.reset();
              setShowResults(false);
            }}
          />
        ) : (
          <GenerateForm
            status={studyForge.status}
            error={studyForge.error}
            onGenerate={async (request: GenerateRequest) => {
              await studyForge.generate(request);
              setShowResults(true);
            }}
          />
        )}
      </main>
    </div>
  );
}
