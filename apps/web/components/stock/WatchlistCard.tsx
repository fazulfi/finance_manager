"use client";

import { api } from "@finance/api/react";
import type { StockSearchResult } from "@finance/types";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, toast } from "@finance/ui";
import { BellPlus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { StockSearch } from "./StockSearch";

const PAGE_SIZE = 8;

const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

interface WatchlistCardProps {
  onCreateAlert?: (stockId: string) => void;
}

export function WatchlistCard({ onCreateAlert }: WatchlistCardProps): React.JSX.Element {
  const [page, setPage] = useState(1);
  const utils = api.useContext();

  const watchlistQuery = api.stock.getWatchlist.useQuery(
    { page, limit: PAGE_SIZE },
    { keepPreviousData: true },
  );

  const addToWatchlist = api.stock.addToWatchlist.useMutation({
    onSuccess: async () => {
      toast({
        title: "Watchlist diperbarui",
        description: "Saham berhasil ditambahkan ke watchlist.",
      });
      await Promise.all([utils.stock.getWatchlist.invalidate(), utils.stock.search.invalidate()]);
    },
    onError: (error) => {
      toast({
        title: "Gagal menambahkan saham",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeFromWatchlist = api.stock.removeFromWatchlist.useMutation({
    onSuccess: async () => {
      toast({
        title: "Saham dihapus",
        description: "Saham berhasil dihapus dari watchlist.",
      });
      await utils.stock.getWatchlist.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Gagal menghapus saham",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const watchlist = useMemo(() => watchlistQuery.data?.items ?? [], [watchlistQuery.data?.items]);
  const totalPages = watchlistQuery.data
    ? Math.max(1, Math.ceil(watchlistQuery.data.total / watchlistQuery.data.limit))
    : 1;

  const handleSelectStock = (stock: StockSearchResult) => {
    addToWatchlist.mutate({ ticker: stock.ticker });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Watchlist</CardTitle>
        <CardDescription>
          Pantau saham IDX tanpa harus membelinya terlebih dahulu.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <StockSearch onSelectStock={handleSelectStock} disabled={addToWatchlist.isLoading} />

        {watchlistQuery.isLoading && !watchlistQuery.data && (
          <div className="rounded-md border p-4 text-sm text-muted-foreground">
            Memuat watchlist...
          </div>
        )}

        {watchlistQuery.isError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Gagal memuat watchlist. {watchlistQuery.error.message}
          </div>
        )}

        {!watchlistQuery.isLoading && !watchlistQuery.isError && watchlist.length === 0 && (
          <div className="rounded-md border border-dashed p-6 text-center">
            <p className="text-sm font-medium">Belum ada saham di watchlist.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cari ticker IDX di atas untuk menambahkan saham.
            </p>
          </div>
        )}

        {!watchlistQuery.isLoading && !watchlistQuery.isError && watchlist.length > 0 && (
          <div className="space-y-2">
            {watchlist.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{item.stock.ticker}</p>
                    <span className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      {item.stock.sector}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.stock.name}</p>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium">{idrFormatter.format(item.stock.lastPrice)}</span>
                    <span
                      className={`font-semibold ${
                        item.stock.changePercent >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {item.stock.changePercent >= 0 ? "+" : ""}
                      {item.stock.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => onCreateAlert?.(item.stock.id)}
                  >
                    <BellPlus className="h-4 w-4" />
                    Alert
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1 text-destructive"
                    onClick={() => removeFromWatchlist.mutate({ watchlistId: item.id })}
                    disabled={removeFromWatchlist.isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                    Hapus
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || watchlistQuery.isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || watchlistQuery.isFetching}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

