"use client";

import { api } from "@finance/api/react";
import { Button, Skeleton, toast } from "@finance/ui";
import { AlertCircle, Filter, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";

const PAGE_SIZE = 20;

const ACCOUNT_TYPE_OPTIONS = [
  { label: "All types", value: "" },
  { label: "Checking Account", value: "CHECKING" },
  { label: "Savings Account", value: "SAVINGS" },
  { label: "Credit Card", value: "CREDIT" },
  { label: "Investment", value: "INVESTMENT" },
  { label: "Cash", value: "CASH" },
  { label: "Other", value: "OTHER" },
] as const;

const INPUT_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

interface AccountListProps {
  initialSearch?: string | undefined;
  initialType?: string | undefined;
}

export function AccountList({ initialSearch = "", initialType = "" }: AccountListProps): React.JSX.Element {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState(initialSearch);
  const [typeDraft, setTypeDraft] = useState(initialType);

  // Sync draft state when URL params change (page navigation)
  useEffect(() => {
    setSearchDraft(initialSearch);
    setTypeDraft(initialType);
  }, [initialSearch, initialType]);

  const hasActiveFilters = !!(initialSearch || initialType);

  const listInput = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(initialType ? { type: initialType as any } : {}),
    }),
    [page, initialType],
  );

  const utils = api.useContext();
  const accountsQuery = api.account.list.useQuery(listInput, {
    keepPreviousData: true,
  });

  // Client-side search filter on top of server results
  const filteredItems = useMemo(() => {
    const items = accountsQuery.data?.items ?? [];
    if (!initialSearch) return items;
    const q = initialSearch.toLowerCase();
    return items.filter(
      (a) => a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q),
    );
  }, [accountsQuery.data?.items, initialSearch]);

  const currentLimit = accountsQuery.data?.limit ?? PAGE_SIZE;
  const totalPages = accountsQuery.data
    ? Math.max(1, Math.ceil(accountsQuery.data.total / currentLimit))
    : 1;

  useEffect(() => {
    if (accountsQuery.data && page > totalPages) setPage(totalPages);
  }, [accountsQuery.data, page, totalPages]);

  const deleteAccount = api.account.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.account.list.cancel(listInput);
      const previous = utils.account.list.getData(listInput);
      utils.account.list.setData(listInput, (old) => {
        if (!old) return old;
        return { ...old, items: old.items.filter((item) => item.id !== id), total: Math.max(0, old.total - 1) };
      });
      return { previous, queryInput: listInput };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) utils.account.list.setData(context.queryInput, context.previous);
      toast({ title: "Failed to delete account", description: error.message, variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Account deleted", description: "The account has been removed from your list." });
    },
    onSettled: async () => {
      await utils.account.list.invalidate();
    },
  });

  const buildUrl = (search: string, type: string) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (type) params.set("type", type);
    const qs = params.toString();
    return `/accounts${qs ? `?${qs}` : ""}`;
  };

  const applyFilters = () => {
    router.push(buildUrl(searchDraft, typeDraft));
  };

  const clearFilters = () => {
    router.push("/accounts");
  };

  const handleTypeChange = (value: string) => {
    setTypeDraft(value);
    router.push(buildUrl(searchDraft, value));
  };

  if (accountsQuery.isLoading && !accountsQuery.data) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
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
        <Button type="button" variant="outline" className="mt-4" onClick={() => accountsQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter bar */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Filters</span>
        </div>

        {initialType && (
          <p className="text-sm text-muted-foreground">
            Type:{" "}
            <span className="font-medium">
              {ACCOUNT_TYPE_OPTIONS.find((o) => o.value === initialType)?.label ?? initialType}
            </span>
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="account-search" className="text-sm font-medium">
              Search
            </label>
            <input
              id="account-search"
              aria-label="Search accounts"
              type="text"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Search accounts..."
              className={INPUT_CLASS}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="account-type" className="text-sm font-medium">
              Type
            </label>
            <select
              id="account-type"
              aria-label="Filter by type"
              value={typeDraft}
              onChange={(e) => handleTypeChange(e.target.value)}
              className={INPUT_CLASS}
            >
              {ACCOUNT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={applyFilters} className="flex-1">
            Apply Filters
          </Button>
          {hasActiveFilters && (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Account table */}
      {filteredItems.length === 0 ? (
        <EmptyState
          title="No accounts found"
          description={
            hasActiveFilters
              ? "Try adjusting your search or filters."
              : "Create your first account to start tracking balances."
          }
        />
      ) : (
        <div className="rounded-lg border overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Account</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Currency</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Balance</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredItems.map((account) => (
                <tr key={account.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{account.name}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">
                    {account.type.replace(/_/g, " ").toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{account.currency}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {account.balance.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAccount.mutate({ id: account.id })}
                      disabled={deleteAccount.isLoading}
                      aria-label={`Delete ${account.name}`}
                      className="text-destructive hover:text-destructive"
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Page {accountsQuery.data?.page ?? 1} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || accountsQuery.isFetching}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
