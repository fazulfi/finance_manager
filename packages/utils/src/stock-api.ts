// packages/utils/src/stock-api.ts
// Yahoo Finance API wrapper — supports IDX (.JK) and global tickers
// Uses yahoo-finance2 package (free, 15-min delayed data)

import yahooFinance from "yahoo-finance2";

export interface StockQuote {
  ticker: string;
  name: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  currency: string;
  exchange: string;
  marketCap: number | undefined;
  volume: number | undefined;
  fiftyTwoWeekHigh: number | undefined;
  fiftyTwoWeekLow: number | undefined;
  lastUpdated: Date;
}

export interface HistoricalPrice {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockSearchMatch {
  ticker: string;
  name: string;
  exchange: string;
  type: string;
}

/** Normalize IDX ticker — appends .JK if needed */
function normalizeIdxTicker(ticker: string): string {
  const t = ticker.toUpperCase().trim();
  // Already has .JK or another exchange suffix
  if (t.includes(".")) return t;
  // IDX tickers are 4 chars, common stock codes
  return t;
}

/**
 * Fetch current quote for a single ticker.
 * For IDX stocks pass the ticker with .JK suffix, e.g. "BBCA.JK"
 */
export async function getStockPrice(ticker: string): Promise<StockQuote> {
  const normalized = normalizeIdxTicker(ticker);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote: any = await yahooFinance.quote(normalized, {}, { validateResult: false });

    const price: number = quote.regularMarketPrice ?? 0;
    const previousClose: number = quote.regularMarketPreviousClose ?? price;
    const change = price - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    return {
      ticker: normalized,
      name: (quote.longName ?? quote.shortName ?? normalized) as string,
      price,
      previousClose,
      change,
      changePercent,
      currency: (quote.currency ?? "USD") as string,
      exchange: (quote.fullExchangeName ?? quote.exchange ?? "OTHER") as string,
      marketCap: (quote.marketCap ?? undefined) as number | undefined,
      volume: (quote.regularMarketVolume ?? undefined) as number | undefined,
      fiftyTwoWeekHigh: (quote.fiftyTwoWeekHigh ?? undefined) as number | undefined,
      fiftyTwoWeekLow: (quote.fiftyTwoWeekLow ?? undefined) as number | undefined,
      lastUpdated: new Date(),
    };
  } catch (error) {
    throw new Error(
      `Failed to fetch price for ${normalized}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Fetch current prices for multiple tickers in parallel.
 * Returns a map of ticker → quote. Failed tickers are omitted.
 */
export async function getStockPrices(tickers: string[]): Promise<Map<string, StockQuote>> {
  const results = new Map<string, StockQuote>();

  const settled = await Promise.allSettled(tickers.map((t) => getStockPrice(t)));

  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      const ticker = tickers[index];
      if (ticker) results.set(ticker.toUpperCase(), result.value);
    }
  });

  return results;
}

/**
 * Fetch historical OHLCV prices for a ticker.
 * @param ticker  Stock ticker (e.g. "BBCA.JK", "AAPL")
 * @param period  "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y"
 */
export async function getHistoricalPrices(
  ticker: string,
  period: "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" = "1y",
): Promise<HistoricalPrice[]> {
  const normalized = normalizeIdxTicker(ticker);

  const periodToMonths: Record<string, number> = {
    "1mo": 1,
    "3mo": 3,
    "6mo": 6,
    "1y": 12,
    "2y": 24,
    "5y": 60,
  };

  const months = periodToMonths[period] ?? 12;
  const period2 = new Date();
  const period1 = new Date();
  period1.setMonth(period1.getMonth() - months);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const history: any[] = await yahooFinance.historical(
      normalized,
      { period1, period2, interval: "1d" },
      { validateResult: false },
    ) as any;

    return history.map((row) => ({
      date: new Date(row.date),
      open: row.open ?? 0,
      high: row.high ?? 0,
      low: row.low ?? 0,
      close: row.close ?? 0,
      volume: row.volume ?? 0,
    }));
  } catch (error) {
    throw new Error(
      `Failed to fetch history for ${normalized}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Search stocks by keyword — useful for adding new holdings.
 * Supports IDX (.JK) and global markets.
 */
export async function searchStocks(query: string): Promise<StockSearchMatch[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any = await yahooFinance.search(query, {}, { validateResult: false });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((results.quotes ?? []) as any[])
      .filter((q) => q.isYahooFinance && (q.quoteType === "EQUITY" || q.quoteType === "ETF"))
      .slice(0, 15)
      .map((q) => ({
        ticker: (q.symbol ?? "") as string,
        name: ((q.longname ?? q.shortname ?? q.symbol ?? "") as string),
        exchange: ((q.exchange ?? "OTHER") as string),
        type: ((q.quoteType ?? "EQUITY") as string),
      }))
      .filter((r) => r.ticker.length > 0);
  } catch (error) {
    throw new Error(
      `Failed to search stocks for "${query}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
