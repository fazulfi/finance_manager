import type { Metadata } from "next";

import { StocksWorkspace } from "@/components/stock/StocksWorkspace";

export const metadata: Metadata = {
  title: "Stocks",
  description: "IDX stock watchlist and price alerts",
};

export default function StocksPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock Watchlist</h1>
        <p className="text-sm text-muted-foreground">
          Cari ticker IDX, simpan ke watchlist, lalu buat alert saat harga menyentuh target.
        </p>
      </div>

      <StocksWorkspace />
    </div>
  );
}

