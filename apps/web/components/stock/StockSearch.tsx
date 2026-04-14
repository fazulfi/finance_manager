"use client";

import { api } from "@finance/api/react";
import type { StockSearchResult } from "@finance/types";
import { Input } from "@finance/ui";
import { useEffect, useMemo, useState } from "react";

const SEARCH_DEBOUNCE_MS = 400;

interface StockSearchProps {
  onSelectStock: (stock: StockSearchResult) => void;
  placeholder?: string;
  minLength?: number;
  disabled?: boolean;
}

const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function StockSearch({
  onSelectStock,
  placeholder = "Cari ticker IDX (contoh: BBCA, TLKM)...",
  minLength = 2,
  disabled = false,
}: StockSearchProps): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [query]);

  const searchQuery = api.stock.search.useQuery(
    { searchQuery: debouncedQuery, limit: 10 },
    {
      enabled: debouncedQuery.length >= minLength,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    },
  );

  const results = useMemo(() => searchQuery.data ?? [], [searchQuery.data]);

  const showResults = open && debouncedQuery.length >= minLength;

  const handleSelect = (stock: StockSearchResult) => {
    onSelectStock(stock);
    setQuery("");
    setDebouncedQuery("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => {
            setOpen(false);
          }, 150);
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />

      {showResults && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-md border bg-white shadow-lg">
          {searchQuery.isLoading && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Mencari saham...</div>
          )}

          {searchQuery.isError && (
            <div className="px-3 py-2 text-sm text-destructive">Gagal mengambil data saham.</div>
          )}

          {!searchQuery.isLoading && !searchQuery.isError && results.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Tidak ada ticker yang cocok.
            </div>
          )}

          {!searchQuery.isLoading && !searchQuery.isError && results.length > 0 && (
            <ul className="max-h-80 overflow-y-auto">
              {results.map((stock) => (
                <li key={stock.id}>
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-4 px-3 py-2 text-left transition-colors hover:bg-muted"
                    onClick={() => handleSelect(stock)}
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{stock.ticker}</p>
                      <p className="text-sm text-muted-foreground">{stock.name}</p>
                      <p className="text-xs text-muted-foreground">{stock.sector}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{idrFormatter.format(stock.lastPrice)}</p>
                      <p
                        className={`text-xs font-semibold ${
                          stock.changePercent >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {stock.changePercent >= 0 ? "+" : ""}
                        {stock.changePercent.toFixed(2)}%
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

