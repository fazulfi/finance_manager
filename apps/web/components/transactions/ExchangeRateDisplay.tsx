"use client";

import { api } from "@finance/api/react";
import { Card, CardContent, CardHeader, CardTitle } from "@finance/ui";

interface ExchangeRateDisplayProps {
  base?: "IDR" | "USD" | "EUR" | "SGD" | "JPY";
  target?: "IDR" | "USD" | "EUR" | "SGD" | "JPY";
}

export function ExchangeRateDisplay({
  base = "USD",
  target = "IDR",
}: ExchangeRateDisplayProps): React.JSX.Element {
  const query = api.exchangeRate.getExchangeRates.useQuery({ base, target });
  const latest = query.data?.items?.[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exchange Rate</CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading && <p className="text-sm text-muted-foreground">Loading latest rate...</p>}
        {query.isError && <p className="text-sm text-rose-600">{query.error.message}</p>}
        {!query.isLoading && !query.isError && !latest && (
          <p className="text-sm text-muted-foreground">No rate available for {base} to {target}.</p>
        )}
        {latest && (
          <div className="space-y-1 text-sm">
            <p className="font-medium">
              1 {latest.base} = {latest.rate.toFixed(6)} {latest.target}
            </p>
            <p className="text-muted-foreground">
              Snapshot: {new Date(latest.snapshotDate).toLocaleDateString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
