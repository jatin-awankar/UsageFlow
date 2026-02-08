"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/app");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white border rounded-lg p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="text-xl font-semibold">UsageFlow</div>
          <h1 className="text-lg font-medium">Sign in to your account</h1>
          <p className="text-sm text-gray-500">Welcome back 👋</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              disabled={loading}
              required
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Password</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                disabled={loading}
                required
                className="w-full border rounded-md px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:cursor-pointer"
              >
                {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            disabled={loading}
            className="w-full bg-black text-white rounded-md py-2 text-sm font-medium hover:cursor-pointer disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-sm text-center text-gray-500">
          New here?{" "}
          <a
            href="/register"
            className="text-black font-medium hover:underline"
          >
            Create an account
          </a>
        </p>
      </div>
    </div>
  );
}
