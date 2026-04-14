"use client";

import { Button } from "@finance/ui";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-6">
      <div className="w-full rounded-xl border bg-card p-6 text-center">
        <h1 className="text-xl font-semibold">Unexpected Error</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Button type="button" className="mt-5" onClick={() => reset()}>
          Reload page
        </Button>
      </div>
    </div>
  );
}
