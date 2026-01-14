// app/register/page.tsx
"use client";

import { useActionState, useState } from "react";
import { registerUser } from "@/actions/register";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  // state will contain the { error } object returned from our action
  const [state, action, isPending] = useActionState(registerUser, {
    errors: {},
  });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="max-w-sm mx-auto mt-20 space-y-4">
      <h1 className="text-2xl font-semibold">Create Account</h1>

      <div>
        <input
          name="email"
          type="email"
          placeholder="Email"
          disabled={isPending}
          required
          className="w-full border p-2"
        />
        {state?.errors?.email && (
          <p className="text-red-500 text-sm mt-1">{state.errors.email[0]}</p>
        )}
      </div>

      <div className="relative">
        <input
          name="password"
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          disabled={isPending}
          required
          className="w-full border p-2 "
        />
        <button
          type="button"
          disabled={isPending}
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
        >
          {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
        </button>
        {state?.errors?.password && (
          <p className="absolute text-red-500 text-sm mt-1 mb-2">
            {state.errors.password[0]}
          </p>
        )}
      </div>

      {state.errors?._form && (
        <p className="text-red-500">{state.errors._form[0]}</p>
      )}

      <button
        disabled={isPending}
        className="w-full bg-black text-white p-2 disabled:bg-gray-400"
      >
        {isPending ? "Creating Account..." : "Sign Up"}
      </button>
    </form>
  );
}
