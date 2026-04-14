"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@finance/ui";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GeneratedReport } from "./types";

function money(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function IncomeStatement({ report }: { report: GeneratedReport }): React.JSX.Element {
  const chartData = report.cashFlowStatement.dailySeries.slice(-14).map((item) => ({
    date: item.date,
    income: item.income,
    expenses: item.expense,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="text-lg font-semibold text-emerald-600">{money(report.monthlySummary.income)}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="text-lg font-semibold text-rose-600">{money(report.monthlySummary.expenses)}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Savings</p>
            <p className="text-lg font-semibold">{money(report.monthlySummary.savings)}</p>
          </div>
        </div>

        <div className="rounded-md border p-3">
          <p className="text-sm text-muted-foreground">
            Savings Rate: <span className="font-medium text-foreground">{report.monthlySummary.savingsRatePercent.toFixed(2)}%</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Transactions: <span className="font-medium text-foreground">{report.monthlySummary.transactionCount}</span>
          </p>
        </div>

        <div className="h-72 rounded-md border p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="income" fill="#16A34A" />
              <Bar dataKey="expenses" fill="#E11D48" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

