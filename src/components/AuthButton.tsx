import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { LogIn, LogOut, User, X, Mail, Loader2, CheckCircle2 } from "lucide-react";

export function AuthButton() {
  const { user, loading, signInWithOtp, signInWithOAuth, signOut, error: authError } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [otpStatus, setOtpStatus] = useState<"idle" | "loading" | "error">("idle");
  const [otpError, setOtpError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-foreground/60">
        <Loader2 className="w-4 h-4 animate-spin" />
      </span>
    );
  }

  if (user) {
    return (
      <div className="relative">
        <button
          ref={triggerRef}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-border cursor-pointer"
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <User className="w-4 h-4 text-primary" />
          <span className="max-w-[8rem] truncate hidden sm:inline">{user.email ?? "Account"}</span>
          <span className="sm:hidden">Account</span>
        </button>
        {open && (
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-title"
            className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-border bg-white p-4 shadow-lg z-50"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 id="account-title" className="font-bold text-foreground">Account</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-muted cursor-pointer" aria-label="Close">
                <X className="w-4 h-4 text-foreground/60" />
              </button>
            </div>
            <p className="text-sm text-foreground/70 mb-4 break-words">{user.email}</p>
            <button
              onClick={async () => {
                await signOut();
                setOpen(false);
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    );
  }

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setOtpStatus("loading");
    setOtpError(null);
    const { error } = await signInWithOtp(email);
    if (error) {
      setOtpStatus("error");
      setOtpError(error.message);
    } else {
      setOtpStatus("idle");
      setEmailSent(true);
    }
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-all hover:bg-secondary active:scale-[0.97] cursor-pointer"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <LogIn className="w-4 h-4" />
        <span className="hidden sm:inline">Sign in</span>
      </button>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="signin-title"
          className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-border bg-white p-5 shadow-lg z-50"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 id="signin-title" className="font-bold text-foreground">Save & share</h3>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-muted cursor-pointer" aria-label="Close">
              <X className="w-4 h-4 text-foreground/60" />
            </button>
          </div>

          {emailSent ? (
            <div className="rounded-xl bg-accent/10 border border-accent/20 p-4 text-center">
              <CheckCircle2 className="w-6 h-6 text-accent mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">Check your inbox</p>
              <p className="text-xs text-foreground/70 mt-1">We emailed a magic link to {email}.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-foreground/70 mb-4">
                Sign in to save lesson plans, get public share links, and invite others by email.
              </p>
              <button
                onClick={async () => {
                  const { error } = await signInWithOAuth("google");
                  if (error) setOtpError(error.message);
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted active:scale-[0.97] cursor-pointer mb-3"
              >
                Continue with Google
              </button>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-foreground/50">or use email</span>
                </div>
              </div>
              <form onSubmit={handleEmail} className="space-y-3">
                <div>
                  <label htmlFor="signin-email" className="sr-only">Email address</label>
                  <input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
                    autoComplete="email"
                  />
                </div>
                <button
                  type="submit"
                  disabled={otpStatus === "loading" || !email}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-all hover:bg-secondary active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {otpStatus === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Mail className="w-4 h-4" />
                  Send magic link
                </button>
                {(otpError || authError) && (
                  <p className="text-xs text-destructive">{otpError || authError}</p>
                )}
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
