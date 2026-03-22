"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { useRouter } from "next/navigation";

interface SignInModalProps {
  onClose: () => void;
}

export default function SignInModal({ onClose }: SignInModalProps) {
  const [isSignUp,         setIsSignUp]         = useState(false);
  const [email,            setEmail]            = useState("");
  const [password,         setPassword]         = useState("");
  const [confirmPassword,  setConfirmPassword]  = useState("");
  const [error,            setError]            = useState("");
  const [isLoading,        setIsLoading]        = useState(false);
  const router = useRouter();

  // ── Sign in ──────────────────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email:    email.toLowerCase().trim(),
        password,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        onClose();
        // Full reload so TopBar and session-dependent UI update immediately
        window.location.reload();
      }
    } catch {
      setError("An error occurred during sign in");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Sign up ──────────────────────────────────────────────────────────────────
  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (password.length < 6)          { setError("Password must be at least 6 characters"); return; }

    setIsLoading(true);
    try {
      const res  = await fetch("/api/auth/signup", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.toLowerCase().trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Signup failed");
        return;
      }

      const signInResult = await signIn("credentials", {
        redirect: false,
        email:    email.toLowerCase().trim(),
        password,
      });

      if (signInResult?.error) {
        setError("Account created but sign in failed. Please try signing in manually.");
      } else {
        onClose();
        // Full reload so TopBar reflects the new session immediately
        window.location.reload();
      }
    } catch (err: any) {
      setError(`Network error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Google ───────────────────────────────────────────────────────────────────
  const handleGoogleSignIn = () => {
    signIn("google");
  };

  const resetForm = () => {
    setError("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[90%] max-w-md rounded-2xl bg-gray-300 p-8 shadow-xl transition duration-300 relative">

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            {isSignUp ? "Create an Account" : "Sign in to your account"}
          </h2>
          <button onClick={onClose}
            className="text-purple-800 font-bold text-2xl hover:text-purple-600 hover:cursor-pointer transition hover:rotate-90 duration-300"
            aria-label="Close modal">
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="mt-4 space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">Email</label>
            <input
              id="email" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-lg border border-purple-800 p-3 text-gray-800 outline-none focus:border-purple-800 focus:ring-2 focus:ring-purple-800/50 transition"
              required disabled={isLoading} autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              id="password" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-purple-800 p-3 text-gray-800 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-800/50 transition"
              required disabled={isLoading} minLength={6}
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
          </div>

          {isSignUp && (
            <div>
              <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
              <input
                id="confirmPassword" type="password" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className="w-full rounded-lg border border-purple-800 p-3 text-gray-800 outline-none focus:border-purple-800 focus:ring-2 focus:ring-purple-800/50 transition"
                required disabled={isLoading} minLength={6} autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3" role="alert">
              {error}
            </div>
          )}

          <button type="submit" disabled={isLoading}
            className="w-full rounded-lg bg-purple-800 text-gray-100 py-3 font-semibold hover:bg-purple-600 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </span>
            ) : isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center">
          <div className="h-px flex-1 bg-gray-400" />
          <span className="px-3 text-gray-600 text-sm font-medium">or continue with</span>
          <div className="h-px flex-1 bg-gray-400" />
        </div>

        {/* Google */}
        <div className="flex justify-center mb-6">
          <button type="button" onClick={handleGoogleSignIn} disabled={isLoading}
            className="flex items-center justify-center space-x-2 rounded-lg border border-purple-800 px-6 py-2 hover:bg-gray-200 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Sign in with Google">
            <FcGoogle size={24} />
            <span className="text-gray-800 font-medium">Google</span>
          </button>
        </div>

        {/* Toggle sign in / sign up */}
        <div className="text-center text-sm text-gray-700">
          {isSignUp ? (
            <>
              Already have an account?{" "}
              <button type="button" disabled={isLoading}
                className="font-bold text-purple-800 hover:underline hover:text-purple-600 transition"
                onClick={() => { setIsSignUp(false); resetForm(); }}>
                Sign In
              </button>
            </>
          ) : (
            <>
              Don&apos;t have an account?{" "}
              <button type="button" disabled={isLoading}
                className="font-bold text-purple-800 hover:underline hover:text-purple-600 transition"
                onClick={() => { setIsSignUp(true); resetForm(); }}>
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}