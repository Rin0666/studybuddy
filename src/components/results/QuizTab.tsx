import { useState, useMemo } from "react";
import type { StudySet, Subtopic, Question } from "@/types";
import { HelpCircle, RotateCcw, CheckCircle2, XCircle, Trophy } from "lucide-react";

type Selections = Record<string, number | undefined>;

interface QuizTabProps {
  data: StudySet;
}

export function QuizTab({ data }: QuizTabProps) {
  const [activeSubtopic, setActiveSubtopic] = useState(0);
  const [selections, setSelections] = useState<Selections>({});

  const allQuestions = useMemo(() => {
    return data.subtopics.flatMap((subtopic, si) =>
      subtopic.quiz.questions.map((q, qi) => ({ subtopic, subtopicIndex: si, questionIndex: qi, question: q }))
    );
  }, [data]);

  const activeQuestionBase = data.subtopics[activeSubtopic];
  const activeSubtotal = useMemo(() => {
    let total = 0;
    activeQuestionBase?.quiz.questions.forEach((_, qi) => {
      const selected = selections[`${activeSubtopic}:${qi}`];
      if (selected === activeQuestionBase.quiz.questions[qi].correctIndex) total += 1;
    });
    return total;
  }, [activeQuestionBase, activeSubtopic, selections]);

  const globalStats = useMemo(() => {
    let answered = 0;
    let correct = 0;
    allQuestions.forEach(({ subtopicIndex, questionIndex, question }) => {
      const selected = selections[`${subtopicIndex}:${questionIndex}`];
      if (selected !== undefined) {
        answered += 1;
        if (selected === question.correctIndex) correct += 1;
      }
    });
    return { answered, total: allQuestions.length, correct };
  }, [allQuestions, selections]);

  const clearAll = () => setSelections({});
  const clearSubtopic = () => {
    const next: Selections = { ...selections };
    data.subtopics[activeSubtopic].quiz.questions.forEach((_, qi) => {
      delete next[`${activeSubtopic}:${qi}`];
    });
    setSelections(next);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Quiz
            </h3>
            <p className="text-sm text-foreground/60 mt-1">
              {globalStats.answered} of {globalStats.total} answered ·{" "}
              <span className="font-semibold text-accent">{globalStats.correct} correct</span>
            </p>
          </div>
          <button
            onClick={clearAll}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-border active:scale-[0.97] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retake all
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {data.subtopics.map((subtopic, index) => {
            const isActive = index === activeSubtopic;
            const answered = subtopic.quiz.questions.filter((_, qi) => selections[`${index}:${qi}`] !== undefined).length;
            return (
              <button
                key={index}
                onClick={() => setActiveSubtopic(index)}
                className={`relative rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-primary text-on-primary"
                    : "bg-muted text-foreground/70 hover:bg-border border border-border"
                }`}
              >
                {subtopic.title}
                <span className="ml-1.5 opacity-80">
                  ({answered}/{subtopic.quiz.questions.length})
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-foreground">{activeQuestionBase.title}</h4>
          <span className="text-xs font-semibold text-foreground/60">
            Score: {activeSubtotal}/{activeQuestionBase.quiz.questions.length}
          </span>
        </div>

        <div className="space-y-5">
          {activeQuestionBase.quiz.questions.map((q, qi) => (
            <QuizCard
              key={`${activeSubtopic}:${qi}`}
              index={qi}
              question={q}
              selected={selections[`${activeSubtopic}:${qi}`]}
              onSelect={(opt) =>
                setSelections((prev) => ({
                  ...prev,
                  [`${activeSubtopic}:${qi}`]: opt,
                }))
              }
            />
          ))}
        </div>

        {activeSubtotal === activeQuestionBase.quiz.questions.length && activeQuestionBase.quiz.questions.length > 0 && (
          <div className="mt-6 animate-in fade-in slide-in-from-top-1 duration-300 ease-out rounded-xl bg-accent/10 border border-accent/20 p-4 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-accent" />
            <div>
              <p className="font-bold text-foreground">Perfect round!</p>
              <p className="text-sm text-foreground/70">You answered every question in this subtopic correctly.</p>
            </div>
          </div>
        )}

        <button
          onClick={clearSubtopic}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/70 hover:text-foreground transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset this subtopic
        </button>
      </div>
    </div>
  );
}

interface QuizCardProps {
  index: number;
  question: Question;
  selected: number | undefined;
  onSelect: (optionIndex: number) => void;
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
          {isRevealed && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold shrink-0 ${
                selected === correctIndex ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}
            >
              {selected === correctIndex ? (
                <>
                  <CheckCircle2 className="w-3 h-3" /> Correct
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3" /> Incorrect
                </>
              )}
            </span>
          )}
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
                {showCorrect && <span className="text-xs font-bold text-green-700">Correct</span>}
                {showWrong && <span className="text-xs font-bold text-red-700">Your pick</span>}
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
