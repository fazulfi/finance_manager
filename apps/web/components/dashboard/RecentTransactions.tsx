"use client";

import { api } from "@finance/api/react";
import { TransactionItem } from "@/components/transactions/TransactionItem";

interface RecentTransactionsProps {
  limit?: number;
}

export function RecentTransactions({ limit = 10 }: RecentTransactionsProps): React.JSX.Element {
  const transactionsQuery = api.dashboard.getRecentTransactions.useQuery({ limit });

  if (transactionsQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading transactions...</p>;
  }

  if (transactionsQuery.error) {
    return <p className="text-sm text-rose-600">Failed to load transactions.</p>;
  }

  const items = transactionsQuery.data?.items ?? [];

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No recent transactions.</p>;
  }

  return (
    <div className="space-y-0">
      {items.map((item) => (
        <TransactionItem key={item.id} transaction={item as any} variant="row" />
      ))}
    </div>
  );
}
