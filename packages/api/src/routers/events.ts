// packages/api/src/routers/events.ts
import { z } from "zod";

import { router, protectedProcedure } from "../trpc.js";


export const eventsRouter = router({
  subscribe: protectedProcedure.mutation(async () => {
    // Placeholder - return simple response
    return {
      message: "Events subscription endpoint - implementation pending",
      sessionId: `session-pending-${Date.now()}`,
    };
  }),

  unsubscribe: protectedProcedure.input(z.object({ sessionId: z.string() })).mutation(async () => {
    // Placeholder implementation
    return { success: true };
  }),
});
