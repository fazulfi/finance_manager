/**
 * Stock watchlist and alert-related shared types.
 * These types intentionally avoid name collisions with Prisma model exports in models.ts.
 */

export interface StockSearchResult {
  id: string;
  ticker: string;
  name: string;
  exchange: string;
  sector: string;
  lastPrice: number;
  changePercent: number;
  lastUpdated: Date;
}

export interface StockInfo {
  ticker: string;
  name: string;
  exchange: string;
  sector: string;
  lastPrice: number;
  changePercent: number;
  lastUpdated: Date;
}

export interface WatchlistStockInfo {
  id: string;
  ticker: string;
  name: string;
  exchange: string;
  sector: string;
  lastPrice: number;
  changePercent: number;
  lastUpdated: Date;
}

export interface WatchlistEntry {
  id: string;
  userId: string;
  stockId: string;
  addedAt: Date;
  stock: WatchlistStockInfo;
}

export interface PriceAlertEntry {
  id: string;
  userId: string;
  stockId: string;
  targetPrice: number;
  notified: boolean;
  createdAt: Date;
  updatedAt: Date;
  stock: WatchlistStockInfo;
}

export interface CreatePriceAlertInput {
  stockId: string;
  targetPrice: number;
}

export interface PaginationInput {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PriceAlertCheckResult {
  count: number;
  triggeredAlerts: Array<{
    alertId: string;
    ticker: string;
    stockName: string;
    currentPrice: number;
    targetPrice: number;
    changePercent: number;
    triggeredAt: Date;
  }>;
}

// ─── Portfolio types ──────────────────────────────────────────────────────────

export interface PortfolioHolding {
  id: string;
  ticker: string;
  name: string;
  exchange: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  totalCost: number;
  currentValue: number;
  gain: number;
  gainPercent: number;
  allocationPercent: number;
  lastUpdated: Date;
}

export interface PortfolioValue {
  totalCost: number;
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
  totalDividends: number;
  holdingCount: number;
  holdings: PortfolioHolding[];
}

export interface HistoricalPrice {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type PriceHistoryPeriod = "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y";

export interface Dividend {
  id: string;
  userId: string;
  stockId: string;
  amount: number;
  date: Date;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  stock?: { id: string; ticker: string; name: string };
}

export interface AddDividendInput {
  stockId: string;
  amount: number;
  date: Date;
  notes?: string;
}

