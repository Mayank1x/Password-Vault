import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { VaultItem } from "@/models/VaultItem";

export async function GET() {
  await connectDB();
  const items = await VaultItem.find({});
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  try {
    const { userId, title, username, password, url, notes } = await req.json();
    await connectDB();
    const newItem = await VaultItem.create({
      userId,
      title,
      username,
      password,
      url,
      notes,
    });
    return NextResponse.json({ message: "✅ Item added", item: newItem });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "❌ Failed to add item" }, { status: 500 });
  }
}
