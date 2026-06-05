import React, { useState } from "react";
import { authController } from "../storage";
import { AppUser } from "../types";
import { Mail, Lock, User, Key, Database, ShieldAlert, FileText, ArrowRight } from "lucide-react";

interface AuthScreenProps {
  onAuthSuccess: (user: AppUser) => void;
  isCloudSyncActive: boolean;
}

export default function AuthScreen({ onAuthSuccess, isCloudSyncActive }: AuthScreenProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isRegister && !name)) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        const user = await authController.register(email, password, name);
        onAuthSuccess(user);
      } else {
        const user = await authController.login(email, password);
        onAuthSuccess(user);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err?.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSandboxLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await authController.loginWithOAuthSandbox();
      onAuthSuccess(user);
    } catch (err: any) {
      console.error("OAuth sandbox login failure:", err);
      setError(err?.message || "Federated authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50 dark:bg-black text-black dark:text-zinc-100 font-sans transition-colors duration-250">
      <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-2xl shadow-xs p-8 md:p-10 space-y-8 relative">
        
        {/* UPPER STATUS DECORATION */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-7 w-7 flex items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black font-semibold text-xs leading-none">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-550 dark:text-zinc-400 font-medium">
              CV.MATCH_
            </span>
          </div>
          
          <div className="flex items-center">
            {isCloudSyncActive ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-mono tracking-wider uppercase bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                <Database className="w-2.5 h-2.5 mr-1" />
                Cloud sync active
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-mono tracking-wider uppercase bg-zinc-150 text-zinc-630 dark:bg-zinc-900 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                <Database className="w-2.5 h-2.5 mr-1 text-zinc-400" />
                Local sandbox
              </span>
            )}
          </div>
        </div>

        {/* LOGO AND TITLE */}
        <div className="space-y-2 mt-2">
          <h2 className="font-display text-2xl font-bold tracking-tight text-black dark:text-white">
            {isRegister ? "Create workspace credentials" : "Sign in to workspace"}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[320px]">
            Parse resumes, analyze ATS keyword compliance against targets, and simulate critical interview prep.
          </p>
        </div>

        {/* ERROR STATUS CARD WITH GRACEFUL LOCAL BYPASS */}
        {error && (
          <div className="p-4 text-xs rounded-xl border leading-relaxed text-left space-y-3 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200">
            <div className="flex items-center space-x-1.5 font-bold text-red-600 dark:text-red-400">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Authentication Problem</span>
            </div>
            <p className="font-medium text-zinc-650 dark:text-zinc-300">{error}</p>
            {isCloudSyncActive && (
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem("ai_resume_analyzer_use_cloud_sync", "false");
                  window.location.reload();
                }}
                className="w-full py-2 text-[10px] font-bold tracking-wide uppercase text-zinc-100 bg-black hover:bg-zinc-900 dark:text-black dark:bg-white dark:hover:bg-zinc-100 rounded-lg transition-all flex items-center justify-center cursor-pointer shadow-xs"
              >
                Run offline in local storage
              </button>
            )}
          </div>
        )}

        {/* SUBMIT FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-500 block">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Athena Vance"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white text-black placeholder-zinc-400 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-600 focus:outline-hidden focus:border-black dark:focus:border-zinc-300 focus:ring-0 transition-all font-mono"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-500 block">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="athena@workspace.io"
                required
                className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white text-black placeholder-zinc-400 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-600 focus:outline-hidden focus:border-black dark:focus:border-zinc-300 focus:ring-0 transition-all font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-500 block">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white text-black placeholder-zinc-400 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-600 focus:outline-hidden focus:border-black dark:focus:border-zinc-300 focus:ring-0 transition-all font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 text-xs font-mono font-bold tracking-wider uppercase text-white bg-black hover:bg-zinc-900 dark:text-black dark:bg-white dark:hover:bg-zinc-100 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 rounded-lg transition-all flex items-center justify-center space-x-2 cursor-pointer border border-transparent dark:border-transparent"
          >
            {loading ? (
              <span>Executing Auth_</span>
            ) : isRegister ? (
              <span>Register credentials</span>
            ) : (
              <span>Access workspace</span>
            )}
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </form>

        {/* OAUTH SANDBOX */}
        <div className="relative flex py-2 items-center">
          <div className="grow border-t border-zinc-200 dark:border-zinc-900"></div>
          <span className="shrink mx-3 text-[10px] font-mono text-zinc-400 dark:text-zinc-550 uppercase tracking-widest">
            OR GATEWAY
          </span>
          <div className="grow border-t border-zinc-200 dark:border-zinc-900"></div>
        </div>

        <button
          onClick={handleOAuthSandboxLogin}
          disabled={loading}
          className="w-full py-2.5 text-xs font-mono font-semibold rounded-lg border border-zinc-300 dark:border-zinc-800 text-black dark:text-zinc-300 bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all flex items-center justify-center space-x-2 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Federated OAuth sandbox</span>
        </button>

        {/* TOGGLE SESSIONS */}
        <div className="text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs font-mono font-medium hover:underline text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-all cursor-pointer"
          >
            {isRegister
              ? "Existing account? Sign in here"
              : "Register dynamic local credentials"}
          </button>
        </div>

      </div>
    </div>
  );
}
