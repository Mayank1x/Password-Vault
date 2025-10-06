import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import { VaultItem } from "@/models/VaultItem";

// ✅ GET — only return items that belong to the logged-in user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const items = await VaultItem.find({ userId: session.user.email }); // ✅ user-specific
  return NextResponse.json(items);
}

// ✅ POST — add new item for the logged-in user only
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, username, password, url, notes } = await req.json();

    await connectDB();

    const newItem = await VaultItem.create({
      userId: session.user.email, // ✅ only store under this user
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
