import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { TwoFactor } from "@/models/TwoFactor";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

export async function POST(req: Request) {
  const { userId } = await req.json();
  await connectDB();

  const secret = speakeasy.generateSecret({
    name: `PasswordVault (${userId})`,
  });

  const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

  await TwoFactor.findOneAndUpdate(
    { userId },
    { secret: secret.base32, enabled: true },
    { upsert: true }
  );

  return NextResponse.json({ qrCode });
}

export async function PUT(req: Request) {
  const { userId, token } = await req.json();
  await connectDB();

  const record = await TwoFactor.findOne({ userId });
  if (!record)
    return NextResponse.json({ error: "No 2FA setup found" }, { status: 400 });

  const verified = speakeasy.totp.verify({
    secret: record.secret,
    encoding: "base32",
    token,
  });

  if (!verified)
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  return NextResponse.json({ message: "✅ 2FA verified successfully!" });
}
