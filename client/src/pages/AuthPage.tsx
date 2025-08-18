import { useState } from "react";
import { supabase } from "../supabaseClient";

const AuthPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const authMethod =
      authMode === "login"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          });

    const { error } = await authMethod;

    if (error) {
      setMessage({ text: error.message, type: "error" });
    } else if (authMode === "signup") {
      setMessage({
        text: "Signup successful! Check your email for a verification link.",
        type: "success",
      });
    }
    // For successful login, onAuthStateChange in App.tsx will handle the redirect.

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent mb-2">
            CodeCollab
          </h1>
          <p className="text-lg text-slate-300">
            Real-time collaborative code editor
          </p>
        </div>

        <div className="bg-slate-800/70 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden border border-slate-700">
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setAuthMode("login")}
              className={`flex-1 py-3 px-6 text-center font-medium transition-all duration-200 ${
                authMode === "login"
                  ? "text-purple-400 border-b-2 border-purple-400 bg-slate-700/50"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthMode("signup")}
              className={`flex-1 py-3 px-6 text-center font-medium transition-all duration-200 ${
                authMode === "signup"
                  ? "text-purple-400 border-b-2 border-purple-400 bg-slate-700/50"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
              }`}
            >
              Sign Up
            </button>
          </div>

          {message && (
            <div
              className={`p-4 text-center text-sm ${
                message.type === "error"
                  ? "bg-red-900/50 text-red-300"
                  : "bg-green-900/50 text-green-300"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="p-8">
            <form className="space-y-6" onSubmit={handleAuth}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full px-3 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full px-3 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg font-medium text-white transition-all duration-200"
                disabled={loading}
              >
                {loading
                  ? "Processing..."
                  : authMode === "login"
                  ? "Sign In"
                  : "Create Account"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
