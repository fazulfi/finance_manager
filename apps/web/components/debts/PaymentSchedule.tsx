"use client";

import { api } from "@finance/api/react";
import type { DebtType } from "@finance/types";
import { Button, Skeleton } from "@finance/ui";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface ScheduleDebt {
  id: string;
  name: string;
  type: DebtType;
  totalAmount: number;
  remaining: number;
  interestRate: number;
  minPayment: number;
  dueDate?: Date;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function PaymentSchedule({ debt }: { debt: ScheduleDebt }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const scheduleQuery = api.debt.generatePaymentSchedule.useQuery(
    { debt, maxMonths: 120 },
    { enabled: open },
  );

  return (
    <div className="rounded-lg border">
      <Button
        type="button"
        variant="ghost"
        className="flex w-full items-center justify-between px-3 py-2"
        onClick={() => setOpen((current) => !current)}
      >
        <span>Payment schedule</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {open && (
        <div className="border-t px-3 py-3">
          {scheduleQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : scheduleQuery.isError ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{scheduleQuery.error.message}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => scheduleQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : scheduleQuery.data ? (
            <div className="space-y-3">
              {!scheduleQuery.data.isPayoffFeasible ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  Current payments are not enough to pay off this debt. Increase the monthly payment
                  to generate a full payoff schedule.
                </div>
              ) : (
                <div className="grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">Months</p>
                    <p className="font-mono tabular-nums">
                      {scheduleQuery.data.monthsToPayoff ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total interest</p>
                    <p className="font-mono tabular-nums">
                      {formatMoney(scheduleQuery.data.totalInterest)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payoff date</p>
                    <p className="font-mono tabular-nums">
                      {scheduleQuery.data.payoffDate
                        ? new Date(scheduleQuery.data.payoffDate).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                </div>
              )}

              {scheduleQuery.data.truncated && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                  This preview is truncated and shows only part of the payoff schedule.
                </div>
              )}

              {scheduleQuery.data.schedule.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No schedule available for this debt yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {scheduleQuery.data.schedule.slice(0, 6).map((item) => (
                    <div
                      key={`${debt.id}-${item.month}`}
                      className="grid grid-cols-4 gap-2 text-xs"
                    >
                      <span className="text-muted-foreground">Month {item.month}</span>
                      <span className="font-mono tabular-nums">{formatMoney(item.payment)}</span>
                      <span className="font-mono tabular-nums">{formatMoney(item.principal)}</span>
                      <span className="font-mono tabular-nums">{formatMoney(item.balance)}</span>
                    </div>
                  ))}
                  {scheduleQuery.data.schedule.length > 6 && (
                    <p className="text-xs text-muted-foreground">
                      Showing the first 6 payments of {scheduleQuery.data.schedule.length}.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
