import { useState } from "react";
import { useSavedStudySets } from "@/hooks/useSavedStudySets";
import type { StudySet, Model } from "@/types";
import { Share2, Link2, Loader2, Copy, CheckCircle2, Users, X, AlertCircle } from "lucide-react";

interface SharePanelProps {
  studySet: StudySet;
  model?: Model;
  savedId?: string;
}

export function SharePanel({ studySet, model, savedId }: SharePanelProps) {
  const { save, saveStatus, saveError, share, shareStatus, shareError } = useSavedStudySets();
  const [result, setResult] = useState<Awaited<ReturnType<typeof share>> | null>(null);
  const [emailsRaw, setEmailsRaw] = useState("");
  const [copied, setCopied] = useState(false);

  const isBusy = saveStatus === "loading" || shareStatus === "loading";

  const handleShare = async () => {
    setResult(null);
    let id = savedId;

    if (!id) {
      const saved = await save(studySet, model);
      if (!saved) return;
      id = saved.id;
    }

    const emails = emailsRaw
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter(Boolean);

    const res = await share(id, emails);
    if (res) setResult(res);
  };

  const copyLink = async () => {
    if (!result?.url) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
      <div className="flex items-start gap-3 mb-2">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
          <Share2 className="w-5 h-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold text-foreground">Share this lesson</h3>
          <p className="text-sm text-foreground/70 mt-1">
            Save it to your account, then get a public link or invite people by email.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <label htmlFor="share-emails" className="block text-sm font-semibold text-foreground mb-2">
            Invite by email
          </label>
          <textarea
            id="share-emails"
            value={emailsRaw}
            onChange={(e) => setEmailsRaw(e.target.value)}
            placeholder=" colleague@school.edu, friend@example.com"
            rows={3}
            className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <p className="text-xs text-foreground/50 mt-1.5 flex items-center gap-1">
            <Users className="w-3 h-3" />
            Separate multiple emails with commas or new lines. Leave blank to create a link only.
          </p>
        </div>

        {(saveError || shareError) && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {saveError || shareError}
          </div>
        )}

        <button
          onClick={handleShare}
          disabled={isBusy}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary transition-all hover:bg-secondary active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
          {savedId ? "Update & share" : "Save & share"}
        </button>

        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out rounded-xl bg-muted border border-border p-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Public link</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={result.url}
                  className="flex-1 rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={copyLink}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted active:scale-[0.97] cursor-pointer"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {result.recipients.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-foreground/70 mb-2">Invites</label>
                <ul className="space-y-2">
                  {result.recipients.map((r) => (
                    <li key={r.email} className="flex items-center justify-between text-sm">
                      <span className="text-foreground/80">{r.email}</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          r.status === "invited"
                            ? "bg-accent/10 text-accent"
                            : r.status === "skipped"
                            ? "bg-muted text-foreground/60"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {r.status === "invited" ? <CheckCircle2 className="w-3 h-3" /> : r.status === "skipped" ? null : <X className="w-3 h-3" />}
                        {r.status}
                        {r.message && <span className="sr-only">: {r.message}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
