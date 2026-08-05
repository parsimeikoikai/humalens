"use client";

import { useState } from "react";

import { X, Mail, Lock, User, Eye, EyeOff, Zap } from "lucide-react";

import {
  useForgotPasswordMutation,
  useLoginMutation,
  useRegisterMutation,
  type AuthResponse,
  type ForgotPasswordRequest,
  type LoginRequest,
  type RegisterRequest,
} from "@/app/services/api/authApi";
import { setAuthToken } from "@/app/lib/auth/token";


interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuth: (user: { name: string; email: string }) => void;
  defaultTab?: "login" | "register";
}

type AuthMode = "login" | "register" | "forgot";

export default function AuthModal({
  isOpen,
  onClose,
  onAuth,
  defaultTab = "login",
}: AuthModalProps) {
  const [tab, setTab] = useState<AuthMode>(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [login, { isLoading: isLoginApiLoading }] = useLoginMutation();
  const [register, { isLoading: isRegisterApiLoading }] =
    useRegisterMutation();
  const [forgotPassword, { isLoading: isForgotPasswordApiLoading }] =
    useForgotPasswordMutation();

  if (!isOpen) return null;


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.email) {
      setError("Please enter your email address.");
      return;
    }
    if (tab !== "forgot" && !form.password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (tab === "register" && !form.name) {
      setError("Please enter your name.");
      return;
    }
    if (tab !== "forgot" && form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setIsLoading(true);

      const completeAuth = (res: AuthResponse) => {
        // Persist the JWT first — every authenticated request reads it from
        // storage, so it has to be there before the UI renders as signed in.
        setAuthToken(res.access_token);

        onAuth({
          name: res.full_name || res.email.split("@")[0],
          email: res.email,
        });
        onClose();
      };

      if (tab === "login") {
        const payload: LoginRequest = {
          email: form.email,
          password: form.password,
        };

        completeAuth(await login(payload).unwrap());
        return;
      }

      if (tab === "forgot") {
        const payload: ForgotPasswordRequest = {
          email: form.email,
        };

        const res = await forgotPassword(payload).unwrap();
        setForm((currentForm) => ({
          ...currentForm,
          password: "",
        }));
        setTab("login");
        setSuccess(
          res.message ||
            "If an account exists for that email, password reset instructions will be sent."
        );
        return;
      }

      const payload: RegisterRequest = {
        email: form.email,
        password: form.password,
        full_name: form.name,
      };

      // Registration already returns a token, so sign the user straight in
      // rather than bouncing them back to the login tab.
      completeAuth(await register(payload).unwrap());
    } catch (err) {
      const message =
        // RTK Query/Fetch errors usually land here
        (err as { data?: { detail?: string; message?: string } })?.data
          ?.detail ??
        (err as { data?: { detail?: string; message?: string } })?.data
          ?.message ??
        // fallback
        "Authentication failed. Please check your credentials.";

      setError(message);

    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Top accent strip */}
        <div className="h-1 bg-gradient-to-r from-accent via-accent/70 to-accent/40" />

        <div className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
                  <Zap className="w-4 h-4 text-accent-foreground" />
                </div>
                <span className="font-semibold text-foreground">Humalens</span>
              </div>
              <h2 className="text-2xl font-semibold text-foreground">
                {tab === "login"
                  ? "Welcome back"
                  : tab === "register"
                    ? "Create your account"
                    : "Reset your password"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {tab === "login"
                  ? "Sign in to access your knowledge bases"
                  : tab === "register"
                    ? "Start querying your documents with AI"
                    : "Enter your email to request reset instructions"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab switcher */}
          {tab !== "forgot" && (
            <div className="flex bg-secondary rounded-xl p-1 mb-6">
              {(["login", "register"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTab(t);
                    setError("");
                    setSuccess("");
                  }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                    tab === t
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "login" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>
          )}

          {tab === "forgot" && (
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setError("");
                setSuccess("");
              }}
              className="mb-6 text-sm text-accent hover:underline font-medium"
            >
              Back to sign in
            </button>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "register" && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Full Name
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                    aria-hidden
                  />
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Jane Smith"
                    className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl bg-background
                               focus:outline-none focus:ring-2 focus:ring-ring text-foreground
                               placeholder:text-muted-foreground text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                  aria-hidden
                />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="jane@company.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl bg-background
                             focus:outline-none focus:ring-2 focus:ring-ring text-foreground
                             placeholder:text-muted-foreground text-sm"
                />
              </div>
            </div>

            {tab !== "forgot" && (
              <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-foreground">Password</label>
                {tab === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setTab("forgot");
                      setError("");
                      setSuccess("");
                      setForm((currentForm) => ({
                        ...currentForm,
                        password: "",
                      }));
                    }}
                    className="text-xs text-accent hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                  aria-hidden
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={tab === "register" ? "At least 6 characters" : "••••••••"}
                  className="w-full pl-10 pr-10 py-2.5 border border-border rounded-xl bg-background
                             focus:outline-none focus:ring-2 focus:ring-ring text-foreground
                             placeholder:text-muted-foreground text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {success && (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={
                isLoading ||
                isLoginApiLoading ||
                isRegisterApiLoading ||
                isForgotPasswordApiLoading
              }

              className="w-full py-2.5 bg-accent text-accent-foreground rounded-xl font-medium
                         hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed
                         transition-all flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                  {tab === "login"
                    ? "Signing in..."
                    : tab === "register"
                      ? "Creating account..."
                      : "Sending instructions..."}
                </>
              ) : tab === "login" ? (
                "Sign In"
              ) : tab === "forgot" ? (
                "Send Reset Instructions"
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Divider */}
          {tab !== "forgot" && (
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or continue with</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          {/* Social placeholder */}
          {tab !== "forgot" && (
            <div className="grid grid-cols-2 gap-3">
            {["Google", "GitHub"].map((provider) => (
              <button
                key={provider}
                type="button"
                className="flex items-center justify-center gap-2 py-2.5 border border-border rounded-xl
                           text-sm text-foreground hover:bg-secondary transition-all"
              >
                {provider === "Google" ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                )}
                {provider}
              </button>
            ))}
            </div>
          )}

          {tab !== "forgot" && (
            <p className="text-center text-xs text-muted-foreground mt-5">
              {tab === "login" ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setTab(tab === "login" ? "register" : "login");
                  setError("");
                  setSuccess("");
                }}
                className="text-accent hover:underline font-medium"
              >
                {tab === "login" ? "Sign up free" : "Sign in"}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
