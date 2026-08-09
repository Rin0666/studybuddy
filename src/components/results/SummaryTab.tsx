import type { StudySet } from "@/types";
import { BookOpen, Lightbulb } from "lucide-react";

interface SummaryTabProps {
  data: StudySet;
}

export function SummaryTab({ data }: SummaryTabProps) {
  const paragraphs = data.summary.split(/\n\s*\n/).filter(Boolean);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
      <article className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Overview</h3>
        </div>
        <div className="space-y-4 text-foreground/80 leading-relaxed">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </article>

      <article className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Key Takeaways</h3>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.keyTakeaways.map((takeaway, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              </div>
              <span className="text-foreground/80 leading-snug">{takeaway}</span>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
