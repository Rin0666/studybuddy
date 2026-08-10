import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Eye, EyeOff, ArrowLeft, Mail, Lock, CheckCircle2 } from "lucide-react";

export default function SignupPage() {
  const { user, loading, signUp, error, clearError } = useAuth();
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const validate = (): boolean => {
    const errors: { email?: string; password?: string; confirmPassword?: string } = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = "Enter your email address";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = "Enter a valid email address";
    }
    if (!password) {
      errors.password = "Create a password";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!validate()) return;
    setIsSubmitting(true);
    const { error: signUpError, needsEmailConfirmation } = await signUp(email.trim(), password);
    setIsSubmitting(false);
    if (!signUpError) {
      if (needsEmailConfirmation) {
        setIsSuccess(true);
      } else {
        navigate("/", { replace: true });
      }
    }
  };

  const handleBlur = (field: "email" | "password" | "confirmPassword") => {
    const next = { ...fieldErrors };
    if (field === "email") {
      const trimmed = email.trim();
      if (!trimmed) next.email = "Enter your email address";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) next.email = "Enter a valid email address";
      else delete next.email;
    }
    if (field === "password") {
      if (!password) next.password = "Create a password";
      else if (password.length < 8) next.password = "Password must be at least 8 characters";
      else delete next.password;
      if (confirmPassword && password !== confirmPassword) next.confirmPassword = "Passwords do not match";
      else if (confirmPassword && password === confirmPassword) delete next.confirmPassword;
    }
    if (field === "confirmPassword") {
      if (password !== confirmPassword) next.confirmPassword = "Passwords do not match";
      else delete next.confirmPassword;
    }
    setFieldErrors(next);
  };

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground/70 hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-65px)] items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-on-primary mb-4">
              <Sparkles className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
              Create your account
            </h1>
            <p className="text-foreground/70">
              Start saving study sets and tracking your progress.
            </p>
          </div>

          {isSuccess ? (
            <div className="bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-md text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-bold">Confirm your email</h2>
              <p className="text-foreground/70">
                We sent a confirmation link to{" "}
                <strong className="text-foreground">{email.trim()}</strong>. Check your inbox and click the link to activate your account.
              </p>
              <Button
                asChild
                className="w-full h-11 bg-primary hover:bg-primary/90 text-on-primary font-semibold"
              >
                <Link to="/login">Go to log in</Link>
              </Button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-5 bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-md"
              noValidate
            >
              {error && (
                <div
                  role="alert"
                  className="rounded-lg bg-destructive/10 text-destructive px-4 py-3 text-sm font-medium"
                >
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" aria-hidden="true" />
                  <Input
                    id="email"
                    ref={emailRef}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => handleBlur("email")}
                    className="pl-10 h-11"
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? "email-error" : undefined}
                  />
                </div>
                {fieldErrors.email && (
                  <p id="email-error" className="text-sm text-destructive">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" aria-hidden="true" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => handleBlur("password")}
                    className="pl-10 pr-10 h-11"
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? "password-error" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p id="password-error" className="text-sm text-destructive">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" aria-hidden="true" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => handleBlur("confirmPassword")}
                    className="pl-10 pr-10 h-11"
                    aria-invalid={!!fieldErrors.confirmPassword}
                    aria-describedby={fieldErrors.confirmPassword ? "confirm-password-error" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p id="confirm-password-error" className="text-sm text-destructive">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 text-on-primary font-semibold transition-all active:scale-[0.98]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>

              <p className="text-center text-sm text-foreground/70">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-primary hover:underline cursor-pointer"
                >
                  Log in
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
