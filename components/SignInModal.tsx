"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { Eye, EyeOff } from "lucide-react";
import { getPasswordPolicyError, MIN_PASSWORD_LENGTH } from "@/lib/passwordPolicy";

interface SignInModalProps {
  onClose: () => void;
}

export default function SignInModal({ onClose }: SignInModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // ── Sign in ──────────────────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
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
        setError("Invalid email or password, or please wait before trying again.");
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
  const handleSignUp = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    setError("");

    if (!agreedToTerms) {
      setError("Please accept the Terms & Conditions to create an account.");
      return;
    }

    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    const passwordPolicyError = getPasswordPolicyError(password);
    if (passwordPolicyError) { setError(passwordPolicyError); return; }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
          agreedToTermsAt: new Date().toISOString(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Signup failed");
        return;
      }

      const signInResult = await signIn("credentials", {
        redirect: false,
        email: email.toLowerCase().trim(),
        password,
      });

      if (signInResult?.error) {
        setError("Invalid email or password. Check your details and try again.");
      } else {
        onClose();
        // Full reload so TopBar reflects the new session immediately
        window.location.reload();
      }
    } catch {
      setError("Could not create your account. Check your connection and try again.");
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
    setShowPassword(false);
    setConfirmPassword("");
    setAgreedToTerms(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[90%] max-w-md rounded-2xl bg-gray-300 p-8 shadow-xl transition duration-300 relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            {isSignUp ? "Create an Account" : "Sign in to your account"}
          </h2>
          <button
            onClick={onClose}
            className="text-purple-800 font-bold text-2xl hover:text-purple-500 hover:cursor-pointer transition hover:rotate-90 duration-300"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={isSignUp ? handleSignUp : handleSignIn}
          className="mt-4 space-y-4"
        >
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-lg border border-purple-800 p-3 text-gray-800 outline-none focus:border-purple-800 focus:ring-2 focus:ring-purple-800/50 transition"
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className="relative">
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-purple-800 p-3 text-gray-800 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-800/50 transition"
              required
              disabled={isLoading}
              minLength={isSignUp ? MIN_PASSWORD_LENGTH : undefined}
              maxLength={72}
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {isSignUp && <p className="-mt-2 text-xs text-gray-600">Use at least 15 characters. A memorable passphrase is easier to remember and harder to guess.</p>}

          {isSignUp && (
            <>
              <div>
                <label htmlFor="confirmPassword" className="sr-only">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  className="w-full rounded-lg border border-purple-800 p-3 text-gray-800 outline-none focus:border-purple-800 focus:ring-2 focus:ring-purple-800/50 transition"
                  required
                  disabled={isLoading}
                  minLength={MIN_PASSWORD_LENGTH}
                  maxLength={72}
                  autoComplete="new-password"
                />
              </div>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  disabled={isLoading}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-purple-800 text-purple-700 accent-purple-700 cursor-pointer"
                />
                <span className="text-sm text-gray-700 leading-snug">
                  I have read and agree to the{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-purple-800 hover:text-purple-500 underline underline-offset-2 transition"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms & Conditions
                  </a>{" "}
                  and{" "}
                  <a
                    href="/terms#privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-purple-800 hover:text-purple-500 underline underline-offset-2 transition"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>
            </>
          )}

          {error && (
            <div
              className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3"
              role="alert"
            >
              {error}
            </div>
          )}

          <button type="submit"
            disabled={isLoading || (isSignUp && !agreedToTerms)}
            className="w-full rounded-lg bg-purple-800 text-white py-3 font-semibold hover:bg-purple-600 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </span>
            ) : isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center">
          <div className="h-px flex-1 bg-gray-400" />
          <span className="px-3 text-gray-600 text-sm font-medium">
            or continue with
          </span>
          <div className="h-px flex-1 bg-gray-400" />
        </div>

        {/* Google */}
        <div className="flex justify-center mb-6">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="flex items-center justify-center space-x-2 rounded-lg border border-purple-800 px-6 py-2 hover:bg-gray-200 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Sign in with Google"
          >
            <FcGoogle size={24} />
            <span className="text-gray-800 font-medium">Google</span>
          </button>
        </div>

        {isSignUp && (
          <p className="text-center text-xs text-gray-500 -mt-3 mb-4">
            By signing up with Google you also agree to our{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer"
              className="text-purple-800 underline underline-offset-2 hover:text-purple-500 transition">
              Terms & Conditions
            </a>
            .
          </p>
        )}

        {/* Toggle sign in / sign up */}
        <div className="text-center text-sm text-gray-700">
          {isSignUp ? (
            <>
              Already have an account?{" "}
              <button
                type="button"
                disabled={isLoading}
                className="font-bold text-purple-800 hover:underline hover:text-purple-500 transition"
                onClick={() => {
                  setIsSignUp(false);
                  resetForm();
                }}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                disabled={isLoading}
                className="font-bold text-purple-800 hover:underline hover:text-purple-500 transition"
                onClick={() => {
                  setIsSignUp(true);
                  resetForm();
                }}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
