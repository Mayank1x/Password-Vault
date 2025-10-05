import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { VaultItem } from "@/models/VaultItem";

// 🗑 DELETE a vault item
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    await VaultItem.findByIdAndDelete(params.id);
    return NextResponse.json({ message: "✅ Item deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "❌ Failed to delete item" }, { status: 500 });
  }
}

// ✏️ UPDATE a vault item
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    await connectDB();
    const updated = await VaultItem.findByIdAndUpdate(params.id, body, { new: true });
    return NextResponse.json({ message: "✅ Item updated", item: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "❌ Failed to update item" }, { status: 500 });
  }
}
