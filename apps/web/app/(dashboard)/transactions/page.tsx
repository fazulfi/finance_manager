// apps/web/app/(dashboard)/transactions/page.tsx
import type { Metadata } from "next";
import { transactionRouter, accountRouter, categoryRouter, createTRPCContext } from "@finance/api";
import { auth } from "@/auth";
import { db } from "@finance/db";
import { TransactionListClient } from "@/components/transactions/TransactionList";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { QuickAddButton } from "@/components/transactions/QuickAddButton";
import { QuickAddSheet } from "@/components/transactions/QuickAddSheet";
import Link from "next/link";

async function getTransactions(page: number = 1, limit: number = 20) {
  const session = await auth();
  const ctx = createTRPCContext({ session, db });
  const api = transactionRouter.createCaller(ctx);
  return await api.list({ page, limit });
}

async function getAccounts() {
  const session = await auth();
  const ctx = createTRPCContext({ session, db });
  const api = accountRouter.createCaller(ctx);
  return await api.list({ page: 1, limit: 100 });
}

async function getCategories() {
  const session = await auth();
  const ctx = createTRPCContext({ session, db });
  const api = categoryRouter.createCaller(ctx);
  return await api.list({ page: 1, limit: 100, type: "EXPENSE" });
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: {
    page?: string;
    accountId?: string;
    category?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  };
}) {
  const page = parseInt(searchParams.page || "1");
  const accountId = searchParams.accountId;
  const category = searchParams.category;
  const dateFrom = searchParams.dateFrom ? new Date(searchParams.dateFrom) : undefined;
  const dateTo = searchParams.dateTo ? new Date(searchParams.dateTo) : undefined;
  const search = searchParams.search;

  const [transactions, accounts, categories] = await Promise.all([
    getTransactions(page, 20),
    getAccounts(),
    getCategories(),
  ]);

  const filters: {
    accountId?: string;
    category?: string;
    dateFrom?: Date;
    dateTo?: Date;
    amountMin?: number;
    amountMax?: number;
    search?: string;
  } = {
    ...(accountId && { accountId }),
    ...(category && { category }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
    ...(search && { search }),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Transactions</h1>
        <Link href="/transactions/new">
          <QuickAddButton onClick={() => {}} />
        </Link>
      </div>

      <TransactionFilters
        filters={filters}
        accounts={accounts.items}
        categories={categories.items}
        onFilterChange={(updatedFilters) => {
          const params = new URLSearchParams({
            ...(updatedFilters.accountId && { accountId: updatedFilters.accountId }),
            ...(updatedFilters.category && { category: updatedFilters.category }),
            ...(updatedFilters.dateFrom && { dateFrom: updatedFilters.dateFrom.toISOString() }),
            ...(updatedFilters.dateTo && { dateTo: updatedFilters.dateTo.toISOString() }),
            ...(updatedFilters.search && { search: updatedFilters.search }),
          });
          // Navigate to same page with new filters
          window.location.search = params.toString();
        }}
        onReset={() => {
          window.location.href = "/transactions";
        }}
        disabled={false}
      />

      <TransactionListClient
        serverData={{
          transactions: transactions.items as any,
          total: transactions.total,
          page: transactions.page,
          limit: transactions.limit,
          refetch: () => {
            window.location.reload();
          },
        }}
      />
    </div>
  );
}

export const metadata: Metadata = {
  title: "Transactions",
  description: "View and manage your transactions",
};

