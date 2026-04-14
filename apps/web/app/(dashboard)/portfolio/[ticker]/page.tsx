"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@finance/api/react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
  toast,
} from "@finance/ui";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Trash2,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { PriceChart } from "@/components/portfolio/PriceChart";
import { StockForm } from "@/components/portfolio/StockForm";
import { format } from "date-fns";
import type { PortfolioHolding } from "@finance/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const dividendSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().max(500).optional(),
});
type DividendFormValues = z.infer<typeof dividendSchema>;

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticker = decodeURIComponent(params.ticker as string).toUpperCase();
  const [showEdit, setShowEdit] = useState(false);
  const [showDivForm, setShowDivForm] = useState(false);
  const utils = api.useContext();

  // Fetch holding from portfolio value (contains enriched data)
  const { data: portfolio, isLoading: portfolioLoading } = api.stock.getPortfolioValue.useQuery();
  const holding = portfolio?.holdings.find(
    (h) => h.ticker === ticker || h.ticker === `${ticker}.JK`,
  ) as PortfolioHolding | undefined;

  // Dividends
  const { data: dividendData, isLoading: dividendsLoading } = api.stock.getDividends.useQuery(
    { stockId: holding?.id ?? "", page: 1, limit: 50 },
    { enabled: !!holding?.id },
  );

  const addDividend = api.stock.addDividend.useMutation({
    onSuccess: () => {
      toast({ title: "Dividend added" });
      utils.stock.getDividends.invalidate();
      utils.stock.getPortfolioValue.invalidate();
      setShowDivForm(false);
      reset();
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteDividend = api.stock.deleteDividend.useMutation({
    onSuccess: () => {
      toast({ title: "Dividend deleted" });
      utils.stock.getDividends.invalidate();
      utils.stock.getPortfolioValue.invalidate();
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DividendFormValues>({ resolver: zodResolver(dividendSchema) });

  const onAddDividend = async (data: DividendFormValues) => {
    if (!holding) return;
    await addDividend.mutateAsync({
      stockId: holding.id,
      amount: data.amount,
      date: new Date(data.date),
      notes: data.notes,
    });
  };

  const formatIDR = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);

  if (portfolioLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!holding) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Link
          href="/portfolio"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Portfolio
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="font-semibold text-lg">{ticker} not found</p>
            <p className="text-sm text-muted-foreground mt-1">
              This stock is not in your portfolio.
            </p>
            <Button className="mt-4" onClick={() => router.push("/portfolio")}>
              Go to Portfolio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isGain = holding.gain >= 0;
  const isFlat = holding.gain === 0;
  const GainIcon = isFlat ? Minus : isGain ? TrendingUp : TrendingDown;
  const gainColor = isFlat
    ? "text-muted-foreground"
    : isGain
      ? "text-emerald-600"
      : "text-rose-600";

  const totalDivAmount = dividendData?.items.reduce((s, d) => s + d.amount, 0) ?? 0;

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Nav */}
      <Link
        href="/portfolio"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Portfolio
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">
                {holding.ticker.replace(".JK", "").slice(0, 4)}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{holding.ticker}</h1>
              <p className="text-sm text-muted-foreground">{holding.name}</p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
          Edit Holding
        </Button>
      </div>

      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Current Price</p>
            <p className="text-2xl font-bold tabular-nums mt-1">
              {formatIDR(holding.currentPrice)}
            </p>
            <div className={`flex items-center gap-1 mt-1 ${gainColor}`}>
              <GainIcon className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">
                {isGain && !isFlat ? "+" : ""}
                {holding.gainPercent.toFixed(2)}% total return
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Market Value</p>
            <p className="text-2xl font-bold tabular-nums mt-1">
              {formatIDR(holding.currentValue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {holding.quantity.toLocaleString()} shares @ {formatIDR(holding.avgBuyPrice)} avg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Unrealised P&amp;L</p>
            <p className={`text-2xl font-bold tabular-nums mt-1 ${gainColor}`}>
              {isGain && !isFlat ? "+" : ""}
              {formatIDR(holding.gain)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Cost basis {formatIDR(holding.totalCost)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Price chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Price History</CardTitle>
          <CardDescription>15-minute delayed data from Yahoo Finance</CardDescription>
        </CardHeader>
        <CardContent>
          <PriceChart ticker={holding.ticker} />
        </CardContent>
      </Card>

      {/* Dividends */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Dividends</CardTitle>
              <CardDescription>
                Total received: <span className="font-semibold text-foreground">{formatIDR(totalDivAmount)}</span>
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDivForm((p) => !p)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Add dividend inline form */}
          {showDivForm && (
            <form
              onSubmit={handleSubmit(onAddDividend)}
              className="border rounded-lg p-4 space-y-3 bg-muted/30"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Amount (IDR)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="1"
                    placeholder="500000"
                    {...register("amount")}
                  />
                  {errors.amount && (
                    <p className="text-xs text-destructive">{errors.amount.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="div-date">Date</Label>
                  <Input id="div-date" type="date" {...register("date")} />
                  {errors.date && (
                    <p className="text-xs text-destructive">{errors.date.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="div-notes">Notes (optional)</Label>
                <Input id="div-notes" placeholder="Q3 dividend payment..." {...register("notes")} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  Save Dividend
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => { setShowDivForm(false); reset(); }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Dividend list */}
          {dividendsLoading ? (
            <Skeleton className="h-24" />
          ) : (dividendData?.items ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No dividends recorded. Add your first dividend payment.
            </p>
          ) : (
            <div className="divide-y">
              {dividendData?.items.map((div) => (
                <div
                  key={div.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-violet-50 dark:bg-violet-950">
                      <Calendar className="h-3.5 w-3.5 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{formatIDR(div.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(div.date), "dd MMM yyyy")}
                        {div.notes && ` · ${div.notes}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteDividend.mutate({ id: div.id })}
                    disabled={deleteDividend.isLoading}
                    className="p-1.5 rounded hover:bg-rose-50 text-muted-foreground hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <StockForm
        open={showEdit}
        onOpenChange={setShowEdit}
        holding={holding}
        onSuccess={() => utils.stock.getPortfolioValue.invalidate()}
      />
    </div>
  );
}
