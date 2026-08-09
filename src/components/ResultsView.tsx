import { useMemo, useState } from "react";
import type { StudySet, Subtopic, Question } from "@/types";
import {
  ArrowLeft,
  Lightbulb,
  ListChecks,
  HelpCircle,
  BookOpen,
  Award,
  Download,
  RotateCcw,
  Layers,
  Target,
} from "lucide-react";

interface ResultsViewProps {
  data: StudySet;
  onReset: () => void;
}

type QuizSelections = Record<string, number | undefined>;

export function ResultsView({ data, onReset }: ResultsViewProps) {
  const [activeSubtopic, setActiveSubtopic] = useState<number>(0);
  const [quizSelections, setQuizSelections] = useState<QuizSelections>({});

  const { topic, difficulty, summary, keyTakeaways, subtopics } = data;
  const currentSubtopic = subtopics[activeSubtopic];

  const clearAnswers = () => {
    setQuizSelections({});
  };

  const exportPayload = useMemo(() => JSON.stringify(data, null, 2), [data]);

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

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">
            <Award className="w-3.5 h-3.5" />
            {difficulty}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {topic}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadJSON}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-border active:scale-[0.97] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export JSON
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

      <div className="space-y-8">
        <article className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Overview</h3>
          </div>
          <p className="text-foreground/80 leading-relaxed mb-6">{summary}</p>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wide text-foreground/50 mb-3">
              Big-picture takeaways
            </h4>
            <ul className="grid gap-3 sm:grid-cols-2">
              {keyTakeaways.map((takeaway, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  </div>
                  <span className="text-foreground/80 leading-snug">{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
        </article>

        <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
          <nav aria-label="Subtopics" className="space-y-2">
            <div className="flex items-center gap-2 px-1 mb-2">
              <Layers className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold uppercase tracking-wide text-foreground/50">
                Subtopics
              </span>
            </div>
            {subtopics.map((subtopic, index) => {
              const isActive = index === activeSubtopic;
              return (
                <button
                  key={index}
                  onClick={() => {
                    setActiveSubtopic(index);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  aria-current={isActive ? "true" : undefined}
                  className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "border-primary bg-primary text-on-primary shadow-sm"
                      : "border-border bg-white text-foreground/80 hover:border-primary/40 hover:bg-primary/[0.03]"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${
                        isActive ? "bg-white/20 text-white" : "bg-muted text-foreground/60"
                      }`}
                    >
                      {index + 1}
                    </span>
                    {subtopic.title}
                  </span>
                </button>
              );
            })}
          </nav>

          <SubtopicView
            subtopic={currentSubtopic}
            subtopicIndex={activeSubtopic}
            quizSelections={quizSelections}
            onSelect={(questionIndex, optionIndex) =>
              setQuizSelections((prev) => ({
                ...prev,
                [`${activeSubtopic}:${questionIndex}`]: optionIndex,
              }))
            }
            onClear={clearAnswers}
          />
        </div>
      </div>
    </section>
  );
}

interface SubtopicViewProps {
  subtopic: Subtopic;
  subtopicIndex: number;
  quizSelections: QuizSelections;
  onSelect: (questionIndex: number, optionIndex: number) => void;
  onClear: () => void;
}

function SubtopicView({
  subtopic,
  subtopicIndex,
  quizSelections,
  onSelect,
  onClear,
}: SubtopicViewProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300 ease-out">
      <article className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
        <h3 className="text-2xl font-extrabold tracking-tight text-foreground mb-4">
          {subtopic.title}
        </h3>
        <p className="text-foreground/80 leading-relaxed mb-6">{subtopic.summary}</p>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wide text-foreground/50 mb-3">
            Key takeaways
          </h4>
          <ul className="grid gap-3 sm:grid-cols-2">
            {subtopic.keyTakeaways.map((takeaway, i) => (
              <li key={i} className="flex items-start gap-3">
                <Lightbulb className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span className="text-foreground/80 leading-snug">{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>
      </article>

      <article className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Objectives</h3>
        </div>
        <ul className="space-y-2">
          {subtopic.objectives.map((objective, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                {i + 1}
              </span>
              <span className="text-foreground/80">{objective}</span>
            </li>
          ))}
        </ul>
      </article>

      <article className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <ListChecks className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Key concepts</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {subtopic.keyConcepts.map((item, i) => (
            <div key={i} className="rounded-xl border border-border bg-muted p-4">
              <h4 className="font-semibold text-foreground mb-2">{item.concept}</h4>
              <ul className="space-y-1">
                {item.details.map((detail, j) => (
                  <li key={j} className="text-sm text-foreground/70 flex items-start gap-2">
                    <span className="text-primary mt-1.5">•</span>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </article>

      <article className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Quiz</h3>
          </div>
          <button
            onClick={onClear}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-border active:scale-[0.97] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset all
          </button>
        </div>
        <div className="space-y-6">
          {subtopic.quiz.questions.map((q, i) => (
            <QuizCard
              key={`${subtopicIndex}:${i}`}
              index={i}
              question={q}
              selected={quizSelections[`${subtopicIndex}:${i}`]}
              onSelect={(opt) => onSelect(i, opt)}
            />
          ))}
        </div>
      </article>
    </div>
  );
}

interface QuizCardProps {
  index: number;
  question: Question;
  selected: number | undefined;
  onSelect: (optionIndex: number) => void;
}

function ResultBadge({ isCorrect }: { isCorrect: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
        isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {isCorrect ? "Correct" : "Incorrect"}
    </span>
  );
}

function QuizCard({ index, question, selected, onSelect }: QuizCardProps) {
  const isRevealed = selected !== undefined;
  const correctIndex = question.correctIndex;

  return (
    <div className="rounded-xl border border-border bg-muted overflow-hidden transition-all duration-200 hover:shadow-sm hover:border-border/80">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <span className="font-semibold text-foreground">
            {index + 1}. {question.question}
          </span>
          {isRevealed && <ResultBadge isCorrect={selected === correctIndex} />}
        </div>
      </div>

      <ul className="px-4 pb-4 space-y-2">
        {question.options.map((option, optIndex) => {
          const isSelected = selected === optIndex;
          const correct = optIndex === correctIndex;
          const showCorrect = isRevealed && correct;
          const showWrong = isRevealed && isSelected && !correct;

          return (
            <li key={optIndex}>
              <button
                onClick={() => onSelect(optIndex)}
                disabled={isRevealed}
                className={`w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all duration-150 active:scale-[0.99] cursor-pointer ${
                  showCorrect
                    ? "border-green-200 bg-green-50 text-green-900 ring-1 ring-green-200"
                    : showWrong
                    ? "border-red-200 bg-red-50 text-red-900 ring-1 ring-red-200"
                    : isSelected
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-white text-foreground/80 hover:border-primary/40 hover:bg-primary/[0.02]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-flex h-4 w-4 items-center justify-center rounded-full border shrink-0 ${
                    showCorrect
                      ? "border-green-600 bg-green-600 text-white"
                      : showWrong
                      ? "border-red-600 bg-red-600 text-white"
                      : isSelected
                      ? "border-primary bg-primary text-white"
                      : "border-foreground/30 text-foreground/50"
                  } text-[10px] font-bold`}
                >
                  {String.fromCharCode(65 + optIndex)}
                </span>
                <span className="flex-1">{option}</span>
                {showCorrect && (
                  <span className="text-xs font-bold text-green-700">Correct</span>
                )}
                {showWrong && (
                  <span className="text-xs font-bold text-red-700">Your pick</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {isRevealed && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-200 ease-out border-t border-border bg-white px-4 py-4">
          <p className="text-sm text-foreground/80">
            <span className="font-semibold text-foreground">Explanation: </span>
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
