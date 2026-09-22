"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { Loader2 } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: email.toLowerCase().trim(),
        password,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/events");
      }
    } catch {
      setError("An error occurred during sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-400/50 bg-white/5 px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--brand-purple)] focus:ring-2 focus:ring-[var(--brand-purple)]/30 transition disabled:opacity-50";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-400/20 p-8 shadow-2xl">

        <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6">
          Sign in to your account
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className={inputClass}
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className={inputClass}
              required
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div
              className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-4 py-3"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-purple-600/50 hover:bg-purple-700 text-gray-100 font-semibold px-4 py-3 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading...
              </>
            ) : "Sign In"}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--brand-purple)]/25" />
          <span className="text-[var(--muted)] text-sm font-medium">or continue with</span>
          <div className="h-px flex-1 bg-[var(--brand-purple)]/25" />
        </div>

        {/* Google */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => signIn("google")}
            disabled={isLoading}
            className="flex items-center gap-3 rounded-lg border border-gray-400/50 bg-white/2 px-6 py-2.5 text-[var(--foreground)] font-medium hover:border-[var(--brand-purple)]/50 hover:bg-white/5 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Sign in with Google"
          >
            <FcGoogle size={22} />
            <span>Google</span>
          </button>
        </div>

        <div className="text-center text-sm text-[var(--muted)] mt-6">
          Don&apos;t have an account?{" "}
          <a
            href="/signup"
            className="font-bold text-purple-500 hover:opacity-80 hover:underline transition"
          >
            Sign Up
          </a>
        </div>
      </div>
    </div>
  );
}