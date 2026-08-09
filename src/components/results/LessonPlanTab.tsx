import type { StudySet, Model } from "@/types";
import { useDeepDiveExpanded } from "@/components/results/useDeepDiveExpanded";
import { DiveButton, DeepDivePanel } from "@/components/results/DeepDivePanel";
import { ListChecks, Target, Layers, GraduationCap, ChevronRight } from "lucide-react";

interface LessonPlanTabProps {
  data: StudySet;
  model: Model;
}

export function LessonPlanTab({ data, model }: LessonPlanTabProps) {
  const { isOpen, toggle } = useDeepDiveExpanded();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
      <article className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Lesson Overview</h3>
        </div>
        <p className="text-foreground/80 leading-relaxed mb-6">
          This roadmap covers <strong className="text-foreground">{data.subtopics.length} subtopics</strong> at the{" "}
          <strong className="text-foreground">{data.difficulty}</strong> level, from core principles to applied practice.
        </p>

        <ul className="space-y-4">
          {data.subtopics.map((subtopic, index) => {
            const subtopicKey = `subtopic:${index}`;

            return (
              <li key={index} className="p-4 rounded-xl bg-muted border border-border">
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                      <h4 className="font-bold text-foreground">{subtopic.title}</h4>
                      <DiveButton
                        label="Dive deeper"
                        isOpen={isOpen(subtopicKey)}
                        onClick={() => toggle(subtopicKey)}
                        size="sm"
                      />
                    </div>
                    <p className="text-sm text-foreground/70 leading-relaxed line-clamp-3">{subtopic.summary}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                        <Target className="w-3 h-3" />
                        {subtopic.objectives.length} objective{subtopic.objectives.length === 1 ? "" : "s"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                        <ListChecks className="w-3 h-3" />
                        {subtopic.keyConcepts.length} concept{subtopic.keyConcepts.length === 1 ? "" : "s"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted-foreground/10 px-2.5 py-1 text-xs font-semibold text-foreground/70">
                        <Layers className="w-3 h-3" />
                        {subtopic.quiz.questions.length} quiz question{subtopic.quiz.questions.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      {subtopic.keyConcepts.map((concept, ci) => {
                        const conceptKey = `subtopic:${index}:concept:${ci}`;

                        return (
                          <div
                            key={ci}
                            className="rounded-xl border border-border bg-white p-3 sm:p-4 transition-shadow hover:shadow-sm"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="flex items-start gap-2 flex-1">
                                <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div>
                                  <h5 className="text-sm font-bold text-foreground">{concept.concept}</h5>
                                  <ul className="mt-1.5 space-y-1">
                                    {concept.details.slice(0, 2).map((detail, di) => (
                                      <li key={di} className="text-xs text-foreground/70 leading-relaxed">
                                        {detail}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                              <DiveButton
                                label="Dive deeper"
                                isOpen={isOpen(conceptKey)}
                                onClick={() => toggle(conceptKey)}
                                size="sm"
                              />
                            </div>
                            {isOpen(conceptKey) && (
                              <div className="mt-3">
                                <DeepDivePanel
                                  topic={data.topic}
                                  context={[
                                    data.summary,
                                    subtopic.title,
                                    subtopic.summary,
                                    concept.concept,
                                    ...concept.details,
                                  ].join("\n\n")}
                                  target={concept.concept}
                                  focus="key-concept"
                                  difficulty={data.difficulty}
                                  model={model}
                                  onClose={() => toggle(conceptKey)}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {isOpen(subtopicKey) && (
                      <div className="mt-4">
                        <DeepDivePanel
                          topic={data.topic}
                          context={[data.summary, subtopic.title, subtopic.summary, ...subtopic.objectives].join("\n\n")}
                          target={subtopic.title}
                          focus="subtopic"
                          difficulty={data.difficulty}
                          model={model}
                          onClose={() => toggle(subtopicKey)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </article>
    </div>
  );
}
