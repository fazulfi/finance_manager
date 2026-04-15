// apps/web/components/transactions/TransactionList.tsx
"use client";

import { api } from "@finance/api/react";
import { Skeleton } from "@finance/ui";
import { Button } from "@finance/ui";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { TransactionItem } from "./TransactionItem";


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
  refetch: () => void;
}

export function TransactionListServer({
  transactions,
  total,
  page,
  limit,
  refetch,
}: TransactionListServerProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pageCount, setPageCount] = useState(Math.ceil(total / limit));

  const loadMoreQuery = api.transaction.list.useQuery(
    { page: page + 1, limit },
    { enabled: false },
  );

  const handleLoadMore = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await loadMoreQuery.refetch();
      if (result.data) setPageCount(Math.ceil(result.data.total / limit));
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasMore = page < pageCount;
  const isAtEnd = page === pageCount;

  return (
    <div className="space-y-4">
      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-lg font-medium text-gray-900">No transactions found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {total === 0
              ? "Create your first transaction to get started"
              : "Try adjusting your filters"}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {transactions.map((transaction) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16 }}
                >
                  <TransactionItem transaction={transaction} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {hasMore && !isAtEnd && !error && (
            <Button
              type="button"
              variant="outline"
              onClick={handleLoadMore}
              disabled={isLoading}
              className="w-full"
            >
              <ArrowDown className="mr-2 h-4 w-4" />
              {isLoading ? "Loading..." : "Load more"}
            </Button>
          )}

          {error && (
            <div className="flex items-center justify-center">
              <Button type="button" variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          )}

          {!hasMore && !isAtEnd && !error && (
            <p className="text-center text-sm text-muted-foreground">
              You've reached the end of your transactions
            </p>
          )}
        </>
      )}
    </div>
  );
}

interface TransactionListClientProps {
  serverData?: TransactionListServerProps;
}

export function TransactionListClient({
  serverData,
}: TransactionListClientProps): React.JSX.Element {
  const listRef = useRef<HTMLDivElement>(null);

  const { data: serverTransactions, isLoading, error } = useServerData(serverData);

  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const parentRef = useRef<HTMLDivElement>(null);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>(
    serverTransactions?.transactions || [],
  );
  const [page, setPage] = useState(serverTransactions?.page || 1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(Math.ceil((serverTransactions?.total || 0) / limit));

  const loadMoreQuery = api.transaction.list.useQuery(
    { page: page + 1, limit },
    { enabled: false },
  );

  const rowVirtualizer = useVirtualizer({
    count: allTransactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 10,
  });

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

  const virtualItems = rowVirtualizer.getVirtualItems();

  const itemsToRender = useMemo(() => {
    return virtualItems.map((virtualRow) => {
      const index = virtualRow.index;
      const transaction = allTransactions[index];

      if (!transaction) return null;

      return (
        <div
          key={transaction.id}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            transform: `translateY(${virtualRow.start}px)`,
          }}
        >
          <TransactionItem transaction={transaction} />
        </div>
      );
    });
  }, [virtualItems, allTransactions, rowVirtualizer]);

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
  const isAtEnd = page === totalPages;

  return (
    <div ref={listRef} className="h-[calc(100vh-200px)] overflow-auto">
      <div ref={parentRef} style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {allTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-gray-900">No transactions found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first transaction to get started
            </p>
          </div>
        ) : (
          <>
            {itemsToRender}
            {hasMore && !isAtEnd && (
              <div className="mt-4">
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
              </div>
            )}
            {!hasMore && !isAtEnd && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                You've reached the end of your transactions
              </p>
            )}
          </>
        )}
      </div>
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
