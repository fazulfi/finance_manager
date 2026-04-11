// apps/web/auth.ts
// NextAuth v5 configuration — JWT strategy, no Prisma adapter.
// Google OAuth and Credentials (email/password) providers.
// The accounts collection is reserved for the finance Account model,
// so we manually upsert users in the signIn callback instead of using @auth/prisma-adapter.

import NextAuth, { type NextAuthResult } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { db } from "@finance/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const result: NextAuthResult = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            password: true,
          },
        });

        if (!user?.password) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          image: user.image ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Google OAuth: manually upsert the user in MongoDB.
      // We do NOT use @auth/prisma-adapter — accounts collection is reserved
      // for the finance Account model.
      if (account?.provider === "google") {
        if (!user.email) return false;

        // Upsert user by email — update name/image on repeat sign-ins
        await db.user.upsert({
          where: { email: user.email },
          update: {
            ...(user.name != null ? { name: user.name } : {}),
            ...(user.image != null ? { image: user.image } : {}),
          },
          create: {
            email: user.email,
            name: user.name ?? null,
            image: user.image ?? null,
          },
        });

        // Re-fetch to get the canonical MongoDB ObjectId as user.id
        const dbUser = await db.user.findUnique({
          where: { email: user.email },
          select: { id: true },
        });
        if (dbUser) {
          user.id = dbUser.id;
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      // On first sign-in, user is populated — persist id to JWT token
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (token.id && typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
  },
});

export const { auth, handlers, signIn, signOut } = result;
