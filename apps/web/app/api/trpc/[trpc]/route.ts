// apps/web/app/api/trpc/[trpc]/route.ts
// tRPC HTTP handler — wires NextAuth session + Prisma db into createTRPCContext.
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { TRPCError } from "@trpc/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@finance/db";
import { appRouter, createTRPCContext } from "@finance/api";

const handler = async (req: NextRequest): Promise<Response> => {
  const session = await auth();

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () =>
      createTRPCContext({
        session,
        db,
      }),
    ...(process.env.NODE_ENV === "development" && {
      onError: ({ path, error }: { path: string | undefined; error: TRPCError }) => {
        console.error(`tRPC error on ${path ?? "<unknown>"}:`, error);
      },
    }),
  });
};

export { handler as GET, handler as POST };
