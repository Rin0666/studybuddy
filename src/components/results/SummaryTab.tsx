import type { StudySet, Model } from "@/types";
import { useDeepDiveExpanded } from "@/components/results/useDeepDiveExpanded";
import { DiveButton, DeepDivePanel } from "@/components/results/DeepDivePanel";
import { BookOpen, Lightbulb } from "lucide-react";

interface SummaryTabProps {
  data: StudySet;
  model: Model;
}

export function SummaryTab({ data, model }: SummaryTabProps) {
  const { isOpen, toggle } = useDeepDiveExpanded();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
      <OverviewSection data={data} model={model} isOpen={isOpen} toggle={toggle} />
      <KeyTakeawaysSection data={data} model={model} isOpen={isOpen} toggle={toggle} />
    </div>
  );
}

function OverviewSection({
  data,
  model,
  isOpen,
  toggle,
}: {
  data: StudySet;
  model: Model;
  isOpen: (key: string) => boolean;
  toggle: (key: string) => void;
}) {
  const paragraphs = data.summary.split(/\n\s*\n/).filter(Boolean);
  const key = "overview";

  return (
    <article className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Overview</h3>
        </div>
        <DiveButton label="Dive deeper" isOpen={isOpen(key)} onClick={() => toggle(key)} />
      </div>
      <div className="space-y-4 text-foreground/80 leading-relaxed">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {isOpen(key) && (
        <div className="mt-5">
          <DeepDivePanel
            topic={data.topic}
            context={data.summary}
            target={data.topic}
            focus="overview"
            difficulty={data.difficulty}
            model={model}
            onClose={() => toggle(key)}
          />
        </div>
      )}
    </article>
  );
}

function KeyTakeawaysSection({
  data,
  model,
  isOpen,
  toggle,
}: {
  data: StudySet;
  model: Model;
  isOpen: (key: string) => boolean;
  toggle: (key: string) => void;
}) {
  return (
    <article className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground">Key Takeaways</h3>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {data.keyTakeaways.map((takeaway, i) => {
          const key = `takeaway:${i}`;

          return (
            <li key={i} className="flex flex-col gap-3 p-3 rounded-xl bg-muted border border-border">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                </div>
                <span className="text-foreground/80 leading-snug flex-1">{takeaway}</span>
              </div>
              <div className="pl-8">
                <DiveButton label="Dive deeper" isOpen={isOpen(key)} onClick={() => toggle(key)} size="sm" />
              </div>
              {isOpen(key) && (
                <div className="pl-8">
                  <DeepDivePanel
                    topic={data.topic}
                    context={[data.summary, ...data.keyTakeaways].join("\n\n")}
                    target={takeaway}
                    focus="key-concept"
                    difficulty={data.difficulty}
                    model={model}
                    onClose={() => toggle(key)}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
