"use client";

import { Button } from "@finance/ui";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  return (
    <div className="rounded-xl border bg-card p-8 text-center">
      <h2 className="text-xl font-semibold">Dashboard failed to load</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <Button type="button" className="mt-5" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
