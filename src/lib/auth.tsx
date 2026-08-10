import { createContext, useCallback, useContext, useEffect, useState } from "react";
import supabase from "./supabase";
import type { User, AuthError, Provider } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  signInWithPassword: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null; needsEmailConfirmation?: boolean }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
  signInWithOtp: (email: string) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (provider: Provider) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  clearError: () => void;
}

const AuthContext = createContext<(AuthState & AuthActions) | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setError(error.message);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      const isRateLimit =
        error.status === 429 || error.message.toLowerCase().includes("rate limit");
      setError(
        isRateLimit
          ? "Too many confirmation emails have been requested. Please wait and try again, or ask the project owner to configure custom SMTP in Supabase."
          : error.message
      );
      return { error };
    }
    return { error: null, needsEmailConfirmation: !data.session };
  }, []);

  const signInWithOtp = useCallback(async (email: string) => {
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) setError(error.message);
    return { error };
  }, []);

  const resetPasswordForEmail = useCallback(async (email: string) => {
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      const isRateLimit =
        error.status === 429 || error.message.toLowerCase().includes("rate limit");
      setError(
        isRateLimit
          ? "Too many password-reset emails have been requested. Please wait before trying again."
          : error.message
      );
    }
    return { error };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    return { error };
  }, []);

  const signInWithOAuth = useCallback(async (provider: Provider) => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    const { error } = await supabase.auth.signOut();
    if (error) setError(error.message);
    return { error };
  }, []);

  const clearError = useCallback(() => setError(null), []);
  const isAdmin = user?.app_metadata?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, error, signInWithPassword, signUp, resetPasswordForEmail, updatePassword, signInWithOtp, signInWithOAuth, signOut, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useIsAuthenticated(): boolean {
  const { user, loading } = useAuth();
  return !loading && !!user;
}
