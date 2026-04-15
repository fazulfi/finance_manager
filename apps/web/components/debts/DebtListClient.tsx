"use client";

import { api } from "@finance/api/react";
import { Button, Skeleton } from "@finance/ui";
import { Filter, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const INPUT_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

type DebtStatus = "" | "active" | "paid_off";

interface DebtListClientProps {
  initialSearch?: string | undefined;
  initialStatus?: string | undefined;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function DebtListClient({
  initialSearch = "",
  initialStatus = "",
}: DebtListClientProps): React.JSX.Element {
  const router = useRouter();
  const [searchDraft, setSearchDraft] = useState(initialSearch);
  const [statusDraft, setStatusDraft] = useState<DebtStatus>(initialStatus as DebtStatus);

  useEffect(() => {
    setSearchDraft(initialSearch);
    setStatusDraft(initialStatus as DebtStatus);
  }, [initialSearch, initialStatus]);

  const hasActiveFilters = !!(initialSearch || initialStatus);

  const debtsQuery = api.debt.list.useQuery({ page: 1, limit: 100 }, { keepPreviousData: true });

  // Client-side filter by search + status
  const filteredDebts = useMemo(() => {
    const items = debtsQuery.data?.items ?? [];
    return items.filter((debt) => {
      const matchesSearch =
        !initialSearch || debt.name.toLowerCase().includes(initialSearch.toLowerCase());
      const matchesStatus =
        !initialStatus ||
        (initialStatus === "active" ? debt.remaining > 0 : debt.remaining === 0);
      return matchesSearch && matchesStatus;
    });
  }, [debtsQuery.data?.items, initialSearch, initialStatus]);

  const buildUrl = (search: string, status: string) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const qs = params.toString();
    return `/debts${qs ? `?${qs}` : ""}`;
  };

  const applyFilters = () => {
    router.push(buildUrl(searchDraft, statusDraft));
  };

  const clearFilters = () => {
    router.push("/debts");
  };

  const handleStatusChange = (value: DebtStatus) => {
    setStatusDraft(value);
    router.push(buildUrl(searchDraft, value));
  };

  if (debtsQuery.isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (debtsQuery.isError) {
    return (
      <p className="text-sm text-destructive">
        Failed to load debts. {debtsQuery.error.message}
      </p>
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

        {initialStatus && (
          <p className="text-sm text-muted-foreground">
            Status:{" "}
            <span className="font-medium capitalize">
              {initialStatus === "paid_off" ? "Paid Off" : "Active"}
            </span>
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="debt-search" className="text-sm font-medium">
              Search
            </label>
            <input
              id="debt-search"
              aria-label="Search debts"
              type="text"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Search debts..."
              className={INPUT_CLASS}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="debt-status" className="text-sm font-medium">
              Status
            </label>
            <select
              id="debt-status"
              aria-label="Filter by status"
              value={statusDraft}
              onChange={(e) => handleStatusChange(e.target.value as DebtStatus)}
              className={INPUT_CLASS}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="paid_off">Paid Off</option>
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

      {/* Debt table */}
      {filteredDebts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters ? "No debts match your filters." : "No debts yet."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Remaining</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredDebts.map((debt) => (
                <tr key={debt.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{debt.name}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">
                    {debt.type.replace(/_/g, " ").toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {formatMoney(debt.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {formatMoney(debt.remaining)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {debt.interestRate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
