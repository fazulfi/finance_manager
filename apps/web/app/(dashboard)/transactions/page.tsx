// apps/web/app/(dashboard)/transactions/page.tsx
import { transactionRouter, accountRouter, categoryRouter, createTRPCContext } from "@finance/api";
import { db } from "@finance/db";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@finance/ui";

import { auth } from "@/auth";
import { QuickAddButton } from "@/components/transactions/QuickAddButton";
import { QuickAddSheet } from "@/components/transactions/QuickAddSheet";
import { TransactionsFiltersWrapper } from "@/components/transactions/TransactionFiltersWrapper";
import { TransactionListClient } from "@/components/transactions/TransactionList";
import { ExportButton } from "@/components/common/ExportButton";

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
        <div className="flex items-center gap-3">
          <ExportButton
            type="transactions"
            filters={{
              dateFrom: dateFrom?.toISOString(),
              dateTo: dateTo?.toISOString(),
              accountId,
              category,
              search,
            }}
          />
          {typeof window !== "undefined" ? (
            <Link href="/transactions/new">
              <QuickAddButton onClick={() => {}} />
            </Link>
          ) : (
            <Link href="/transactions/new" className={buttonVariants()}>
              Add transaction
            </Link>
          )}
        </div>
      </div>

      <TransactionsFiltersWrapper
        filters={filters}
        accounts={accounts.items}
        categories={categories.items}
        onFilterChange={(updatedFilters: any) => {
          // Handler passed to Client component, so this should be safe
          console.log("Filter change:", updatedFilters);
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
