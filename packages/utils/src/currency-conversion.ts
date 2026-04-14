import type { CurrencyCode, ExchangeRate } from "@finance/types";

import { CurrencyFractionDigits } from "./currency";

export type CurrencyRateMap = Partial<Record<`${CurrencyCode}_${CurrencyCode}`, number>>;

export function getRateKey(
  base: CurrencyCode,
  target: CurrencyCode,
): `${CurrencyCode}_${CurrencyCode}` {
  return `${base}_${target}`;
}

export function normalizeRateMap(rates: ExchangeRate[]): CurrencyRateMap {
  return rates.reduce<CurrencyRateMap>((acc, rate) => {
    if (!Number.isFinite(rate.rate) || rate.rate <= 0) {
      return acc;
    }

    acc[getRateKey(rate.base, rate.target)] = rate.rate;
    return acc;
  }, {});
}

export function getConversionRate(
  base: CurrencyCode,
  target: CurrencyCode,
  rates: CurrencyRateMap,
): number | null {
  if (base === target) {
    return 1;
  }

  const direct = rates[getRateKey(base, target)];
  if (direct && direct > 0) {
    return direct;
  }

  const inverse = rates[getRateKey(target, base)];
  if (inverse && inverse > 0) {
    return 1 / inverse;
  }

  return null;
}

export function convertAmount(
  amount: number,
  base: CurrencyCode,
  target: CurrencyCode,
  rates: CurrencyRateMap,
): number {
  const rate = getConversionRate(base, target, rates);

  if (rate === null) {
    throw new Error(`Missing exchange rate for ${base} -> ${target}`);
  }

  const decimals = CurrencyFractionDigits[target];
  const factor = 10 ** decimals;

  return Math.round(amount * rate * factor) / factor;
}
