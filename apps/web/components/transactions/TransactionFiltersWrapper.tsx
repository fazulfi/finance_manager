"use client";

import { TransactionFiltersClient } from "@/components/transactions/TransactionFiltersClient";

interface TransactionsFiltersWrapperProps {
  filters: {
    accountId?: string;
    category?: string;
    dateFrom?: Date;
    dateTo?: Date;
    amountMin?: number;
    amountMax?: number;
    search?: string;
  };
  accounts: Array<{ id: string; name: string; type: string }>;
  categories: Array<{ id: string; name: string; type: string }>;
  disabled?: boolean;
}

export function TransactionsFiltersWrapper({
  filters,
  accounts,
  categories,
  disabled = false,
}: TransactionsFiltersWrapperProps) {
  return (
    <TransactionFiltersClient
      filters={filters}
      accounts={accounts}
      categories={categories}
      disabled={disabled}
    />
  );
}
