"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { useRouter } from "next/navigation";

interface SignInModalProps {
  onClose: () => void;
}

export default function SignInModal({ onClose }: SignInModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Sign in with credentials
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        // Success! Reload the page to update session
        window.location.reload();
      }
    } catch (err) {
      setError("An error occurred during sign in");
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up logic
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      console.log("Sending signup request...");
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      console.log("Response status:", res.status);

      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response:", text);
        setError("Server error. Please try again.");
        return;
      }

      const data = await res.json();
      console.log("Response data:", data);

      if (!res.ok) {
        setError(data.message || "Signup failed");
        return;
      }

      // After successful signup, automatically sign in
      const signInResult = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (signInResult?.error) {
        setError(
          "Account created but sign in failed. Please try signing in manually."
        );
      } else {
        // Success! Close modal and force full page reload after a short delay
        onClose();
        // Small delay to ensure cookie is set
        setTimeout(() => {
          window.location.href = "/events";
        }, 100);
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(`Network error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Google sign-in
  const handleGoogleSignIn = () => {
    signIn("google", {
      callbackUrl: "/events",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[90%] max-w-md rounded-2xl bg-gray-300 p-8 shadow-md transition duration-300 relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            {isSignUp ? "Create an Account" : "Sign in to your account"}
          </h2>
          <button
            onClick={onClose}
            className="text-purple-800 font-bold text-lg hover:text-purple-600 hover:cursor-pointer transition"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={isSignUp ? handleSignUp : handleSignIn}
          className="mt-2 space-y-4"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-lg border border-purple-800 p-3 text-gray-800 outline-none focus:border-purple-800 focus:ring-1 focus:ring-purple-800"
            required
            disabled={isLoading}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border border-purple-800 p-3 text-gray-800 outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-800"
            required
            disabled={isLoading}
            minLength={6}
          />
          {isSignUp && (
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              className="w-full rounded-lg border border-gray-800 p-3 text-gray-800 outline-none focus:border-purple-800 focus:ring-1 focus:ring-purple-800"
              required
              disabled={isLoading}
              minLength={6}
            />
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-purple-800 text-gray-100 py-3 hover:bg-purple-600 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        {/* Or divider */}
        <div className="my-6 flex items-center">
          <div className="h-px flex-1 bg-gray-800"></div>
          <span className="px-3 text-gray-500 text-sm">or continue with</span>
          <div className="h-px flex-1 bg-gray-800"></div>
        </div>

        {/* Google Sign-in */}
        <div className="flex justify-center space-x-4 mb-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="flex items-center justify-center space-x-2 rounded-full border border-gray-400 p-2 hover:bg-gray-100 hover:cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FcGoogle size={24} />
          </button>
        </div>

        {/* Toggle sign-in/sign-up */}
        <div className="text-center text-sm text-gray-700">
          {isSignUp ? (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className="font-bold text-purple-800 hover:underline hover:cursor-pointer"
                onClick={() => {
                  setIsSignUp(false);
                  setError("");
                  setConfirmPassword("");
                }}
                disabled={isLoading}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                className="font-bold text-purple-800 hover:underline hover:cursor-pointer"
                onClick={() => {
                  setIsSignUp(true);
                  setError("");
                }}
                disabled={isLoading}
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