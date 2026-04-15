// packages/utils/src/cron/update-stock-prices.ts
// Scheduled job — refreshes stock prices for all users at market close.
// Run with: npx tsx packages/utils/src/cron/update-stock-prices.ts
// Or wire into a cron scheduler (node-cron, Vercel Cron, GitHub Actions, etc.)
//
// IDX market close: 16:15 WIB (09:15 UTC)
// Schedule suggestion: "15 9 * * 1-5"  (Mon-Fri, 09:15 UTC)

import { db } from "@finance/db";

import { getStockPrices } from "../stock-api.js";

interface UpdateResult {
  userId: string;
  ticker: string;
  status: "ok" | "error";
  error?: string;
}

/**
 * Fetch all unique tickers across all users, pull Yahoo Finance prices,
 * then update each stock document with the latest price and computed P&L.
 */
async function updateAllStockPrices(): Promise<void> {
  console.log(`[update-stock-prices] Starting at ${new Date().toISOString()}`);

  // Grab every stock in the DB
  const allStocks = await db.stock.findMany({
    select: {
      id: true,
      userId: true,
      ticker: true,
      quantity: true,
      avgBuyPrice: true,
    },
  });

  if (allStocks.length === 0) {
    console.log("[update-stock-prices] No stocks found — nothing to update.");
    return;
  }

  // Deduplicate tickers to minimise API calls
  const uniqueTickers: string[] = [...new Set(allStocks.map((s) => s.ticker))];
  console.log(`[update-stock-prices] Fetching prices for ${uniqueTickers.length} unique ticker(s)…`);

  const priceMap = await getStockPrices(uniqueTickers);
  console.log(`[update-stock-prices] Received prices for ${priceMap.size} ticker(s).`);

  const results: UpdateResult[] = [];

  await Promise.allSettled(
    allStocks.map(async (stock: { id: string; userId: string; ticker: string; quantity: number; avgBuyPrice: number }) => {
      const quote = priceMap.get(stock.ticker.toUpperCase());
      if (!quote) {
        results.push({ userId: stock.userId, ticker: stock.ticker, status: "error", error: "No price data" });
        return;
      }

      try {
        const currentValue = stock.quantity * quote.price;
        const totalCost = stock.quantity * stock.avgBuyPrice;
        const gain = currentValue - totalCost;
        const gainPercent = totalCost > 0 ? (gain / totalCost) * 100 : 0;

        await db.stock.update({
          where: { id: stock.id },
          data: {
            currentPrice: quote.price,
            currentValue,
            gain,
            gainPercent,
            lastUpdated: new Date(),
          },
        });

        results.push({ userId: stock.userId, ticker: stock.ticker, status: "ok" });
      } catch (err) {
        results.push({
          userId: stock.userId,
          ticker: stock.ticker,
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }),
  );

  const ok = results.filter((r) => r.status === "ok").length;
  const failed = results.filter((r) => r.status === "error");

  console.log(`[update-stock-prices] Done — ${ok} updated, ${failed.length} failed.`);

  if (failed.length > 0) {
    console.warn("[update-stock-prices] Failed updates:");
    failed.forEach((f) => console.warn(`  ${f.ticker} (${f.userId}): ${f.error}`));
  }
}

// ─── Scheduler ───────────────────────────────────────────────────────────────
// When this file is run directly, execute once then exit.
// To run on a cron schedule, uncomment the node-cron block below and
// install node-cron: pnpm add node-cron @types/node-cron --filter @finance/utils

updateAllStockPrices()
  .catch((err) => {
    console.error("[update-stock-prices] Fatal error:", err);
    process.exit(1);
  })
  .finally(() => {
    db.$disconnect();
  });

/*
// ─── node-cron variant (uncomment to use) ────────────────────────────────────
import cron from "node-cron";

// IDX closes at 16:15 WIB = 09:15 UTC, Mon-Fri
cron.schedule("15 9 * * 1-5", () => {
  updateAllStockPrices().catch(console.error);
}, { timezone: "UTC" });

// Also run at 12:00 UTC for NYSE/NASDAQ open prices
cron.schedule("0 12 * * 1-5", () => {
  updateAllStockPrices().catch(console.error);
}, { timezone: "UTC" });

console.log("[update-stock-prices] Cron scheduler running.");
*/
