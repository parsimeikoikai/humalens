"use client";

import { useEffect, useState } from "react";

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
  /** Why the user was sent here — e.g. an expired session, or a search
   *  that needs an account. Shown above the form. */
  notice?: string;
}

type AuthMode = "login" | "register" | "forgot";

// Matches the minimum the API enforces on /auth/register. Validating a
// shorter password here only to have the server reject it is worse than
// not validating at all.
const MIN_PASSWORD_LENGTH = 8;

export default function AuthModal({
  isOpen,
  onClose,
  onAuth,
  defaultTab = "login",
  notice = "",
}: AuthModalProps) {
  const [tab, setTab] = useState<AuthMode>(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // NOTE: `defaultTab` is only read as initial state, which is why the
  // caller remounts this modal (via a `key`) whenever the requested tab
  // changes. Without that, opening "Sign Up" after having opened "Sign In"
  // once would keep showing the sign-in tab.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
    if (tab === "register" && form.password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
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

          {notice && (
            <p className="mb-5 text-sm text-foreground bg-accent/8 border border-accent/25 rounded-lg px-3 py-2">
              {notice}
            </p>
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
                  placeholder={
                    tab === "register"
                      ? `At least ${MIN_PASSWORD_LENGTH} characters`
                      : "••••••••"
                  }
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
