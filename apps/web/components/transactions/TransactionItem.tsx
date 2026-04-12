// apps/web/components/transactions/TransactionItem.tsx
import { ChevronRight, Circle } from "lucide-react";
import { cn } from "@finance/ui";

interface TransactionItemProps {
  transaction: {
    id: string;
    accountId: string;
    date: Date;
    amount: number;
    currency: string;
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    category: string;
    subcategory?: string | null;
    project?: string | null;
    tags?: string[];
    description?: string | null;
    account?: {
      name?: string;
    } | null;
  };
  variant?: "card" | "row";
  className?: string;
}

const TYPE_COLORS = {
  INCOME: "text-emerald-500",
  EXPENSE: "text-rose-500",
  TRANSFER: "text-blue-500",
} as const;

const TYPE_ICONS = {
  INCOME: Circle,
  EXPENSE: Circle,
  TRANSFER: ChevronRight,
} as const;

const TYPE_LABELS = {
  INCOME: "Income",
  EXPENSE: "Expense",
  TRANSFER: "Transfer",
} as const;

const TYPE_BORDER_COLORS = {
  INCOME: "border-l-emerald-500",
  EXPENSE: "border-l-rose-500",
  TRANSFER: "border-l-blue-500",
} as const;

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function TransactionItem({
  transaction,
  variant = "row",
  className,
}: TransactionItemProps): React.JSX.Element {
  const Icon = TYPE_ICONS[transaction.type];
  const colorClass = TYPE_COLORS[transaction.type];
  const borderClass = TYPE_BORDER_COLORS[transaction.type];
  const label = TYPE_LABELS[transaction.type];
  const accountName =
    typeof transaction.account?.name === "string" && transaction.account.name.length > 0
      ? transaction.account.name
      : transaction.accountId;
  const displayTags = Array.isArray(transaction.tags) ? transaction.tags : [];

  if (variant === "card") {
    return (
      <div className={cn("rounded-xl border bg-white p-4 shadow-sm", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-muted p-2">
              <Icon className={cn("h-4 w-4", colorClass)} aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{transaction.category}</h3>
              {transaction.subcategory && (
                <p className="text-xs text-muted-foreground">{transaction.subcategory}</p>
              )}
            </div>
          </div>
          <p className={cn("font-mono text-lg font-semibold tabular-nums", colorClass)}>
            {transaction.type === "INCOME" ? "+" : "-"}
            {formatAmount(transaction.amount, transaction.currency)}
          </p>
        </div>
        {transaction.description && (
          <p className="mt-3 text-sm text-muted-foreground">{transaction.description}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-4 border-b border-gray-100 py-3",
        borderClass,
        className,
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="rounded-full bg-muted p-2 shrink-0">
          <Icon className={cn("h-4 w-4", colorClass)} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">{transaction.category}</span>
            {transaction.subcategory && (
              <span className="text-xs text-muted-foreground">• {transaction.subcategory}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground truncate">{accountName}</span>
            {transaction.project && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 font-medium">
                {transaction.project}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className={cn("font-mono text-sm font-semibold tabular-nums", colorClass)}>
            {transaction.type === "INCOME" ? "+" : "-"}
            {formatAmount(transaction.amount, transaction.currency)}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(transaction.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          {displayTags.slice(0, 2).map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
