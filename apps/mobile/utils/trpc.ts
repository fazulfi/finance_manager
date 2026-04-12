import type { AppRouter } from "@finance/api";
import { createTRPCReact } from "@trpc/react-query";

export const api = createTRPCReact<AppRouter>();
