"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readJsonOrThrow } from "@/lib/client/http";

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [token, setToken] = useState("");
  const [failed, setFailed] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFailed(false);
    setErrorDetail(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, token }),
      });
      const data = await readJsonOrThrow<{
        message?: string;
        error?: string;
        code?: string;
      }>(res);
      if (data.message === "success") {
        router.push("/");
        router.refresh();
        return;
      }
      setFailed(true);
    } catch (e) {
      setFailed(true);
      if (e instanceof Error) {
        setErrorDetail(e.message);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-zinc-100 px-4 py-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-md shadow-zinc-200/40 ring-1 ring-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-zinc-950/80 dark:ring-zinc-800/50">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Sign in
        </h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Use the same username and password as the main application.
        </p>

        {failed ? (
          <div
            className="mt-4 rounded-md bg-red-50 px-3 py-2 text-left text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
            role="alert"
          >
            {errorDetail ? (
              <>
                <p className="font-medium">Server configuration is incomplete.</p>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-red-900/90 dark:text-red-100/90">
                  {errorDetail}
                </p>
                {errorDetail.includes("IRON_SESSION_PASSWORD") ? (
                  <p className="mt-2 text-xs text-red-800/80 dark:text-red-200/80">
                    This refers to a secret in your <code className="rounded bg-red-100/80 px-1 dark:bg-red-900/60">.env</code> file, not
                    the password you use to sign in.
                  </p>
                ) : null}
              </>
            ) : (
              <p>Login failed. Check your username and password.</p>
            )}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="login-user" className="sr-only">
              Username
            </label>
            <input
              id="login-user"
              type="text"
              autoComplete="username"
              placeholder="Username"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
              required
            />
          </div>
          <div>
            <label htmlFor="login-token" className="sr-only">
              Password
            </label>
            <input
              id="login-token"
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
              required
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-sky-700 disabled:opacity-60 dark:bg-sky-500 dark:hover:bg-sky-600"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
