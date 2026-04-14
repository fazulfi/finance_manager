"use client";

import { api } from "@finance/api/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@finance/ui";
import { Landmark, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { AssetsBreakdown } from "@/components/net-worth/AssetsBreakdown";
import { LiabilitiesBreakdown } from "@/components/net-worth/LiabilitiesBreakdown";
import { NetWorthChart } from "@/components/net-worth/NetWorthChart";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function NetWorthPage() {
  const netWorthQuery = api.netWorth.calculateNetWorth.useQuery();
  const historyQuery = api.netWorth.getNetWorthHistory.useQuery({
    months: 24,
    includeCurrent: true,
  });

  const summary = netWorthQuery.data;
  const history = historyQuery.data?.items ?? [];
  const isGrowthPositive = (summary?.growthRate ?? 0) >= 0;

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Net Worth</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor your assets, liabilities, and long-term wealth growth.
        </p>
      </div>

      {netWorthQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-950">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Worth</p>
                <p className="text-xl font-bold tabular-nums">{formatCurrency(summary?.netWorth ?? 0)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-950">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Assets</p>
                <p className="text-xl font-bold tabular-nums">
                  {formatCurrency(summary?.assetsTotal ?? 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-rose-100 p-3 dark:bg-rose-950">
                <Landmark className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Liabilities</p>
                <p className="text-xl font-bold tabular-nums">
                  {formatCurrency(summary?.liabilitiesTotal ?? 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div
                className={`rounded-full p-3 ${
                  isGrowthPositive ? "bg-emerald-100 dark:bg-emerald-950" : "bg-rose-100 dark:bg-rose-950"
                }`}
              >
                {isGrowthPositive ? (
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-rose-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Growth</p>
                <p className={`text-xl font-bold tabular-nums ${isGrowthPositive ? "text-emerald-600" : "text-rose-600"}`}>
                  {isGrowthPositive ? "+" : ""}
                  {(summary?.growthRate ?? 0).toFixed(2)}%
                </p>
                <p className={`text-xs ${isGrowthPositive ? "text-emerald-600" : "text-rose-600"}`}>
                  {isGrowthPositive ? "+" : ""}
                  {formatCurrency(summary?.growthAmount ?? 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historical Trend</CardTitle>
          <CardDescription>Monthly net worth snapshots and current live value</CardDescription>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? <Skeleton className="h-80 w-full" /> : <NetWorthChart items={history} />}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
            <CardDescription>Breakdown of your assets by source</CardDescription>
          </CardHeader>
          <CardContent>
            {netWorthQuery.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <>
                <AssetsBreakdown items={summary?.assetsBreakdown ?? []} />
                <div className="mt-3 space-y-1.5">
                  {(summary?.assetsBreakdown ?? []).map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-medium">{item.percentage.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Liabilities Breakdown</CardTitle>
            <CardDescription>Debt composition by liability type</CardDescription>
          </CardHeader>
          <CardContent>
            {netWorthQuery.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <>
                <LiabilitiesBreakdown items={summary?.liabilitiesBreakdown ?? []} />
                <div className="mt-3 space-y-1.5">
                  {(summary?.liabilitiesBreakdown ?? []).map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {item.name
                          .toLowerCase()
                          .split("_")
                          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                          .join(" ")}
                      </span>
                      <span className="font-medium">{item.percentage.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
