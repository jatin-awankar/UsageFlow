"use client";

import Link from "next/link";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { signIn } from "next-auth/react";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import AuthShell from "@/components/auth/AuthShell";

function sanitizeNextPath(value: string | null) {
  if (!value) return "/app";
  if (!value.startsWith("/") || value.startsWith("//")) return "/app";
  return value;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = useMemo(
    () => sanitizeNextPath(searchParams.get("next")),
    [searchParams]
  );

  const registerHref =
    nextPath === "/app"
      ? "/register"
      : `/register?next=${encodeURIComponent(nextPath)}`;

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <AuthShell
      title="Sign in to your account"
      description="Access your organizations and continue where you left off."
      footer={
        <p className="text-sm text-slate-500">
          New here?{" "}
          <Link
            href={registerHref}
            className="font-medium text-slate-900 hover:underline"
          >
            Create an account
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={loading}
            required
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:opacity-50"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Password</label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              autoComplete="current-password"
              disabled={loading}
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              disabled={loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 hover:cursor-pointer"
            >
              {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        </div>

        {error ? (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={loading}
          className="w-full hover:cursor-pointer"
        >
          <LogIn className="size-4" />
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}

function LoginPageFallback() {
  return (
    <AuthShell
      title="Sign in to your account"
      description="Access your organizations and continue where you left off."
      footer={
        <p className="text-sm text-slate-500">
          New here?{" "}
          <Link href="/register" className="font-medium text-slate-900 hover:underline">
            Create an account
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded-md bg-slate-200/80" />
        <div className="h-10 animate-pulse rounded-md bg-slate-200/80" />
        <div className="h-10 animate-pulse rounded-md bg-slate-200/70" />
      </div>
    </AuthShell>
  );
}
