// apps/web/components/dashboard/RecentTransactions.tsx
import { Activity, Circle, ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import { TransactionItem } from "@/components/transactions/TransactionItem";

interface RecentTransactionsProps {
  limit?: number;
}

export async function RecentTransactions({ limit = 10 }: RecentTransactionsProps) {
  const session = await auth();
  if (!session?.user) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Activity className="h-5 w-5" />
          <p className="text-sm">Please sign in to view transactions</p>
        </div>
      </div>
    );
  }

  const { createCallerFactory } = await import("@finance/api/trpc");
  const callerFactory = createCallerFactory();
  const trpc = await callerFactory();

  try {
    const transactions = await trpc.dashboard.getRecentTransactions.query({ limit });

    if (!transactions || !transactions.items || transactions.items.length === 0) {
      return (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col items-center gap-3 text-muted-foreground py-8">
            <Circle className="h-10 w-10" />
            <p className="text-sm">No recent transactions</p>
            <p className="text-xs">Start by adding your first transaction</p>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Recent Transactions</h3>
          <button className="flex items-center gap-1 text-sm text-primary hover:text-primary/90 transition-colors">
            View All
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-0">
          {transactions.items.map((transaction: any) => (
            <TransactionItem key={transaction.id} transaction={transaction} variant="row" />
          ))}
        </div>
      </div>
    );
  } catch (error) {
    console.error("Failed to fetch recent transactions:", error);
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 text-rose-500">
          <Circle className="h-5 w-5" />
          <p className="text-sm">Failed to load transactions</p>
        </div>
      </div>
    );
  }
}
