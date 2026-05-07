import { FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";
import type { User } from "../types/domain";
import { api } from "../api/client";

type Props = {
  onLogin: (token: string, user: User) => void;
};

export function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState("owner@example.com");
  const [password, setPassword] = useState("changeme123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.login(email, password);
      onLogin(response.token, response.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login non riuscito");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(45,212,191,0.22),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(251,146,60,0.16),transparent_30%),linear-gradient(145deg,#020617,#0f172a_50%,#111827)]" />
      <div className="relative z-10 grid min-h-screen place-items-center px-4">
        <form
          onSubmit={(event) => void submit(event)}
          className="w-full max-w-md rounded-3xl border border-white/10 bg-white/8 p-6 shadow-2xl shadow-slate-950/60 backdrop-blur-xl"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-100 shadow-glow">
              <LockKeyhole size={22} />
            </div>
            <div>
              <p className="text-lg font-semibold">Agent Dock</p>
              <p className="text-sm text-slate-400">Accesso operativo</p>
            </div>
          </div>

          <label className="block text-sm text-slate-300">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-slate-950/55 px-3 text-sm text-white outline-none transition focus:border-cyan-300/45"
            />
          </label>

          <label className="mt-4 block text-sm text-slate-300">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-slate-950/55 px-3 text-sm text-white outline-none transition focus:border-cyan-300/45"
            />
          </label>

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-300/25 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 h-11 w-full rounded-xl bg-cyan-300 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"
          >
            {loading ? "Accesso..." : "Entra"}
          </button>
        </form>
      </div>
    </main>
  );
}
