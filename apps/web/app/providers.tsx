"use client";

import type { ReactNode } from "react";
import { ApiProvider } from "@finance/api/react";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps): React.JSX.Element {
  return <ApiProvider url="/api/trpc">{children}</ApiProvider>;
}
