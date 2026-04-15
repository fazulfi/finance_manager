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
  onFilterChange: (filters: Partial<TransactionsFiltersWrapperProps["filters"]>) => void;
  onReset: () => void;
  disabled?: boolean;
}

export function TransactionsFiltersWrapper({
  filters,
  accounts,
  categories,
  onFilterChange,
  onReset,
  disabled = false,
}: TransactionsFiltersWrapperProps) {
  return (
    <TransactionFiltersClient
      {...{ filters, accounts, categories, onFilterChange, onReset, disabled }}
    />
  );
}
