"use client";

import { useState } from "react";

import { PriceAlert } from "./PriceAlert";
import { WatchlistCard } from "./WatchlistCard";

export function StocksWorkspace(): React.JSX.Element {
  const [preselectedStockId, setPreselectedStockId] = useState<string | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <WatchlistCard onCreateAlert={(stockId) => setPreselectedStockId(stockId)} />
      <PriceAlert preselectedStockId={preselectedStockId} />
    </div>
  );
}

