import mongoose, { Schema, Document } from "mongoose";

export interface ITwoFactor extends Document {
  userId: string;
  secret: string;
  enabled: boolean;
}

const TwoFactorSchema = new Schema<ITwoFactor>({
  userId: { type: String, required: true },
  secret: { type: String, required: true },
  enabled: { type: Boolean, default: false },
});

export const TwoFactor =
  mongoose.models.TwoFactor || mongoose.model("TwoFactor", TwoFactorSchema);
