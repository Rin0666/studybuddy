import { useState } from "react";
import { scopeSchema, modelSchema, type Scope, type Model, type GeneratorStatus } from "@/types";
import { Loader2, AlertCircle } from "lucide-react";

export interface GenerateFormRequest {
  topic: string;
  scope: Scope;
  model: Model;
}

const SCOPES: { value: Scope; label: string; description: string }[] = [
  { value: "Quick", label: "Quick", description: "core essentials" },
  { value: "Standard", label: "Standard", description: "balanced major coverage" },
  { value: "Comprehensive", label: "Comprehensive", description: "all important learning areas" },
];

const MODELS: { value: Model; label: string }[] = [
  { value: "Qwen/Qwen2.5-7B-Instruct", label: "Qwen 2.5 7B (balanced)" },
  { value: "Qwen/Qwen3-32B", label: "Qwen 3 32B (smarter)" },
  { value: "meta-llama/Meta-Llama-3.1-70B-Instruct", label: "Llama 3.1 70B (most capable)" },
];

interface GenerateFormProps {
  status: GeneratorStatus;
  error: string | null;
  onGenerate: (request: GenerateFormRequest) => void;
}

export function GenerateForm({ status, error, onGenerate }: GenerateFormProps) {
  const [topic, setTopic] = useState("");
  const [scope, setScope] = useState<Scope>("Standard");
  const [model, setModel] = useState<Model>("Qwen/Qwen2.5-7B-Instruct");
  const [touched, setTouched] = useState(false);

  const isLoading = status === "loading";
  const topicError = touched && !topic.trim() ? "Please enter a topic to study." : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!topic.trim()) return;

    onGenerate({
      topic: topic.trim(),
      scope: scopeSchema.parse(scope),
      model: modelSchema.parse(model),
    });
  };

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="text-center mb-10">
        <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-5">
          Turn any topic into a complete study guide
        </h2>
        <p className="text-lg text-foreground/70 max-w-xl mx-auto leading-relaxed">
          Choose how broad your guide should be, from a quick foundation to a comprehensive overview.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-border shadow-sm p-6 sm:p-8 flex flex-col gap-6"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="topic" className="text-sm font-semibold text-foreground">
            What do you want to learn about?
          </label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onBlur={() => setTouched(true)}
            disabled={isLoading}
            placeholder="e.g. Photosynthesis, The French Revolution, Quantum mechanics"
            className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary disabled:opacity-60"
          />
          {topicError && <span className="text-sm text-destructive">{topicError}</span>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="scope" className="text-sm font-semibold text-foreground">
              Scope
            </label>
            <select
              id="scope"
              value={scope}
              onChange={(e) => setScope(e.target.value as Scope)}
              disabled={isLoading}
              className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary disabled:opacity-60 appearance-none cursor-pointer"
            >
              {SCOPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} — {option.description}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="model" className="text-sm font-semibold text-foreground">
              AI model
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value as Model)}
              disabled={isLoading}
              className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary disabled:opacity-60 appearance-none cursor-pointer"
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-destructive">Generation failed</p>
              <p className="text-sm text-destructive/90">{error}</p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-on-primary font-bold shadow-sm transition-all duration-200 hover:bg-secondary hover:shadow active:scale-[0.97] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Building your study materials…
            </>
          ) : (
            "Generate In-Depth Study Guide"
          )}
        </button>
      </form>
    </section>
  );
}
