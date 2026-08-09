import { useState } from "react";
import { useStudyForge } from "@/hooks/useStudyForge";
import { GenerateForm, type GenerateFormRequest } from "@/components/GenerateForm";
import { ResultsView } from "@/components/ResultsView";
import { Sparkles } from "lucide-react";
import type { Model } from "@/types";

export default function App() {
  const studyForge = useStudyForge();
  const [showResults, setShowResults] = useState(false);
  const [model, setModel] = useState<Model>("Qwen/Qwen2.5-7B-Instruct");

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-2.5">
          <div className="bg-primary text-on-primary rounded-lg p-1.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">StudyForge</h1>
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
