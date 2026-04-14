import type { DbClient } from "../trpc.js";

export const SUPPORTED_CURRENCIES = ["IDR", "USD", "EUR", "SGD", "JPY"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

interface ExchangeRateApiResponse {
  base?: string;
  base_code?: string;
  result?: string;
  rates?: Record<string, number>;
  conversion_rates?: Record<string, number>;
  date?: string;
  time_last_update_utc?: string;
}

function toUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isSupportedCurrency(value: string): value is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

function parseSnapshotDate(payload: ExchangeRateApiResponse): Date {
  if (typeof payload.date === "string" && payload.date.length > 0) {
    return toUtcDay(new Date(`${payload.date}T00:00:00.000Z`));
  }

  if (typeof payload.time_last_update_utc === "string" && payload.time_last_update_utc.length > 0) {
    return toUtcDay(new Date(payload.time_last_update_utc));
  }

  return toUtcDay(new Date());
}

async function fetchRatesForBase(base: SupportedCurrency): Promise<{
  base: SupportedCurrency;
  snapshotDate: Date;
  rates: Record<string, number>;
}> {
  const apiKey = process.env["EXCHANGE_RATE_API_KEY"] ?? "";
  const symbols = SUPPORTED_CURRENCIES.filter((currency) => currency !== base).join(",");

  const keyBasedUrl =
    apiKey.length > 0 ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}` : null;
  const fallbackUrl = `https://api.exchangerate-api.io/v1/latest?base=${base}&symbols=${symbols}`;
  const configuredUrl = process.env["EXCHANGE_RATE_API_URL"];
  const endpoint = configuredUrl
    ? configuredUrl.includes("{base}")
      ? configuredUrl.replace("{base}", base)
      : configuredUrl
    : keyBasedUrl ?? fallbackUrl;

  const requestInit: RequestInit = {};
  if (apiKey.length > 0 && keyBasedUrl === null) {
    requestInit.headers = {
      Authorization: `Bearer ${apiKey}`,
    };
  }

  const response = await fetch(endpoint, requestInit);

  if (!response.ok) {
    throw new Error(`Exchange rate request failed (${response.status}) for ${base}`);
  }

  const payload = (await response.json()) as ExchangeRateApiResponse;
  if (payload.result === "error") {
    throw new Error(`Exchange rate API returned error for ${base}`);
  }

  const responseBase = payload.base_code ?? payload.base;
  if (typeof responseBase !== "string" || !isSupportedCurrency(responseBase)) {
    throw new Error(`Unexpected base currency received from API: ${String(responseBase)}`);
  }

  const rates = payload.conversion_rates ?? payload.rates ?? {};
  const snapshotDate = parseSnapshotDate(payload);

  return { base: responseBase, snapshotDate, rates };
}

export async function upsertExchangeRates(
  db: DbClient,
  source = "exchangerate-api.io",
): Promise<{
  snapshotDate: Date;
  updated: number;
}> {
  const snapshots = await Promise.all(SUPPORTED_CURRENCIES.map((base) => fetchRatesForBase(base)));
  const snapshotDate = snapshots[0]?.snapshotDate ?? toUtcDay(new Date());
  let updated = 0;

  for (const snapshot of snapshots) {
    for (const target of SUPPORTED_CURRENCIES) {
      if (target === snapshot.base) {
        continue;
      }

      const rate = snapshot.rates[target];
      if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
        continue;
      }

      await db.exchangeRate.upsert({
        where: {
          base_target_snapshotDate: {
            base: snapshot.base,
            target,
            snapshotDate,
          },
        },
        create: {
          base: snapshot.base,
          target,
          rate,
          snapshotDate,
          source,
          fetchedAt: new Date(),
        },
        update: {
          rate,
          source,
          fetchedAt: new Date(),
        },
      });

      updated += 1;
    }
  }

  return { snapshotDate, updated };
}

export async function findConversionRate(
  db: DbClient,
  from: SupportedCurrency,
  to: SupportedCurrency,
  asOf: Date,
): Promise<number | null> {
  if (from === to) {
    return 1;
  }

  const direct = await db.exchangeRate.findFirst({
    where: {
      base: from,
      target: to,
      snapshotDate: { lte: toUtcDay(asOf) },
    },
    orderBy: { snapshotDate: "desc" },
  });

  if (direct && direct.rate > 0) {
    return direct.rate;
  }

  const inverse = await db.exchangeRate.findFirst({
    where: {
      base: to,
      target: from,
      snapshotDate: { lte: toUtcDay(asOf) },
    },
    orderBy: { snapshotDate: "desc" },
  });

  if (inverse && inverse.rate > 0) {
    return 1 / inverse.rate;
  }

  const viaIdrForward = await db.exchangeRate.findFirst({
    where: {
      base: from,
      target: "IDR",
      snapshotDate: { lte: toUtcDay(asOf) },
    },
    orderBy: { snapshotDate: "desc" },
  });
  const viaIdrBackward = await db.exchangeRate.findFirst({
    where: {
      base: to,
      target: "IDR",
      snapshotDate: { lte: toUtcDay(asOf) },
    },
    orderBy: { snapshotDate: "desc" },
  });

  if (viaIdrForward && viaIdrBackward && viaIdrForward.rate > 0 && viaIdrBackward.rate > 0) {
    return viaIdrForward.rate / viaIdrBackward.rate;
  }

  return null;
}
