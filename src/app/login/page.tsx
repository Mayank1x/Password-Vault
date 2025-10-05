"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [show2FA, setShow2FA] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
      ...(show2FA && { token }), // include token only if visible
    });

    if (res?.error) {
      if (res.error === "2FA required") {
        setShow2FA(true);
        setError("Enter your 2FA code to continue");
      } else {
        setError(res.error);
      }
    } else {
      router.push("/vault");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="bg-gray-900/80 p-8 rounded-2xl shadow-lg w-96 text-white">
        <h1 className="text-3xl font-bold mb-6 text-center text-purple-400">
          Welcome Back
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {show2FA && (
            <input
              type="text"
              placeholder="Enter 6-digit 2FA Code"
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full py-3 mt-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-all"
          >
            {show2FA ? "Verify 2FA" : "Login"}
          </button>
        </form>
        <p className="text-gray-400 text-center mt-4 text-sm">
          New here?{" "}
          <a href="/register" className="text-purple-400 hover:underline">
            Create Account
          </a>
        </p>
      </div>
    </div>
  );
}
