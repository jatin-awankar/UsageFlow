"use client";

import { useActionState, useState } from "react";
import { registerUser } from "@/actions/register";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const [state, action, isPending] = useActionState(registerUser, {
    errors: {},
  });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white border rounded-lg p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="text-xl font-semibold">UsageFlow</div>
          <h1 className="text-lg font-medium">Create your account</h1>
          <p className="text-sm text-gray-500">Get started in under a minute</p>
        </div>

        {/* Form */}
        <form action={action} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              disabled={isPending}
              required
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            {state?.errors?.email && (
              <p className="text-sm text-red-600">{state.errors.email[0]}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Password</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                disabled={isPending}
                required
                className="w-full border rounded-md px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
              <button
                type="button"
                disabled={isPending}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:cursor-pointer"
              >
                {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
            {state?.errors?.password && (
              <p className="text-sm text-red-600">{state.errors.password[0]}</p>
            )}
          </div>

          {state?.errors?._form && (
            <p className="text-sm text-red-600">{state.errors._form[0]}</p>
          )}

          <button
            disabled={isPending}
            className="w-full bg-black text-white rounded-md py-2 text-sm font-medium hover:cursor-pointer disabled:opacity-50"
          >
            {isPending ? "Creating account..." : "Create account"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-sm text-center text-gray-500">
          Already have an account?{" "}
          <a href="/login" className="text-black font-medium hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
