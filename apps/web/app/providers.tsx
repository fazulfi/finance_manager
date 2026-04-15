"use client";

import { ApiProvider } from "@finance/api/react";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/common/ThemeProvider";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps): React.JSX.Element {
  return (
    <ThemeProvider>
      <ApiProvider url="/api/trpc">{children}</ApiProvider>
    </ThemeProvider>
  );
}
