// packages/api/src/routers/events.ts
import { Readable } from "stream";
import { z } from "zod";

import { router, protectedProcedure } from "../trpc.js";

// In-memory store for active client sessions
// In production, use Redis or database for persistence
interface ClientSession {
  userId: string;
  sessionId: string;
  events: string[];
}

const sessions = new Map<string, ClientSession[]>();

export const eventsRouter = router({
  subscribe: protectedProcedure.mutation(async () => {
    // Session akan diakses via context yang akan ditambahkan nanti
    // Untuk saat ini, return simple response
    return {
      message: "Events subscription endpoint - implementation pending",
      sessionId: `session-pending-${Date.now()}`,
    };
  }),

  unsubscribe: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input }) => {
      // Placeholder implementation
      return { success: true };
    }),
});
