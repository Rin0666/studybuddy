import { useState } from "react";
import { useSavedStudySets } from "@/hooks/useSavedStudySets";
import type { ShareVisibility } from "@/lib/studySets";
import type { StudySet, Model } from "@/types";
import { Share2, Link2, Loader2, Copy, CheckCircle2, Users, X, AlertCircle, Save, Globe2, LockKeyhole } from "lucide-react";

interface SharePanelProps {
  studySet: StudySet;
  model?: Model;
  savedId?: string;
}

export function SharePanel({ studySet, model, savedId }: SharePanelProps) {
  const { save, saveStatus, saveError, share, shareStatus, shareError } = useSavedStudySets();
  const [result, setResult] = useState<Awaited<ReturnType<typeof share>> | null>(null);
  const [emailsRaw, setEmailsRaw] = useState("");
  const [visibility, setVisibility] = useState<ShareVisibility>("private");
  const [copied, setCopied] = useState(false);
  const [savedStudySetId, setSavedStudySetId] = useState(savedId);
  const [savedPrivately, setSavedPrivately] = useState(false);

  const isBusy = saveStatus === "loading" || shareStatus === "loading";

  const persistStudySet = async () => {
    const saved = await save(studySet, model, savedStudySetId);
    if (saved) setSavedStudySetId(saved.id);
    return saved;
  };

  const handleSavePrivate = async () => {
    setResult(null);
    setSavedPrivately(false);
    const saved = await persistStudySet();
    if (saved) setSavedPrivately(true);
  };

  const handleShare = async () => {
    setResult(null);
    setSavedPrivately(false);
    const saved = await persistStudySet();
    if (!saved) return;

    const emails = emailsRaw
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter(Boolean);

    const res = await share(saved.id, emails, visibility);
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
          <h3 className="text-lg font-bold text-foreground">Save or share this lesson</h3>
          <p className="text-sm text-foreground/70 mt-1">
            Choose who can access the lesson, then optionally invite people by email.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <fieldset>
          <legend className="block text-sm font-semibold text-foreground mb-2">Lesson visibility</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setVisibility("private")}
              aria-pressed={visibility === "private"}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                visibility === "private"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-white hover:bg-muted"
              }`}
            >
              <LockKeyhole className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <span>
                <span className="block text-sm font-bold text-foreground">Private</span>
                <span className="block text-xs text-foreground/60 mt-1">Only you and invited emails can access it.</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setVisibility("public")}
              aria-pressed={visibility === "public"}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                visibility === "public"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-white hover:bg-muted"
              }`}
            >
              <Globe2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <span>
                <span className="block text-sm font-bold text-foreground">Public</span>
                <span className="block text-xs text-foreground/60 mt-1">Anyone with the generated link can access it.</span>
              </span>
            </button>
          </div>
        </fieldset>

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
            {visibility === "public"
              ? "Separate multiple emails with commas or new lines. Email invitations are optional."
              : "Separate multiple emails with commas or new lines. Only these recipients will see the shared lesson."}
          </p>
        </div>

        {(saveError || shareError) && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {saveError || shareError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleSavePrivate}
            disabled={isBusy}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-6 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {saveStatus === "loading" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : savedPrivately ? (
              <CheckCircle2 className="w-4 h-4 text-accent" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {savedPrivately ? "Saved privately" : savedStudySetId ? "Update private copy" : "Save privately"}
          </button>

          <button
            onClick={handleShare}
            disabled={isBusy}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary transition-all hover:bg-secondary active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : visibility === "public" ? (
              <Link2 className="w-4 h-4" />
            ) : (
              <LockKeyhole className="w-4 h-4" />
            )}
            {visibility === "public" ? "Save as public" : "Share privately"}
          </button>
        </div>

        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out rounded-xl bg-muted border border-border p-4 space-y-4">
            {result.url ? (
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
            ) : (
              <div className="flex items-start gap-2 text-sm text-foreground/75">
                <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                Private sharing is active. No public link can access this lesson.
              </div>
            )}

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
