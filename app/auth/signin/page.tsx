"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      setError(result.error);
    } else {
      router.push("/events"); // redirect after login
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-md">
        <h2 className="text-center text-2xl font-bold text-gray-900">Sign in to your account</h2>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-lg border border-gray-300 p-3 focus:border-black focus:ring-1 focus:ring-black"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border border-gray-300 p-3 focus:border-black focus:ring-1 focus:ring-black"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-black p-3 text-white hover:bg-gray-800 transition"
          >
            Sign In
          </button>
        </form>

        <div className="my-6 flex items-center">
          <div className="h-px flex-1 bg-gray-300"></div>
          <span className="px-3 text-gray-500 text-sm">or continue with</span>
          <div className="h-px flex-1 bg-gray-300"></div>
        </div>

        <div className="flex justify-center space-x-4">
          <button
            onClick={() => signIn("google")}
            className="flex items-center justify-center space-x-2 rounded-full border p-2 hover:bg-gray-100 transition"
          >
            <FcGoogle size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
