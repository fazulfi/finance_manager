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
  toast,
} from "@finance/ui";
import { Calendar, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { DebtForm } from "./DebtForm";
import { PaymentSchedule } from "./PaymentSchedule";

interface DebtCardDebt {
  id: string;
  name: string;
  type: string;
  totalAmount: number;
  remaining: number;
  interestRate: number;
  minPayment: number;
  dueDate?: Date | null;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatType(type: string | DebtType): string {
  return String(type).toLowerCase().replace(/_/g, " ");
}

export function DebtCard({ debt }: { debt: DebtCardDebt }): React.JSX.Element {
  const router = useRouter();
  const utils = api.useContext();
  const paidPercent =
    debt.totalAmount > 0 ? ((debt.totalAmount - debt.remaining) / debt.totalAmount) * 100 : 0;

  const deleteDebt = api.debt.delete.useMutation({
    onSuccess: async () => {
      toast({ title: "Debt deleted", description: "The debt has been removed." });
      await Promise.all([utils.debt.list.invalidate(), utils.debt.getSummary.invalidate()]);
      router.refresh();
    },
    onError: (error) => {
      toast({
        title: "Failed to delete debt",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (!window.confirm(`Delete ${debt.name}? This cannot be undone.`)) {
      return;
    }

    deleteDebt.mutate({ id: debt.id });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="line-clamp-1">{debt.name}</CardTitle>
            <CardDescription className="capitalize">{formatType(debt.type)}</CardDescription>
          </div>
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
            {formatPercent(debt.interestRate)} APR
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Remaining</span>
            <span className="font-mono tabular-nums text-gray-900">
              {formatMoney(debt.remaining)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-rose-500 transition-all duration-200"
              style={{ width: `${Math.min(Math.max(paidPercent, 0), 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Paid {formatMoney(debt.totalAmount - debt.remaining)} of {formatMoney(debt.totalAmount)}
          </p>
        </div>

        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Minimum payment</span>
            <span className="font-mono tabular-nums">{formatMoney(debt.minPayment)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total balance</span>
            <span className="font-mono tabular-nums">{formatMoney(debt.totalAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Due date
            </span>
            <span className="font-mono tabular-nums">
              {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString() : "Not set"}
            </span>
          </div>
        </div>

        <PaymentSchedule debt={debt as any} />

        <div className="flex items-center gap-2">
          <DebtForm
            mode="update"
            debt={debt as any}
            trigger={
              <Button type="button" variant="outline" size="sm" className="flex-1 gap-2">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            }
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 text-destructive"
            onClick={handleDelete}
            disabled={deleteDebt.isLoading}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
