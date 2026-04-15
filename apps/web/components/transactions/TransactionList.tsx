// apps/web/components/transactions/TransactionList.tsx
"use client";

import { api } from "@finance/api/react";
import { Skeleton } from "@finance/ui";
import { Button } from "@finance/ui";
import { ArrowDown } from "lucide-react";
import { useEffect, useState } from "react";


type Transaction = {
  id: string;
  date: Date;
  amount: number;
  currency: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  category: string;
  subcategory?: string | null;
  project?: string | null;
  description?: string | null;
  accountId: string;
  tags?: string[];
};

interface TransactionListServerProps {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  refetch?: () => void;
}

interface TransactionListClientProps {
  serverData?: TransactionListServerProps;
}

export function TransactionListClient({
  serverData,
}: TransactionListClientProps): React.JSX.Element {
  const { data: serverTransactions, isLoading, error } = useServerData(serverData);

  const [allTransactions, setAllTransactions] = useState<Transaction[]>(
    serverTransactions?.transactions || [],
  );
  const [page, setPage] = useState(serverTransactions?.page || 1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(Math.ceil((serverTransactions?.total || 0) / limit));
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadMoreQuery = api.transaction.list.useQuery(
    { page: page + 1, limit },
    { enabled: false },
  );

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    try {
      const result = await loadMoreQuery.refetch();
      if (result.data) {
        setAllTransactions((prev) => [...prev, ...result.data.items]);
        setPage((prev) => prev + 1);
        setTotalPages(Math.ceil(result.data.total / limit));
      }
    } catch (err) {
      console.error("Failed to load more transactions:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-red-500">Failed to load transactions. Please try again.</p>
      </div>
    );
  }

  const hasMore = page < totalPages;

  if (allTransactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium text-gray-900">No transactions found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Create your first transaction to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {allTransactions.map((t) => (
              <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {new Date(t.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 font-medium">{t.category}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.description ?? "—"}</td>
                <td
                  className={`px-4 py-3 text-right font-mono font-semibold tabular-nums ${
                    t.type === "INCOME" ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {t.type === "INCOME" ? "+" : "-"}
                  {t.amount.toLocaleString()} {t.currency}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <Button
          type="button"
          variant="outline"
          onClick={handleLoadMore}
          disabled={isLoadingMore}
          className="w-full"
        >
          <ArrowDown className="mr-2 h-4 w-4" />
          {isLoadingMore ? "Loading..." : "Load more"}
        </Button>
      )}
    </div>
  );
}

function useServerData(serverData?: TransactionListServerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<TransactionListServerProps | undefined>(serverData);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (serverData) {
      setData(serverData);
    }
  }, [serverData]);

  return { data, isLoading, error };
}
