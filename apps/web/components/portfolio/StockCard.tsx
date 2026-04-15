"use client";

import { api } from "@finance/api/react";
import type { PortfolioHolding } from "@finance/types";
import { Card, CardContent, toast } from "@finance/ui";
import { TrendingUp, TrendingDown, Minus, Trash2, Edit2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface StockCardProps {
  holding: PortfolioHolding;
  onDelete?: () => void;
  onEdit?: (holding: PortfolioHolding) => void;
}

export function StockCard({ holding, onDelete, onEdit }: StockCardProps) {
  const [confirming, setConfirming] = useState(false);
  const utils = api.useContext();

  const deleteHolding = api.stock.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Holding removed", description: `${holding.ticker} removed from portfolio.` });
      utils.stock.getPortfolioValue.invalidate();
      utils.stock.list.invalidate();
      onDelete?.();
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isGain = holding.gain >= 0;
  const isFlat = holding.gain === 0;

  const GainIcon = isFlat ? Minus : isGain ? TrendingUp : TrendingDown;
  const gainColor = isFlat
    ? "text-muted-foreground"
    : isGain
      ? "text-emerald-600"
      : "text-rose-600";
  const gainBg = isFlat
    ? "bg-muted"
    : isGain
      ? "bg-emerald-50 dark:bg-emerald-950"
      : "bg-rose-50 dark:bg-rose-950";

  const formatIDR = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <Link href={`/portfolio/${holding.ticker}`} className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">
                  {holding.ticker.replace(".JK", "").slice(0, 4)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate leading-tight">{holding.ticker}</p>
                <p className="text-xs text-muted-foreground truncate">{holding.name}</p>
              </div>
            </div>
          </Link>

          {/* P&L badge */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${gainBg} shrink-0`}>
            <GainIcon className={`h-3.5 w-3.5 ${gainColor}`} />
            <span className={`text-xs font-semibold ${gainColor}`}>
              {isGain && !isFlat ? "+" : ""}
              {holding.gainPercent.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Price row */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Current Price</p>
            <p className="font-semibold tabular-nums">
              {formatIDR(holding.currentPrice)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg Buy Price</p>
            <p className="font-medium tabular-nums text-muted-foreground">
              {formatIDR(holding.avgBuyPrice)}
            </p>
          </div>
        </div>

        {/* Value row */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Market Value</p>
            <p className="font-semibold tabular-nums">{formatIDR(holding.currentValue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">P&amp;L</p>
            <p className={`font-semibold tabular-nums ${gainColor}`}>
              {isGain && !isFlat ? "+" : ""}
              {formatIDR(holding.gain)}
            </p>
          </div>
        </div>

        {/* Footer row */}
        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{holding.quantity.toLocaleString()} shares</span>
            <span className="text-muted-foreground/40">•</span>
            <span>{holding.allocationPercent.toFixed(1)}% of portfolio</span>
          </div>

          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={() => onEdit(holding)}
                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            )}
            {!confirming ? (
              <button
                onClick={() => setConfirming(true)}
                className="p-1.5 rounded hover:bg-rose-50 text-muted-foreground hover:text-rose-600 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => deleteHolding.mutate({ id: holding.id })}
                  disabled={deleteHolding.isLoading}
                  className="px-2 py-1 rounded bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
                >
                  {deleteHolding.isLoading ? "..." : "Delete"}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="px-2 py-1 rounded hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
