"use client";

import { Button } from "@finance/ui";
import { Filter, X } from "lucide-react";
import { useState, useCallback } from "react";

interface TransactionFiltersProps {
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

const INPUT_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function TransactionFiltersClient({
  filters,
  accounts,
  categories,
  disabled = false,
}: TransactionFiltersProps): React.JSX.Element {
  const [draft, setDraft] = useState({
    search: filters.search ?? "",
    accountId: filters.accountId ?? "",
    category: filters.category ?? "",
    dateFrom: filters.dateFrom ? (filters.dateFrom.toISOString().split("T")[0] ?? "") : "",
    dateTo: filters.dateTo ? (filters.dateTo.toISOString().split("T")[0] ?? "") : "",
  });

  const hasActiveFilters = !!(
    filters.accountId ||
    filters.category ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.search
  );
  const hasActiveDateFilter = !!(filters.dateFrom || filters.dateTo);

  const buildUrl = useCallback(
    (overrides: Partial<typeof draft> = {}) => {
      const merged = { ...draft, ...overrides };
      const params = new URLSearchParams();
      if (merged.search) params.set("search", merged.search);
      if (merged.accountId) params.set("accountId", merged.accountId);
      if (merged.category) params.set("category", merged.category);
      if (merged.dateFrom) params.set("dateFrom", merged.dateFrom);
      if (merged.dateTo) params.set("dateTo", merged.dateTo);
      const qs = params.toString();
      return `/transactions${qs ? `?${qs}` : ""}`;
    },
    [draft],
  );

  const applyFilters = useCallback(() => {
    window.location.href = buildUrl();
  }, [buildUrl]);

  const clearFilters = useCallback(() => {
    window.location.href = "/transactions";
  }, []);

  const handleCategoryChange = useCallback(
    (value: string) => {
      setDraft((d) => ({ ...d, category: value }));
      window.location.href = buildUrl({ category: value });
    },
    [buildUrl],
  );

  const handleAccountChange = useCallback(
    (value: string) => {
      setDraft((d) => ({ ...d, accountId: value }));
      window.location.href = buildUrl({ accountId: value });
    },
    [buildUrl],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Filters</h3>
      </div>

      {hasActiveDateFilter && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Date range:</span>
          <span>
            {filters.dateFrom?.toLocaleDateString()} – {filters.dateTo?.toLocaleDateString()}
          </span>
        </div>
      )}

      <div className="space-y-3 rounded-lg border bg-card p-4">
        {/* Search */}
        <div className="space-y-2">
          <label htmlFor="tx-search" className="text-sm font-medium">
            Search
          </label>
          <input
            id="tx-search"
            aria-label="Search transactions"
            type="text"
            value={draft.search}
            onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value }))}
            placeholder="Search transactions..."
            disabled={disabled}
            className={INPUT_CLASS}
          />
        </div>

        {/* Account */}
        <div className="space-y-2">
          <label htmlFor="tx-account" className="text-sm font-medium">
            Account
          </label>
          <select
            id="tx-account"
            aria-label="Filter by account"
            value={draft.accountId}
            onChange={(e) => handleAccountChange(e.target.value)}
            disabled={disabled}
            className={INPUT_CLASS}
          >
            <option value="">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label htmlFor="tx-category" className="text-sm font-medium">
            Category
          </label>
          <select
            id="tx-category"
            aria-label="Filter by category"
            value={draft.category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            disabled={disabled}
            className={INPUT_CLASS}
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label htmlFor="tx-date-from" className="text-sm font-medium">
              From date
            </label>
            <input
              id="tx-date-from"
              aria-label="From date"
              type="date"
              value={draft.dateFrom}
              onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))}
              disabled={disabled}
              className={INPUT_CLASS}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="tx-date-to" className="text-sm font-medium">
              To date
            </label>
            <input
              id="tx-date-to"
              aria-label="To date"
              type="date"
              value={draft.dateTo}
              onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))}
              disabled={disabled}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={applyFilters}
            disabled={disabled}
            size="sm"
            className="flex-1"
          >
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
    </div>
  );
}
