"use client";

import Link from "next/link";
import { api } from "@finance/api/react";
import { Button, Skeleton, toast, buttonVariants } from "@finance/ui";
import { AlertCircle, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AccountCard } from "./AccountCard";

const PAGE_SIZE = 20;

function AccountCardSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-3 rounded-lg border p-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-9" />
      </div>
    </div>
  );
}

export function AccountList(): React.JSX.Element {
  const [page, setPage] = useState(1);
  const listInput = useMemo(() => ({ page, limit: PAGE_SIZE }), [page]);
  const utils = api.useContext();
  const accountsQuery = api.account.list.useQuery(listInput, {
    keepPreviousData: true,
  });

  const currentLimit = accountsQuery.data?.limit ?? PAGE_SIZE;
  const totalPages = accountsQuery.data
    ? Math.max(1, Math.ceil(accountsQuery.data.total / currentLimit))
    : 1;

  useEffect(() => {
    if (accountsQuery.data && page > totalPages) {
      setPage(totalPages);
    }
  }, [accountsQuery.data, page, totalPages]);

  const deleteAccount = api.account.delete.useMutation({
    onMutate: async ({ id }) => {
      const queryInput = listInput;

      await utils.account.list.cancel(queryInput);

      const previous = utils.account.list.getData(queryInput);

      utils.account.list.setData(queryInput, (old) => {
        if (!old) {
          return old;
        }

        return {
          ...old,
          items: old.items.filter((item) => item.id !== id),
          total: Math.max(0, old.total - 1),
        };
      });

      return { previous, queryInput };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        utils.account.list.setData(context.queryInput, context.previous);
      }
      toast({
        title: "Failed to delete account",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Account deleted",
        description: "The account has been removed from your list.",
      });
    },
    onSettled: async () => {
      await utils.account.list.invalidate();
    },
  });

  if (accountsQuery.isLoading && !accountsQuery.data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <AccountCardSkeleton />
        <AccountCardSkeleton />
        <AccountCardSkeleton />
      </div>
    );
  }

  if (accountsQuery.isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
        <AlertCircle className="mx-auto mb-3 h-5 w-5 text-destructive" aria-hidden="true" />
        <p className="text-sm text-destructive">
          Failed to load accounts. {accountsQuery.error.message}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => accountsQuery.refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (!accountsQuery.data || accountsQuery.data.items.length === 0) {
    if (page > 1) {
      return (
        <div className="space-y-4">
          <div className="rounded-lg border border-dashed p-10 text-center">
            <h2 className="text-lg font-semibold">No accounts on this page</h2>
            <p className="mt-2 text-sm text-muted-foreground">Try going back to a previous page.</p>
          </div>
          <div className="flex items-center justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous page
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <h2 className="text-lg font-semibold">No accounts yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your first account to start tracking balances and transfers.
        </p>
        <Link
          href="/accounts/new"
          className={buttonVariants({ className: "mt-4 inline-flex gap-2" })}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create account
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {accountsQuery.data.items.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            onDelete={(id) => deleteAccount.mutate({ id })}
            isDeleting={deleteAccount.isLoading}
          />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Page {accountsQuery.data.page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || accountsQuery.isFetching}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || accountsQuery.isFetching}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
