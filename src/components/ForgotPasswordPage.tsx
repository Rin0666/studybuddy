import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const { resetPasswordForEmail, error, clearError } = useAuth();
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    clearError();
    emailRef.current?.focus();
  }, [clearError]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    const trimmedEmail = email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFieldError("Enter a valid email address");
      return;
    }

    setFieldError(null);
    setIsSubmitting(true);
    const { error: resetError } = await resetPasswordForEmail(trimmedEmail);
    setIsSubmitting(false);
    if (!resetError) setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground/70 hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-65px)] items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-on-primary mb-4">
              <Sparkles className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Reset your password</h1>
            <p className="text-foreground/70">We’ll email you a secure password-reset link.</p>
          </div>

          {submitted ? (
            <div className="bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-md text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-accent mx-auto" />
              <h2 className="text-xl font-bold">Check your email</h2>
              <p className="text-sm text-foreground/70">
                If an account exists for <strong className="text-foreground">{email.trim()}</strong>, a reset link has been sent.
              </p>
              <Button asChild className="w-full">
                <Link to="/login">Return to login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-md" noValidate>
              {error && <div role="alert" className="rounded-lg bg-destructive/10 text-destructive px-4 py-3 text-sm font-medium">{error}</div>}

              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" aria-hidden="true" />
                  <Input
                    id="reset-email"
                    ref={emailRef}
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="pl-10 h-11"
                    aria-invalid={!!fieldError}
                  />
                </div>
                {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
              </div>

              <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {isSubmitting ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
