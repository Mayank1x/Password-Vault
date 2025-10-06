import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import speakeasy from "speakeasy";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { TwoFactor } from "@/models/TwoFactor";

export const authOptions: AuthOptions = {
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

        const email = credentials.email.toLowerCase();

        // 🔍 1. Find user by email
        const user = await User.findOne({ email });
        if (!user) throw new Error("No user found");

        // 🔑 2. Check password validity
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) throw new Error("Invalid password");

        // 🔐 3. Check if 2FA is enabled for this user
        const twoFA = await TwoFactor.findOne({ userId: email });

        if (twoFA && twoFA.enabled) {
          // Require 2FA token if enabled
          if (!credentials.token) {
            throw new Error("2FA required");
          }

          const verified = speakeasy.totp.verify({
            secret: twoFA.secret,
            encoding: "base32",
            token: credentials.token,
            window: 1, // allow slight time drift
          });

          if (!verified) {
            throw new Error("Invalid 2FA code");
          }
        }

        // ✅ 4. Return safe user object
        return { id: user._id.toString(), email: user.email };
      },
    }),
  ],

  // 🔐 Session and JWT configuration
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: "/login", // custom login page
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.email) {
        session.user = { email: token.email };
      }
      return session;
    },
  },
};

const authHandler = NextAuth(authOptions);
export { authHandler as GET, authHandler as POST };
