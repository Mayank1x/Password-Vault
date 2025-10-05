import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import speakeasy from "speakeasy";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { TwoFactor } from "@/models/TwoFactor";

const authHandler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        token: { label: "2FA Token", type: "text", optional: true },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Missing credentials");
        }

        await connectDB();

        // Find user by email
        const user = await User.findOne({ email: credentials.email });
        if (!user) throw new Error("No user found");

        // Check password
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) throw new Error("Invalid password");

        // 🔐 Check if 2FA is enabled
        const twoFA = await TwoFactor.findOne({ userId: user.email });
        if (twoFA && twoFA.enabled) {
          if (!credentials.token) {
            throw new Error("2FA required"); // frontend should prompt for token
          }

          const verified = speakeasy.totp.verify({
            secret: twoFA.secret,
            encoding: "base32",
            token: credentials.token,
          });

          if (!verified) throw new Error("Invalid 2FA code");
        }

        return { id: user._id.toString(), email: user.email };
      },
    }),
  ],

  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: "/login", // ✅ custom login page
  },
});

export { authHandler as GET, authHandler as POST };
