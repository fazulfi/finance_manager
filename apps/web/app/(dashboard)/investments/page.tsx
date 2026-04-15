"use client";

import { api } from "@finance/api/react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@finance/ui";
import { CircleDollarSign, PieChart as PieChartIcon, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

import { AssetAllocation } from "@/components/investments/AssetAllocation";
import { InvestmentCard } from "@/components/investments/InvestmentCard";
import { InvestmentForm } from "@/components/investments/InvestmentForm";
import {
  formatCurrency,
  formatTypeLabel,
  INVESTMENT_TYPE_OPTIONS,
  type InvestmentItem,
  type SupportedInvestmentType,
} from "@/components/investments/types";

type FilterType = SupportedInvestmentType | "ALL";

const LIST_LIMIT = 200;

export default function InvestmentsPage() {
  const [filterType, setFilterType] = useState<FilterType>("ALL");
  const [showForm, setShowForm] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<InvestmentItem | undefined>();

  const listQuery = api.investment.list.useQuery({
    page: 1,
    limit: LIST_LIMIT,
    type: filterType === "ALL" ? undefined : filterType,
  });
  const summaryQuery = api.investment.getSummary.useQuery();

  const investments = useMemo(
    () => ((listQuery.data?.items ?? []) as InvestmentItem[]),
    [listQuery.data?.items],
  );

  const summary = summaryQuery.data;
  const totalGain = summary?.totalGain ?? 0;
  const isGain = totalGain >= 0;

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track crypto, mutual funds, gold, deposits, and P2P lending with manual value updates.
          </p>
        </div>

        <div className="flex gap-2">
          <Select value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              {INVESTMENT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => {
              setEditingInvestment(undefined);
              setShowForm(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Investment
          </Button>
        </div>
      </div>

      {summaryQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-950">
                <CircleDollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold tabular-nums">{formatCurrency(summary?.totalCurrentValue ?? 0)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-slate-100 p-3 dark:bg-slate-900">
                <PieChartIcon className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-xl font-bold tabular-nums">{formatCurrency(summary?.totalCost ?? 0)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div
                className={`rounded-full p-3 ${isGain ? "bg-emerald-100 dark:bg-emerald-950" : "bg-rose-100 dark:bg-rose-950"}`}
              >
                {isGain ? (
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-rose-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gain/Loss</p>
                <p className={`text-xl font-bold tabular-nums ${isGain ? "text-emerald-600" : "text-rose-600"}`}>
                  {isGain ? "+" : ""}
                  {formatCurrency(totalGain)}
                </p>
                <p className={`text-xs ${isGain ? "text-emerald-600" : "text-rose-600"}`}>
                  {isGain ? "+" : ""}
                  {(summary?.totalGainPercent ?? 0).toFixed(2)}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Investments</p>
              <p className="text-xl font-bold">{summary?.investmentCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Active records tracked</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Asset Allocation</CardTitle>
            <CardDescription>Breakdown by investment type</CardDescription>
          </CardHeader>
          <CardContent>
            {summaryQuery.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <AssetAllocation items={summary?.byType ?? []} />
            )}
            <div className="mt-3 space-y-1.5">
              {(summary?.byType ?? []).map((item) => (
                <div key={item.type} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{formatTypeLabel(item.type)}</span>
                  <span className="font-medium">{item.allocationPercent.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">All Investments</h2>
            <span className="text-xs text-muted-foreground">{investments.length} items</span>
          </div>

          {listQuery.isLoading ? (
            Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-56" />)
          ) : investments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <PieChartIcon className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="font-medium text-muted-foreground">No investments yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Add your first investment to track ROI and allocation.</p>
                <Button
                  className="mt-4"
                  onClick={() => {
                    setEditingInvestment(undefined);
                    setShowForm(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Investment
                </Button>
              </CardContent>
            </Card>
          ) : (
            investments
              .slice()
              .sort((a, b) => b.currentValue - a.currentValue)
              .map((investment) => (
                <InvestmentCard
                  key={investment.id}
                  investment={investment}
                  onEdit={(item) => {
                    setEditingInvestment(item);
                    setShowForm(true);
                  }}
                />
              ))
          )}
        </div>
      </div>

      <InvestmentForm
        open={showForm}
        onOpenChange={setShowForm}
        investment={editingInvestment}
        onSuccess={() => {
          setEditingInvestment(undefined);
        }}
      />
    </div>
  );
}
