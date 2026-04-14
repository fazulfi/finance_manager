"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@finance/ui";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GeneratedReport } from "./types";

function money(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function CashFlowStatement({ report }: { report: GeneratedReport }): React.JSX.Element {
  const statement = report.cashFlowStatement;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow Statement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Opening</p>
            <p className="font-semibold">{money(statement.openingBalance)}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Inflow</p>
            <p className="font-semibold text-emerald-600">{money(statement.totalInflow)}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Outflow</p>
            <p className="font-semibold text-rose-600">{money(statement.totalOutflow)}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Net</p>
            <p className="font-semibold">{money(statement.netCashFlow)}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Closing</p>
            <p className="font-semibold">{money(statement.closingBalance)}</p>
          </div>
        </div>

        <div className="h-72 rounded-md border p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={statement.dailySeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="net" stroke="#2563EB" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

