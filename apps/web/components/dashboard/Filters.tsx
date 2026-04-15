// apps/web/components/dashboard/Filters.tsx
"use client";

import { Button } from "@finance/ui";
import { Calendar, Filter, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

interface FilterState {
  dateFrom: Date | null;
  dateTo: Date | null;
  accountId: string | null;
  category: string | null;
}

interface FiltersProps {
  initialFilters?: Partial<FilterState>;
  onFiltersChange: (filters: FilterState) => void;
}

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function Filters({ initialFilters = {}, onFiltersChange }: FiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize filters from props or URL params
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: initialFilters.dateFrom ?? null,
    dateTo: initialFilters.dateTo ?? null,
    accountId: initialFilters.accountId ?? null,
    category: initialFilters.category ?? null,
  });

  const debouncedFilters = useDebounce(filters, 300);

  useEffect(() => {
    onFiltersChange(debouncedFilters);
  }, [debouncedFilters, onFiltersChange]);

  // Update URL when debounced filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedFilters.dateFrom) {
      params.set("dateFrom", debouncedFilters.dateFrom.toISOString());
    }
    if (debouncedFilters.dateTo) {
      params.set("dateTo", debouncedFilters.dateTo.toISOString());
    }
    if (debouncedFilters.accountId) {
      params.set("accountId", debouncedFilters.accountId);
    }
    if (debouncedFilters.category) {
      params.set("category", debouncedFilters.category);
    }
    const newUrl = params.toString() ? `?${params.toString()}` : "";
    router.replace(newUrl, { scroll: false });
  }, [debouncedFilters, router]);

  // Sync filters from URL on mount
  useEffect(() => {
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const accountId = searchParams.get("accountId");
    const category = searchParams.get("category");

    if (dateFrom) setFilters((prev) => ({ ...prev, dateFrom: new Date(dateFrom) }));
    if (dateTo) setFilters((prev) => ({ ...prev, dateTo: new Date(dateTo) }));
    if (accountId) setFilters((prev) => ({ ...prev, accountId }));
    if (category) setFilters((prev) => ({ ...prev, category }));
  }, [searchParams]);

  const handlePresetClick = (days: number) => {
    const dateTo = new Date();
    const dateFrom = new Date(dateTo.getTime() - days * 24 * 60 * 60 * 1000);
    setFilters((prev) => ({
      ...prev,
      dateFrom,
      dateTo,
      accountId: prev.accountId,
      category: prev.category,
    }));
    setShowFilters(false);
  };

  const handleClearAll = () => {
    setFilters({
      dateFrom: null,
      dateTo: null,
      accountId: null,
      category: null,
    });
    setShowFilters(false);
    router.replace("/dashboard", { scroll: false });
  };

  const hasActiveFilters =
    filters.dateFrom || filters.dateTo || filters.accountId || filters.category;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="mr-2 h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>

      {/* Date Range Presets */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "7D", days: 7 },
          { label: "30D", days: 30 },
          { label: "3M", days: 90 },
          { label: "6M", days: 180 },
          { label: "1Y", days: 365 },
        ].map((preset) => (
          <Button
            key={preset.label}
            variant={hasActiveFilters ? "outline" : "default"}
            size="sm"
            onClick={() => handlePresetClick(preset.days)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Toggle Advanced Filters */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowFilters(!showFilters)}
        className="w-full justify-start"
      >
        <Filter className="mr-2 h-4 w-4" />
        {showFilters ? "Hide" : "Show"} Advanced Filters
      </Button>

      {/* Advanced Filters Form */}
      {showFilters && (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Date Range</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">From</label>
              <input
                type="date"
                value={filters.dateFrom?.toISOString().split("T")[0] || ""}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : null;
                  setFilters((prev) => ({ ...prev, dateFrom: date }));
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">To</label>
              <input
                type="date"
                value={filters.dateTo?.toISOString().split("T")[0] || ""}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : null;
                  setFilters((prev) => ({ ...prev, dateTo: date }));
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>

          {/* Account and Category selectors would go here */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Account
              </label>
              <select
                value={filters.accountId || ""}
                onChange={(e) => {
                  setFilters((prev) => ({
                    ...prev,
                    accountId: e.target.value || null,
                  }));
                }}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
              >
                <option value="">All Accounts</option>
                <option value="all">All Accounts</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Category
              </label>
              <select
                value={filters.category || ""}
                onChange={(e) => {
                  setFilters((prev) => ({
                    ...prev,
                    category: e.target.value || null,
                  }));
                }}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
              >
                <option value="">All Categories</option>
                <option value="all">All Categories</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
