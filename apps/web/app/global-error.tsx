"use client";

import { Button } from "@finance/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="w-full max-w-lg rounded-xl border p-6 text-center">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <Button type="button" className="mt-4" onClick={() => reset()}>
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}
