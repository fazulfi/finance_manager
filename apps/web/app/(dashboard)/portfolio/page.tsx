"use client";

import { api } from "@finance/api/react";
import type { PortfolioHolding } from "@finance/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  toast,
} from "@finance/ui";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  RefreshCw,
  DollarSign,
  BarChart3,
  Wallet,
} from "lucide-react";
import { useState } from "react";

import { PortfolioChart } from "@/components/portfolio/PortfolioChart";
import { StockCard } from "@/components/portfolio/StockCard";
import { StockForm } from "@/components/portfolio/StockForm";

export default function PortfolioPage() {
  const [showForm, setShowForm] = useState(false);
  const [editHolding, setEditHolding] = useState<PortfolioHolding | undefined>();
  const utils = api.useContext();

  const { data: portfolio, isLoading } = api.stock.getPortfolioValue.useQuery(undefined, {
    refetchInterval: 15 * 60 * 1000, // re-fetch every 15 min
  });

  const refreshPrices = api.stock.refreshPrices.useMutation({
    onSuccess: (res) => {
      utils.stock.getPortfolioValue.invalidate();
      utils.stock.list.invalidate();
      toast({
        title: "Prices refreshed",
        description: `Updated ${res.updated} holdings${res.failed > 0 ? `, ${res.failed} failed` : ""}.`,
      });
    },
    onError: (e) =>
      toast({ title: "Refresh failed", description: e.message, variant: "destructive" }),
  });

  const formatIDR = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);

  const isGain = (portfolio?.totalGain ?? 0) >= 0;

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your stock holdings and performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshPrices.mutate()}
            disabled={refreshPrices.isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshPrices.isLoading ? "animate-spin" : ""}`}
            />
            Refresh Prices
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditHolding(undefined);
              setShowForm(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Holding
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-950">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Portfolio Value</p>
                <p className="text-xl font-bold tabular-nums">
                  {formatIDR(portfolio?.totalValue ?? 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800">
                <DollarSign className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cost Basis</p>
                <p className="text-xl font-bold tabular-nums">
                  {formatIDR(portfolio?.totalCost ?? 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div
                className={`p-3 rounded-full ${isGain ? "bg-emerald-100 dark:bg-emerald-950" : "bg-rose-100 dark:bg-rose-950"}`}
              >
                {isGain ? (
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-rose-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Gain/Loss</p>
                <p
                  className={`text-xl font-bold tabular-nums ${isGain ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {isGain ? "+" : ""}
                  {formatIDR(portfolio?.totalGain ?? 0)}
                </p>
                <p className={`text-xs ${isGain ? "text-emerald-600" : "text-rose-600"}`}>
                  {isGain ? "+" : ""}
                  {(portfolio?.totalGainPercent ?? 0).toFixed(2)}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-full bg-violet-100 dark:bg-violet-950">
                <BarChart3 className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dividends Received</p>
                <p className="text-xl font-bold tabular-nums">
                  {formatIDR(portfolio?.totalDividends ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {portfolio?.holdingCount ?? 0} holding{portfolio?.holdingCount !== 1 ? "s" : ""}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart + Holdings grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Allocation pie chart */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Allocation</CardTitle>
            <CardDescription>Portfolio breakdown by value</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <PortfolioChart holdings={portfolio?.holdings ?? []} />
            )}
          </CardContent>
        </Card>

        {/* Holdings list */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Holdings</h2>
            <span className="text-xs text-muted-foreground">
              {portfolio?.holdingCount ?? 0} positions
            </span>
          </div>

          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)
          ) : (portfolio?.holdings ?? []).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="font-medium text-muted-foreground">No holdings yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add your first stock holding to start tracking
                </p>
                <Button
                  className="mt-4"
                  onClick={() => {
                    setEditHolding(undefined);
                    setShowForm(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Holding
                </Button>
              </CardContent>
            </Card>
          ) : (
            (portfolio?.holdings ?? [])
              .sort((a, b) => b.currentValue - a.currentValue)
              .map((holding) => (
                <StockCard
                  key={holding.id}
                  holding={holding}
                  onEdit={(h) => {
                    setEditHolding(h);
                    setShowForm(true);
                  }}
                />
              ))
          )}
        </div>
      </div>

      {/* Add/Edit form dialog */}
      <StockForm
        open={showForm}
        onOpenChange={setShowForm}
        holding={editHolding ?? undefined}
        onSuccess={() => utils.stock.getPortfolioValue.invalidate()}
      />
    </div>
  );
}
