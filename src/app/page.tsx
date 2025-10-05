"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // ✅ Redirect only if authenticated
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/vault");
    }
  }, [status, router]);

  // While NextAuth checks session
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white text-xl">
        Checking session...
      </div>
    );
  }

  // If user is not logged in — show landing page
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white text-center px-6">
      <h1 className="text-4xl md:text-5xl font-bold text-purple-400 mb-4">
        🔐 Welcome to Password Vault
      </h1>
      <p className="text-gray-300 mb-8 max-w-md">
        Generate, encrypt, and securely store your passwords in one private vault.
      </p>
      <button
        onClick={() => signIn()}
        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold text-lg transition"
      >
        Get Started →
      </button>

      <footer className="mt-16 text-sm text-gray-500">
        Made with ❤️ using Next.js & MongoDB
      </footer>
    </div>
  );
}
