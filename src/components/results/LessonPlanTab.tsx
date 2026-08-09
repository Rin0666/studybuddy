import type { StudySet } from "@/types";
import { ListChecks, Target, Layers, GraduationCap } from "lucide-react";

interface LessonPlanTabProps {
  data: StudySet;
}

export function LessonPlanTab({ data }: LessonPlanTabProps) {
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
          {data.subtopics.map((subtopic, index) => (
            <li key={index} className="flex items-start gap-4 p-4 rounded-xl bg-muted border border-border">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
                {index + 1}
              </span>
              <div className="min-w-0">
                <h4 className="font-bold text-foreground">{subtopic.title}</h4>
                <p className="text-sm text-foreground/70 mt-1 leading-relaxed line-clamp-3">{subtopic.summary}</p>

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
              </div>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
