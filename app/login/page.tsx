// app/login/page.tsx
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
    const [email, password] = [
      formData.get("email") as string,
      formData.get("password") as string,
    ];

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
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto mt-20 space-y-4">
      <h1 className="text-2xl font-semibold">Login</h1>

      <input
        name="email"
        type="email"
        placeholder="Email"
        disabled={loading}
        required
        className="w-full border p-2"
      />

      <div className="relative">
        <input
          name="password"
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          disabled={loading}
          required
          className="w-full border p-2 pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          disabled={loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
        >
          {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
        </button>
      </div>

      {error && (
        <p className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
          {error}
        </p>
      )}

      <button
        disabled={loading}
        className="w-full bg-black text-white p-2 disabled:bg-gray-500"
      >
        {loading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
