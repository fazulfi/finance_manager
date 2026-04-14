import { IDX_STOCKS, type IdxStockDefinition } from "../data/idxStocks.js";

export interface IdxQuote {
  ticker: string;
  name: string;
  exchange: "IDX";
  sector: string;
  lastPrice: number;
  changePercent: number;
  lastUpdated: Date;
}

const IDX_BY_TICKER = new Map(IDX_STOCKS.map((item) => [item.ticker, item] as const));

function hashTicker(ticker: string): number {
  return ticker
    .split("")
    .reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0);
}

function clampPrice(price: number): number {
  return Math.max(50, Math.round(price));
}

function to2(value: number): number {
  return Number(value.toFixed(2));
}

export function getIdxStockByTicker(ticker: string): IdxStockDefinition | null {
  const normalized = ticker.trim().toUpperCase();
  return IDX_BY_TICKER.get(normalized) ?? null;
}

export function searchIdxStocks(query: string, limit = 10): IdxStockDefinition[] {
  const normalized = query.trim().toUpperCase();
  if (!normalized) {
    return [];
  }

  return IDX_STOCKS.filter((item) => {
    const ticker = item.ticker.toUpperCase();
    const name = item.name.toUpperCase();
    return ticker.includes(normalized) || name.includes(normalized);
  }).slice(0, limit);
}

export function getIdxQuote(ticker: string, now = new Date()): IdxQuote | null {
  const stock = getIdxStockByTicker(ticker);
  if (!stock) {
    return null;
  }

  const daySeed = Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86_400_000,
  );
  const symbolHash = hashTicker(stock.ticker);

  const dailyDrift = (((daySeed + symbolHash) % 33) - 16) / 1000;
  const swing = Math.sin((daySeed + symbolHash) * 0.37) * 0.012;
  const changePercent = to2((dailyDrift + swing) * 100);

  const price = clampPrice(stock.basePrice * (1 + changePercent / 100));

  return {
    ticker: stock.ticker,
    name: stock.name,
    sector: stock.sector,
    exchange: "IDX",
    lastPrice: price,
    changePercent,
    lastUpdated: now,
  };
}

