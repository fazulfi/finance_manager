import { createTRPCContext, debtRouter } from "@finance/api";
import { db } from "@finance/db";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@finance/ui";
import type { Metadata } from "next";

import { auth } from "@/auth";
import { DebtCard, DebtForm, SnowballCalculator } from "@/components/debts";

export const metadata: Metadata = {
  title: "Debts",
  description: "Track balances, payoff schedules, and debt snowball progress",
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export default async function DebtsPage(): Promise<React.JSX.Element> {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Debts</h1>
            <p className="text-sm text-muted-foreground">
              Manage balances, preview payoff schedules, and plan your snowball strategy.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            { label: "Total remaining", value: formatMoney(0) },
            { label: "Monthly minimum", value: formatMoney(0) },
            { label: "Weighted interest", value: formatPercent(0) },
          ].map((item) => (
            <Card key={item.label}>
              <CardHeader className="pb-2">
                <CardDescription>{item.label}</CardDescription>
                <CardTitle className="font-mono text-2xl tabular-nums">{item.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="rounded-lg border border-dashed p-10 text-center">
          <h2 className="text-lg font-semibold">No debts yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your first debt to see payoff insights and snowball recommendations.
          </p>
        </div>
      </div>
    );
  }

  try {
    const ctx = createTRPCContext({ session, db });
    const trpc = debtRouter.createCaller(ctx);
    const [debts, summary] = await Promise.all([
      trpc.list({ page: 1, limit: 100 }),
      trpc.getSummary(),
    ]);

    return (
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Debts</h1>
            <p className="text-sm text-muted-foreground">
              Manage balances, preview payoff schedules, and plan your snowball strategy.
            </p>
          </div>
          <DebtForm
            mode="create"
            trigger={<Button type="button">Add debt</Button>}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total remaining</CardDescription>
              <CardTitle className="font-mono text-2xl tabular-nums">
                {formatMoney(summary.totalRemaining)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Paid {formatMoney(summary.totalPaid)} of {formatMoney(summary.totalAmount)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Monthly minimum</CardDescription>
              <CardTitle className="font-mono text-2xl tabular-nums">
                {formatMoney(summary.totalMinPayment)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Required across all active debts.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Weighted interest</CardDescription>
              <CardTitle className="font-mono text-2xl tabular-nums">
                {formatPercent(summary.weightedInterestRate)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Overall payoff progress: {formatPercent(summary.payoffPercent)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
          <section className="space-y-4">
            {debts.items.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center">
                <h2 className="text-lg font-semibold">No debts yet</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add a debt to start tracking balances, schedules, and repayment order.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {debts.items.map((debt) => (
                  <DebtCard key={debt.id} debt={debt} />
                ))}
              </div>
            )}
          </section>

          <aside>
            <SnowballCalculator debts={debts.items} />
          </aside>
        </div>
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load debts.";

    return (
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Debts</h1>
          <p className="text-sm text-muted-foreground">
            Manage balances, preview payoff schedules, and plan your snowball strategy.
          </p>
        </div>

        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive">Unable to load debts</h2>
          <p className="mt-2 text-sm text-destructive">{message}</p>
        </div>
      </div>
    );
  }
}
