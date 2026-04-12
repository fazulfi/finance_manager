// apps/web/components/transactions/QuickAddButton.tsx
"use client";

import { cn } from "@finance/utils";
import { Plus } from "lucide-react";
import { Button } from "@finance/ui";

interface QuickAddButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function QuickAddButton({
  onClick,
  disabled = false,
  className,
}: QuickAddButtonProps): React.JSX.Element {
  return (
    <Button
      type="button"
      variant="default"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      className={cn("rounded-full shadow-lg", className)}
      aria-label="Add transaction"
    >
      <Plus className="h-5 w-5" />
    </Button>
  );
}
