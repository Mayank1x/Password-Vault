import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import { VaultItem } from "@/models/VaultItem";

interface Params {
  params: { id: string };
}

export async function GET(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const item = await VaultItem.findOne({
    _id: params.id,
    userId: session.user.email, // ✅ only this user's item
  });

  if (!item)
    return NextResponse.json({ error: "Item not found" }, { status: 404 });

  return NextResponse.json(item);
}

export async function PUT(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, username, password, url, notes } = await req.json();
  await connectDB();

  const updated = await VaultItem.findOneAndUpdate(
    { _id: params.id, userId: session.user.email }, // ✅ ownership check
    { title, username, password, url, notes },
    { new: true }
  );

  if (!updated)
    return NextResponse.json({ error: "Item not found or unauthorized" }, { status: 404 });

  return NextResponse.json({ message: "✅ Item updated", item: updated });
}

export async function DELETE(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const deleted = await VaultItem.findOneAndDelete({
    _id: params.id,
    userId: session.user.email, // ✅ only this user’s item
  });

  if (!deleted)
    return NextResponse.json({ error: "Item not found or unauthorized" }, { status: 404 });

  return NextResponse.json({ message: "✅ Item deleted" });
}
