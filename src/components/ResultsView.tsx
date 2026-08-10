import { useMemo, useState } from "react";
import type { StudySet, Model } from "@/types";
import {
  ArrowLeft,
  Award,
  Download,
  FileText,
  Presentation,
  HelpCircle,
  GraduationCap,
} from "lucide-react";
import { TabNav, type Tab } from "@/components/results/TabNav";
import { SummaryTab } from "@/components/results/SummaryTab";
import { LessonPlanTab } from "@/components/results/LessonPlanTab";
import { QuizTab } from "@/components/results/QuizTab";
import { ExportTab } from "@/components/results/ExportTab";
import { useSubtopicTree } from "@/hooks/useSubtopicTree";

interface ResultsViewProps {
  data: StudySet;
  model?: Model;
  onReset: () => void;
}

type ResultTab = "summary" | "lesson" | "quiz" | "export";

export function ResultsView({ data, model = "Qwen/Qwen2.5-7B-Instruct", onReset }: ResultsViewProps) {
  const [activeTab, setActiveTab] = useState<ResultTab>("summary");
  const {
    subtopics,
    addSubtopic,
    addRootSubtopic,
    addRootDeepDiveSubtopic,
    statusByParent,
    errorByParent,
  } = useSubtopicTree(data, model);

  const { topic, scope } = data;

  const studySetWithTree: StudySet = useMemo(
    () => ({ ...data, subtopics }),
    [data, subtopics]
  );

  const exportPayload = useMemo(() => JSON.stringify(studySetWithTree, null, 2), [studySetWithTree]);

  const handleDownloadJSON = () => {
    const blob = new Blob([exportPayload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${topic.replace(/\s+/g, "_").toLowerCase()}_study_set.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tabs: Tab[] = [
    { id: "summary", label: "Summary", icon: <FileText className="w-4 h-4" /> },
    { id: "lesson", label: "Lesson Plan", icon: <GraduationCap className="w-4 h-4" /> },
    { id: "quiz", label: "Quiz", icon: <HelpCircle className="w-4 h-4" /> },
    { id: "export", label: "Export", icon: <Presentation className="w-4 h-4" /> },
  ];

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">
            <Award className="w-3.5 h-3.5" />
            {scope} scope
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {topic}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadJSON}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-border active:scale-[0.97] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export JSON</span>
            <span className="sm:hidden">JSON</span>
          </button>
          <button
            onClick={onReset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-all duration-200 hover:bg-secondary active:scale-[0.97] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            New topic
          </button>
        </div>
      </div>

      <div className="mb-6 sm:mb-8">
        <TabNav tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveTab(id as ResultTab)} />
      </div>

      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="min-h-[12rem]"
      >
        {activeTab === "summary" && <SummaryTab data={studySetWithTree} model={model} />}
        {activeTab === "lesson" && (
          <LessonPlanTab
            data={studySetWithTree}
            subtopics={subtopics}
            model={model}
            onAddSubtopic={addSubtopic}
            onAddRootSubtopic={addRootSubtopic}
            onRootDeepDive={addRootDeepDiveSubtopic}
            addStatusByParent={statusByParent}
            addErrorByParent={errorByParent}
          />
        )}
        {activeTab === "quiz" && <QuizTab data={studySetWithTree} />}
        {activeTab === "export" && <ExportTab data={studySetWithTree} model={model} />}
      </div>
    </section>
  );
}
