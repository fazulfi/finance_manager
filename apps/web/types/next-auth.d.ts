// apps/web/types/next-auth.d.ts
// Augments the NextAuth v5 Session type so session.user.id is always string.
// This file is auto-included by TypeScript via tsconfig "include": ["**/*.ts", "**/*.tsx"].

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
