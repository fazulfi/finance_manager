// apps/web/app/api/auth/[...nextauth]/route.ts
// NextAuth v5 — re-export GET and POST handlers from auth.ts.
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
