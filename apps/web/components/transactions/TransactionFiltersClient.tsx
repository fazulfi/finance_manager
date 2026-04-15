"use client";

import { Button } from "@finance/ui";
import { Filter, X } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

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
  onFilterChange: (filters: Partial<TransactionFiltersProps["filters"]>) => void;
  onReset: () => void;
  disabled?: boolean;
}

export function TransactionFiltersClient({
  filters,
  accounts,
  categories,
  onFilterChange,
  onReset,
  disabled = false,
}: TransactionFiltersProps): React.JSX.Element {
  const [searchDraft, setSearchDraft] = useState(filters.search ?? "");

  useEffect(() => {
    setSearchDraft(filters.search ?? "");
  }, [filters.search]);

  const hasActiveFilters =
    !!filters.accountId || !!filters.category || !!filters.dateFrom || !!filters.dateTo;

  const handleFilterChange = useCallback((updatedFilters: any) => {
    const params = new URLSearchParams(window.location.search);
    if (updatedFilters.accountId !== undefined) {
      if (updatedFilters.accountId) {
        params.set("accountId", updatedFilters.accountId);
      } else {
        params.delete("accountId");
      }
    }
    if (updatedFilters.category !== undefined) {
      if (updatedFilters.category) {
        params.set("category", updatedFilters.category);
      } else {
        params.delete("category");
      }
    }
    if (updatedFilters.dateFrom !== undefined) {
      params.set("dateFrom", updatedFilters.dateFrom.toISOString());
    }
    if (updatedFilters.dateTo !== undefined) {
      params.set("dateTo", updatedFilters.dateTo.toISOString());
    }
    if (updatedFilters.search !== undefined) {
      if (updatedFilters.search) {
        params.set("search", updatedFilters.search);
      } else {
        params.delete("search");
      }
    }
    const url = new URL(window.location.href);
    url.search = params.toString();
    window.location.href = url.toString();
  }, []);

  const handleReset = useCallback(() => {
    window.location.href = "/transactions";
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchDraft(value);
      const params = new URLSearchParams(window.location.search);
      if (value.trim()) {
        params.set("search", value.trim());
      } else {
        params.delete("search");
      }
      const url = new URL(window.location.href);
      url.search = params.toString();
      if (Object.keys(params).length > 0 || hasActiveFilters) {
        window.location.href = url.toString();
      }
    },
    [hasActiveFilters],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Filters</h3>
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <div className="space-y-2">
          <label htmlFor="search" className="text-sm font-medium">
            Search
          </label>
          <input
            id="search"
            type="text"
            value={searchDraft}
            onChange={handleSearchChange}
            placeholder="Search transactions..."
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="accountFilter" className="text-sm font-medium">
            Account
          </label>
          <select
            id="accountFilter"
            value={filters.accountId || ""}
            onChange={(e) => {
              const value = e.target.value || undefined;
              handleFilterChange({ accountId: value });
            }}
            disabled={disabled}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="categoryFilter" className="text-sm font-medium">
            Category
          </label>
          <select
            id="categoryFilter"
            value={filters.category || ""}
            onChange={(e) => {
              const value = e.target.value || undefined;
              handleFilterChange({ category: value });
            }}
            disabled={disabled}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {filters.dateFrom && (
          <div className="space-y-2">
            <label htmlFor="dateFrom" className="text-sm font-medium">
              From
            </label>
            <input
              id="dateFrom"
              type="date"
              value={filters.dateFrom.toISOString().split("T")[0]}
              onChange={(e) => handleFilterChange({ dateFrom: new Date(e.target.value) })}
              disabled={disabled}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        )}

        {filters.dateTo && (
          <div className="space-y-2">
            <label htmlFor="dateTo" className="text-sm font-medium">
              To
            </label>
            <input
              id="dateTo"
              type="date"
              value={filters.dateTo.toISOString().split("T")[0]}
              onChange={(e) => handleFilterChange({ dateTo: new Date(e.target.value) })}
              disabled={disabled}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        )}

        {hasActiveFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={handleReset} className="w-full">
            <X className="mr-2 h-4 w-4" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
