// packages/api/src/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import type { db as defaultDb } from "@finance/db";
import superjson from "superjson";
import { ZodError } from "zod";

// ─── Context ──────────────────────────────────────────────────────────────────

export type DbClient = typeof defaultDb;

export interface SessionUser {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}

export interface Session {
  user?: SessionUser | null;
  expires?: string;
}

export interface AuthedSession extends Session {
  user: SessionUser & {
    id: string;
  };
}

export interface CreateContextOptions {
  session: Session | null;
  db: DbClient;
}

/**
 * createTRPCContext — called by the HTTP route handler in apps/web.
 * The handler passes session + db; this function shapes the tRPC context.
 * We intentionally do NOT import NextRequest to keep this package
 * framework-agnostic and importable from both web and mobile clients.
 */
export function createTRPCContext(opts: CreateContextOptions) {
  return {
    db: opts.db,
    session: opts.session,
  };
}

export type Context = ReturnType<typeof createTRPCContext>;

// ─── tRPC Init ────────────────────────────────────────────────────────────────

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// ─── Middleware ───────────────────────────────────────────────────────────────

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      session: {
        ...ctx.session,
        user: { ...ctx.session.user, id: ctx.session.user.id },
      } as AuthedSession,
    },
  });
});

// ─── Procedure Builders ──────────────────────────────────────────────────────

/** Router factory — use to create all sub-routers */
export const router = t.router;

/** Public procedure — no authentication required. Use ONLY for truly public endpoints. */
export const publicProcedure = t.procedure;

/**
 * Protected procedure — throws UNAUTHORIZED if no valid session.
 * After this middleware, ctx.session.user.id is guaranteed to be string.
 */
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

/** createCallerFactory — used for server-side tRPC calls (e.g., in Server Components) */
export const createCallerFactory = t.createCallerFactory;
