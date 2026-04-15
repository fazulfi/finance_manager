"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, type HTTPBatchLinkOptions } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import superjson from "superjson";

import type { AppRouter } from "./root.js";

export type ApiReact = ReturnType<typeof createTRPCReact<AppRouter>>;

export const api: ApiReact = createTRPCReact<AppRouter>();

export interface ApiClientOptions {
  url: string;
  headers?: HTTPBatchLinkOptions["headers"];
}

export const createApiClient = ({ url, headers }: ApiClientOptions) => {
  const linkOptions: HTTPBatchLinkOptions = headers === undefined ? { url } : { url, headers };

  return api.createClient({
    transformer: superjson,
    links: [httpBatchLink(linkOptions)],
  });
};

export interface ApiProviderProps extends ApiClientOptions {
  children: ReactNode;
  queryClient?: QueryClient;
  trpcClient?: ReturnType<typeof createApiClient>;
}

export function ApiProvider({
  children,
  headers,
  queryClient: initialQueryClient,
  trpcClient: initialTrpcClient,
  url,
}: ApiProviderProps): React.JSX.Element {
  const [queryClient] = useState(() => initialQueryClient ?? new QueryClient());
  const [trpcClient] = useState(() => initialTrpcClient ?? createApiClient({ url, headers }));

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </api.Provider>
  );
}
