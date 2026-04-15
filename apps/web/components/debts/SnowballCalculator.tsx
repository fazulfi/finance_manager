"use client";

import { api } from "@finance/api/react";
import type { DebtType } from "@finance/types";
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
} from "@finance/ui";
import { useState } from "react";

interface SnowballDebt {
  id: string;
  name: string;
  type: DebtType;
  totalAmount: number;
  remaining: number;
  interestRate: number;
  minPayment: number;
  dueDate: Date;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function SnowballCalculator({ debts }: { debts: SnowballDebt[] }): React.JSX.Element {
  const [draftExtraPayment, setDraftExtraPayment] = useState("0");
  const [submittedExtraPayment, setSubmittedExtraPayment] = useState<number | null>(null);

  const snowballQuery = api.debt.calculateSnowball.useQuery(
    {
      debts,
      extraPayment: submittedExtraPayment ?? 0,
      maxMonths: 600,
    },
    {
      enabled: submittedExtraPayment !== null && debts.length > 0,
    },
  );

  const handleCalculate = () => {
    const nextValue = Number(draftExtraPayment);
    setSubmittedExtraPayment(Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Snowball calculator</CardTitle>
        <CardDescription>
          Calculate a simple payoff order using your current debts and optional extra payment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="snowball-extra-payment">Extra monthly payment</Label>
          <Input
            id="snowball-extra-payment"
            type="number"
            min="0"
            step="0.01"
            value={draftExtraPayment}
            onChange={(event) => setDraftExtraPayment(event.target.value)}
            disabled={debts.length === 0}
          />
        </div>

        <Button
          type="button"
          className="w-full"
          onClick={handleCalculate}
          disabled={debts.length === 0}
        >
          Calculate
        </Button>

        {debts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Add debts to calculate your payoff order.
          </div>
        ) : snowballQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : snowballQuery.isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {snowballQuery.error.message}
          </div>
        ) : snowballQuery.data ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total interest
                </p>
                <p className="font-mono text-lg tabular-nums">
                  {formatMoney(snowballQuery.data.totalInterest)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total months
                </p>
                <p className="font-mono text-lg tabular-nums">
                  {snowballQuery.data.totalMonths ?? "—"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {snowballQuery.data.debts.map((item) => (
                <div key={item.debtId} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        #{item.order} {item.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Payoff date:{" "}
                        {item.payoffDate ? new Date(item.payoffDate).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-mono tabular-nums">{formatMoney(item.totalInterest)}</p>
                      <p className="text-muted-foreground">interest</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Enter an extra payment and calculate to preview your debt snowball plan.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
