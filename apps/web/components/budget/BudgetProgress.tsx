"use client";

import { type Budget } from "@finance/types";
import { cn } from "@finance/ui";

interface BudgetProgressProps {
  budget: unknown;
  spent: number;
  totalBudgeted: number;
  remaining?: number;
}

function BudgetProgress({
  budget,
  spent,
  totalBudgeted,
  remaining,
}: BudgetProgressProps): React.JSX.Element {
  const percentage =
    totalBudgeted > 0 ? Math.min(100, Math.round((spent / totalBudgeted) * 100)) : 0;

  // Status determination
  const isUnder = percentage <= 79;
  const isApproaching = percentage >= 80 && percentage <= 99;
  const isExceeded = percentage > 100;

  // Status style configuration
  const statusConfig = {
    under: {
      barColor: "bg-emerald-500",
      text: "Under budget",
      textColor: "text-emerald-600",
      barWidth: percentage,
    },
    approaching: {
      barColor: "bg-amber-500",
      text: "Approaching limit",
      textColor: "text-amber-600",
      barWidth: Math.min(percentage, 100),
    },
    exceeded: {
      barColor: "bg-rose-500",
      text: "Over budget",
      textColor: "text-rose-600",
      barWidth: Math.min(percentage, 100),
    },
  };

  const currentStatus = isExceeded
    ? "exceeded"
    : isApproaching
      ? "approaching"
      : isUnder
        ? "under"
        : "under";

  const config = statusConfig[currentStatus];
  const remainingAmount = Math.max(0, totalBudgeted - spent);

  return (
    <div className="space-y-2">
      {/* Progress Bar */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={cn(
            "h-full transition-all duration-500 ease-in-out",
            currentStatus === "exceeded"
              ? "bg-rose-500"
              : currentStatus === "approaching"
                ? "bg-amber-500"
                : "bg-emerald-500",
          )}
          style={{ width: `${config.barWidth}%` }}
        />
      </div>

      {/* Status Text and Amount */}
      <div className="flex items-center justify-between text-sm">
        <span className={cn("font-medium", config.textColor)}>{config.text}</span>
        <span className="font-mono tabular-nums text-gray-600">
          {remaining !== undefined
            ? `${remainingAmount > 0 ? "Remaining: " : "Over: "}${remainingAmount.toFixed(2)}`
            : `${(percentage > 100 ? Math.abs(percentage - 100) : percentage).toFixed(0)}%`}
        </span>
      </div>

      {/* Detailed Status */}
      {isExceeded && (
        <p className="text-xs text-rose-500">
          You have spent {(spent - totalBudgeted).toFixed(2)} more than budgeted
        </p>
      )}
      {isApproaching && (
        <p className="text-xs text-amber-500">
          Consider reducing spending to stay within your budget
        </p>
      )}
    </div>
  );
}

export { BudgetProgress };
