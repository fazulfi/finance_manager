import type { AppRouter } from "@finance/api";
import { transformer } from "@tanstack/react-query/transformer";
import { createTRPCReact } from "@trpc/react-query";

export const api = createTRPCReact<AppRouter>();
