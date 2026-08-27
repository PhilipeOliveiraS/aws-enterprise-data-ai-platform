import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";

type Mode = "login" | "register";

export function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === "login";

  const switchMode = () => {
    setMode(isLogin ? "register" : "login");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation before hitting the API.
    const trimmedEmail = email.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!isLogin && displayName.trim() === "") {
      setError("Display name is required.");
      return;
    }

    if (isLogin) {
      if (password === "") {
        setError("Password is required.");
        return;
      }
    } else if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setSubmitting(true);
    try {
      if (isLogin) {
        await login(trimmedEmail, password);
      } else {
        await register(trimmedEmail, password, displayName.trim());
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to reach the server. Is the API running?");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative z-10 flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl border border-neon-cyan/40 bg-cyan-500/10 shadow-neon-cyan">
            <span className="text-2xl font-black text-neon-cyan-soft">T</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Tas<span className="text-neon-cyan-soft">Kiro</span>
          </h1>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Enterprise Task Command
          </p>
        </div>

        <div className="glass glass-cyan animate-pop-in rounded-2xl p-6 shadow-[0_0_40px_-10px_rgba(34,211,238,0.35)]">
          {/* Mode toggle */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-slate-800/70 bg-slate-900/50 p-1">
            <button
              type="button"
              onClick={() => !isLogin && switchMode()}
              className={`rounded-lg py-2 text-sm font-semibold transition ${
                isLogin
                  ? "bg-cyan-500/15 text-neon-cyan-soft shadow-neon-cyan"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => isLogin && switchMode()}
              className={`rounded-lg py-2 text-sm font-semibold transition ${
                !isLogin
                  ? "bg-fuchsia-500/15 text-neon-magenta-soft shadow-neon-magenta"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label
                  htmlFor="displayName"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
                >
                  Display Name
                </label>
                <input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required={!isLogin}
                  placeholder="Neo Anderson"
                  className="w-full rounded-lg border border-slate-800/70 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 transition focus:border-neon-cyan/50"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@taskiro.io"
                className="w-full rounded-lg border border-slate-800/70 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 transition focus:border-neon-cyan/50"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isLogin ? "current-password" : "new-password"}
                placeholder={isLogin ? "••••••••" : "At least 8 characters"}
                className="w-full rounded-lg border border-slate-800/70 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 transition focus:border-neon-cyan/50"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${
                isLogin
                  ? "border-neon-cyan/50 bg-cyan-500/10 text-neon-cyan-soft shadow-neon-cyan hover:bg-cyan-500/20"
                  : "border-neon-magenta/50 bg-fuchsia-500/10 text-neon-magenta-soft shadow-neon-magenta hover:bg-fuchsia-500/20"
              }`}
            >
              {submitting
                ? "Authenticating…"
                : isLogin
                  ? "Enter the Grid"
                  : "Create Account"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-600">
          {isLogin ? "No account yet?" : "Already registered?"}{" "}
          <button
            type="button"
            onClick={switchMode}
            className="font-semibold text-neon-cyan-soft hover:underline"
          >
            {isLogin ? "Register here" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
