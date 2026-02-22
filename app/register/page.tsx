"use client";

import Link from "next/link";
import { Eye, EyeOff, UserPlus2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { registerUser } from "@/actions/register";
import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";

function sanitizeNextPath(value: string | null) {
  if (!value) return "/app";
  if (!value.startsWith("/") || value.startsWith("//")) return "/app";
  return value;
}

export default function RegisterPage() {
  const [state, action, isPending] = useActionState(registerUser, {
    errors: {},
  });
  const [showPassword, setShowPassword] = useState(false);

  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => sanitizeNextPath(searchParams.get("next")),
    [searchParams]
  );

  const loginHref =
    nextPath === "/app"
      ? "/login"
      : `/login?next=${encodeURIComponent(nextPath)}`;

  return (
    <AuthShell
      title="Create your account"
      description="Set up your UsageFlow access and start building your billing workspace."
      footer={
        <p className="text-sm text-slate-500">
          Already have an account?{" "}
          <Link href={loginHref} className="font-medium text-slate-900 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={nextPath} />

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isPending}
            required
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:opacity-50"
          />
          {state?.errors?.email ? (
            <p className="text-sm text-rose-600">{state.errors.email[0]}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Password</label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              disabled={isPending}
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:opacity-50"
            />
            <button
              type="button"
              disabled={isPending}
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 hover:cursor-pointer"
            >
              {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Use at least 8 characters, with one uppercase letter and one number.
          </p>
          {state?.errors?.password ? (
            <p className="text-sm text-rose-600">{state.errors.password[0]}</p>
          ) : null}
        </div>

        {state?.errors?._form ? (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {state.errors._form[0]}
          </p>
        ) : null}

        <Button type="submit" disabled={isPending} className="w-full hover:cursor-pointer">
          <UserPlus2 className="size-4" />
          {isPending ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
