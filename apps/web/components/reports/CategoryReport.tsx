"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@finance/ui";
import { formatCurrency } from "@finance/utils";
import type { GeneratedReport } from "./types";

function money(amount: number): string {
  return formatCurrency(amount, "IDR", "id-ID");
}

export function CategoryReport({ report }: { report: GeneratedReport }): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Income</th>
              <th className="py-2 pr-4">Expense</th>
              <th className="py-2 pr-4">Net</th>
              <th className="py-2 pr-4">Expense Share</th>
              <th className="py-2 pr-4">Transactions</th>
            </tr>
          </thead>
          <tbody>
            {report.categoryBreakdown.map((item) => (
              <tr key={item.category} className="border-b">
                <td className="py-2 pr-4 font-medium">{item.category}</td>
                <td className="py-2 pr-4 text-emerald-700">{money(item.income)}</td>
                <td className="py-2 pr-4 text-rose-700">{money(item.expense)}</td>
                <td className="py-2 pr-4">{money(item.net)}</td>
                <td className="py-2 pr-4">{item.expenseSharePercent.toFixed(2)}%</td>
                <td className="py-2 pr-4">{item.transactionCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
