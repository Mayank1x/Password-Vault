"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

export default function TwoFactorPage() {
  const { data: session } = useSession();
  const [qr, setQr] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [verified, setVerified] = useState(false);

  // Step 1: Enable and get QR code
  const enable2FA = async () => {
    try {
      const res = await fetch("/api/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session?.user?.email }),
      });
      const data = await res.json();
      if (data.qrCode) {
        setQr(data.qrCode);
        toast.success("📱 Scan the QR code in your Authenticator app");
      } else {
        toast.error("Failed to generate QR code");
      }
    } catch (err) {
      toast.error("Error setting up 2FA");
    }
  };

  // Step 2: Verify token
  const verifyToken = async () => {
    try {
      const res = await fetch("/api/2fa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session?.user?.email, token }),
      });
      const data = await res.json();
      if (res.ok) {
        setVerified(true);
        toast.success(data.message);
      } else {
        toast.error(data.error || "Verification failed");
      }
    } catch {
      toast.error("Verification error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center">
      <h1 className="text-3xl font-bold text-purple-400 mb-6">🔒 Two-Factor Authentication</h1>

      {!qr && !verified && (
        <button
          onClick={enable2FA}
          className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded font-semibold"
        >
          Enable 2FA
        </button>
      )}

      {qr && !verified && (
        <div className="mt-6 flex flex-col items-center space-y-4">
          <p className="text-gray-300 text-sm">Scan this QR code with Google Authenticator:</p>
          <img src={qr} alt="2FA QR Code" className="w-48 h-48 border border-gray-600 rounded" />

          <input
            type="text"
            placeholder="Enter 6-digit code"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="p-2 rounded bg-gray-800 text-center text-lg w-40"
          />
          <button
            onClick={verifyToken}
            className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded font-semibold"
          >
            Verify Code
          </button>
        </div>
      )}

      {verified && (
        <div className="mt-8 text-center">
          <p className="text-green-400 text-xl font-semibold">✅ 2FA Verified and Enabled!</p>
        </div>
      )}
    </div>
  );
}
