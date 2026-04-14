"use client";

import { useMemo, useState } from "react";
import { api } from "@finance/api/react";
import { currencyEnum } from "@finance/types";
import { formatCurrency } from "@finance/utils";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@finance/ui";

import { CurrencySelector } from "./CurrencySelector";

type CurrencyCode = (typeof currencyEnum.options)[number];

export function CurrencyConverter(): React.JSX.Element {
  const [amount, setAmount] = useState<number>(1);
  const [from, setFrom] = useState<CurrencyCode>("USD");
  const [to, setTo] = useState<CurrencyCode>("IDR");
  const [submitted, setSubmitted] = useState({
    amount: 1,
    from: "USD" as CurrencyCode,
    to: "IDR" as CurrencyCode,
  });

  const query = api.exchangeRate.convertCurrency.useQuery(
    {
      amount: submitted.amount,
      from: submitted.from,
      to: submitted.to,
    },
    { enabled: submitted.amount > 0 },
  );

  const locale = useMemo(() => (to === "IDR" ? "id-ID" : "en-US"), [to]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Currency Converter</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="convert-amount">Amount</Label>
            <Input
              id="convert-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
            />
          </div>

          <CurrencySelector value={from} onChange={setFrom} label="From" />
          <CurrencySelector value={to} onChange={setTo} label="To" />
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => setSubmitted({ amount, from, to })}
            disabled={!Number.isFinite(amount) || amount <= 0}
          >
            Convert
          </Button>
          {query.isLoading && <p className="text-sm text-muted-foreground">Converting...</p>}
          {query.isError && <p className="text-sm text-rose-600">{query.error.message}</p>}
        </div>

        {query.data && (
          <div className="rounded-md border p-3 text-sm">
            <p className="font-medium">
              {formatCurrency(query.data.amount, query.data.from, locale)} ={" "}
              {formatCurrency(query.data.convertedAmount, query.data.to, locale)}
            </p>
            <p className="mt-1 text-muted-foreground">
              Rate: 1 {query.data.from} = {query.data.rate.toFixed(6)} {query.data.to}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
