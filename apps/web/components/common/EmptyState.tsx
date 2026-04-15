"use client";

import { cn } from "@finance/ui";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className={cn("rounded-xl border border-dashed p-8 text-center", className)}>
      <div className="mx-auto mb-4 h-28 w-28" aria-hidden="true">
        <svg viewBox="0 0 160 160" className="h-full w-full text-muted-foreground/70">
          <circle cx="80" cy="80" r="68" fill="currentColor" opacity="0.08" />
          <rect x="38" y="44" width="84" height="72" rx="10" fill="currentColor" opacity="0.14" />
          <rect x="50" y="58" width="60" height="8" rx="4" fill="currentColor" opacity="0.4" />
          <rect x="50" y="74" width="42" height="8" rx="4" fill="currentColor" opacity="0.25" />
          <rect x="50" y="90" width="50" height="8" rx="4" fill="currentColor" opacity="0.25" />
          <circle cx="118" cy="40" r="10" fill="currentColor" opacity="0.22" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
