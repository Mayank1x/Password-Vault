import { Schema, model, models } from "mongoose";

const VaultItemSchema = new Schema({
  userId: { type: String, required: true },
  title: { type: String },
  username: { type: String },
  password: { type: String }, // encrypted
  url: { type: String },
  notes: { type: String },
});

export const VaultItem = models.VaultItem || model("VaultItem", VaultItemSchema);
