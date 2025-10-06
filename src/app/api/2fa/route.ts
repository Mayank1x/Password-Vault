import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { TwoFactor } from "@/models/TwoFactor";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

export async function POST(req: Request) {
  const { userId } = await req.json();
  await connectDB();

  // Always use lowercase email for consistency
  const normalizedId = userId.toLowerCase();

  const existing = await TwoFactor.findOne({ userId: normalizedId });

  // Only generate a new secret if none exists
  const secret = existing
    ? { base32: existing.secret, otpauth_url: speakeasy.otpauthURL({ secret: existing.secret, label: `PasswordVault (${normalizedId})`, encoding: "base32" }) }
    : speakeasy.generateSecret({ name: `PasswordVault (${normalizedId})` });

  const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

  await TwoFactor.findOneAndUpdate(
    { userId: normalizedId },
    { secret: secret.base32, enabled: false }, // enable after verification only
    { upsert: true, new: true }
  );

  return NextResponse.json({ qrCode });
}

export async function PUT(req: Request) {
  const { userId, token } = await req.json();
  await connectDB();

  const normalizedId = userId.toLowerCase();
  const record = await TwoFactor.findOne({ userId: normalizedId });
  if (!record)
    return NextResponse.json({ error: "No 2FA setup found" }, { status: 400 });

  const verified = speakeasy.totp.verify({
    secret: record.secret,
    encoding: "base32",
    token,
    window: 1,
  });

  if (!verified)
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  // ✅ Mark 2FA as enabled after valid verification
  record.enabled = true;
  await record.save();

  return NextResponse.json({ message: "✅ 2FA verified successfully!" });
}
