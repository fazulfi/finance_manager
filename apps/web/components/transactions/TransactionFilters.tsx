// apps/web/components/transactions/TransactionFilters.tsx
"use client";

import { Filter, X } from "lucide-react";
import { Button } from "@finance/ui";

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

export function TransactionFilters({
  filters,
  accounts,
  categories,
  onFilterChange,
  onReset,
  disabled = false,
}: TransactionFiltersProps): React.JSX.Element {
  const hasActiveFilters =
    filters.accountId !== undefined ||
    filters.category !== undefined ||
    filters.dateFrom !== undefined ||
    filters.dateTo !== undefined ||
    filters.amountMin !== undefined ||
    filters.amountMax !== undefined ||
    filters.search !== undefined;

  return (
    <div className="space-y-4">
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Active filters</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Search
          </label>
          <input
            type="text"
            placeholder="Category or description..."
            value={filters.search ?? ""}
            onChange={(e) => onFilterChange({ search: e.target.value || undefined })}
            disabled={disabled}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Date Range
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={filters.dateFrom ? filters.dateFrom.toISOString().split("T")[0] : ""}
              onChange={(e) =>
                onFilterChange({ dateFrom: e.target.value ? new Date(e.target.value) : undefined })
              }
              disabled={disabled}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <input
              type="date"
              value={filters.dateTo ? filters.dateTo.toISOString().split("T")[0] : ""}
              onChange={(e) =>
                onFilterChange({ dateTo: e.target.value ? new Date(e.target.value) : undefined })
              }
              disabled={disabled}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Amount Range */}
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Amount Range
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Min"
              step="0.01"
              min="0"
              value={filters.amountMin ?? ""}
              onChange={(e) =>
                onFilterChange({
                  amountMin: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              disabled={disabled}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <input
              type="number"
              placeholder="Max"
              step="0.01"
              min="0"
              value={filters.amountMax ?? ""}
              onChange={(e) =>
                onFilterChange({
                  amountMax: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              disabled={disabled}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Reset Button */}
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={!hasActiveFilters || disabled}
            className="w-full"
          >
            <X className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
