import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getIdxQuote, getIdxStockByTicker, searchIdxStocks } from "../lib/idxMarket.js";
import { router, protectedProcedure, objectId, type Context } from "../trpc.js";
import type { PriceHistoryPeriod, PortfolioHolding } from "@finance/types";

const ExchangeEnum = z.enum(["NYSE", "NASDAQ", "LSE", "OTHER"]);
const PAGE_SIZE_DEFAULT = 20;

export interface WatchStockView {
  id: string;
  ticker: string;
  name: string;
  exchange: string;
  sector: string;
  lastPrice: number;
  changePercent: number;
  lastUpdated: Date;
}

function toWatchStockView(stock: {
  id: string;
  ticker: string;
  name: string;
  exchange: string;
  currentPrice: number;
  gainPercent: number;
  lastUpdated: Date;
}): WatchStockView {
  const idxQuote = getIdxQuote(stock.ticker);
  const idxInfo = getIdxStockByTicker(stock.ticker);

  return {
    id: stock.id,
    ticker: stock.ticker,
    name: idxInfo?.name ?? stock.name,
    exchange: idxInfo ? "IDX" : stock.exchange,
    sector: idxInfo?.sector ?? "Unknown",
    lastPrice: idxQuote?.lastPrice ?? stock.currentPrice,
    changePercent: idxQuote?.changePercent ?? stock.gainPercent,
    lastUpdated: idxQuote?.lastUpdated ?? stock.lastUpdated,
  };
}

async function ensureUserWatchableStock(ctx: Context, userId: string, ticker: string) {
  const normalizedTicker = ticker.trim().toUpperCase();
  const idxInfo = getIdxStockByTicker(normalizedTicker);
  const idxQuote = getIdxQuote(normalizedTicker);

  let stock = await ctx.db.stock.findFirst({
    where: { userId, ticker: normalizedTicker },
  });

  if (!stock) {
    if (!idxInfo) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Ticker not found in IDX catalogue.",
      });
    }

    stock = await ctx.db.stock.create({
      data: {
        userId,
        ticker: normalizedTicker,
        name: idxInfo.name,
        exchange: "OTHER",
        quantity: 0,
        avgBuyPrice: 0,
        currentPrice: idxQuote?.lastPrice ?? idxInfo.basePrice,
        totalCost: 0,
        currentValue: 0,
        gain: 0,
        gainPercent: idxQuote?.changePercent ?? 0,
        lastUpdated: new Date(),
      },
    });
  } else if (idxQuote) {
    stock = await ctx.db.stock.update({
      where: { id: stock.id, userId },
      data: {
        name: idxInfo?.name ?? stock.name,
        currentPrice: idxQuote.lastPrice,
        gainPercent: idxQuote.changePercent,
        lastUpdated: idxQuote.lastUpdated,
      },
    });
  }

  return stock;
}

export const stockRouter = router({
  // Portfolio Value - Get all user holdings
  getPortfolioValue: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const stocks = await ctx.db.stock.findMany({
      where: { userId },
      orderBy: { ticker: "asc" },
    });

    // Calculate total value and gain
    const totalCost = stocks.reduce((sum, stock) => sum + stock.totalCost, 0);
    const currentValue = stocks.reduce((sum, stock) => sum + stock.currentValue, 0);
    const totalGain = currentValue - totalCost;
    const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

    // Get total dividends and holding count
    const [totalDividends, dividendCount] = await Promise.all([
      ctx.db.dividend.aggregate({
        where: {
          stock: { userId },
        },
        _sum: { amount: true },
      }),
      ctx.db.stock.count({ where: { userId } }),
    ]);

    // Transform to portfolio holdings with enriched data
    const holdings = await Promise.all(
      stocks.map(async (stock) => {
        const idxQuote = getIdxQuote(stock.ticker);
        const gainPercent = idxQuote?.changePercent ?? stock.gainPercent;
        const allocationPercent = totalCost > 0 ? (stock.totalCost / totalCost) * 100 : 0;

        return {
          id: stock.id,
          ticker: stock.ticker,
          name: idxQuote?.name ?? stock.name,
          exchange: idxQuote ? "IDX" : stock.exchange,
          sector: idxQuote?.sector ?? "Unknown",
          quantity: stock.quantity,
          avgBuyPrice: stock.avgBuyPrice,
          currentPrice: idxQuote?.lastPrice ?? stock.currentPrice,
          totalCost: stock.totalCost,
          currentValue: stock.currentValue,
          gain: stock.gain,
          gainPercent,
          allocationPercent,
          lastUpdated: idxQuote?.lastUpdated ?? stock.lastUpdated,
        } as PortfolioHolding;
      }),
    );

    return {
      totalValue: currentValue,
      totalCost,
      totalGain,
      totalGainPercent,
      totalDividends: totalDividends._sum.amount || 0,
      holdingCount: dividendCount || stocks.length,
      holdings,
    };
  }),

  // Refresh Prices - Update all user stock prices from IDX market
  refreshPrices: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const stocks = await ctx.db.stock.findMany({
      where: { userId },
    });

    let updated = 0;
    let failed = 0;

    for (const stock of stocks) {
      try {
        const idxQuote = getIdxQuote(stock.ticker);
        if (!idxQuote) {
          failed++;
          continue;
        }

        await ctx.db.stock.update({
          where: { id: stock.id, userId },
          data: {
            currentPrice: idxQuote.lastPrice,
            gainPercent: idxQuote.changePercent,
            lastUpdated: idxQuote.lastUpdated,
          },
        });
        updated++;
      } catch (error) {
        console.error(`Failed to refresh price for ${stock.ticker}:`, error);
        failed++;
      }
    }

    return { updated, failed };
  }),

  // Dividend Queries
  getDividends: protectedProcedure
    .input(
      z.object({
        stockId: objectId,
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { stockId, page, limit } = input;
      const skip = (page - 1) * limit;

      // Verify stock belongs to user
      const stock = await ctx.db.stock.findFirst({
        where: { id: stockId, userId },
      });
      if (!stock) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Stock not found" });
      }

      // Get dividends for this stock
      const [dividends, total] = await Promise.all([
        ctx.db.dividend.findMany({
          where: {
            stockId,
          },
          skip,
          take: limit,
          orderBy: { date: "desc" },
          select: {
            id: true,
            amount: true,
            date: true,
            notes: true,
          },
        }),
        ctx.db.dividend.count({ where: { stockId } }),
      ]);

      return {
        items: dividends,
        total,
        page,
        limit,
      };
    }),

  addDividend: protectedProcedure
    .input(
      z.object({
        stockId: objectId,
        amount: z.number().positive(),
        date: z.date(),
        notes: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify stock belongs to user
      const stock = await ctx.db.stock.findFirst({
        where: { id: input.stockId, userId },
      });
      if (!stock) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Stock not found" });
      }

      // Create dividend record
      const dividend = await ctx.db.dividend.create({
        data: {
          userId: ctx.session.user.id,
          stockId: input.stockId,
          amount: input.amount,
          date: input.date,
          notes: input.notes ?? null,
        },
      });

      return dividend;
    }),

  deleteDividend: protectedProcedure
    .input(
      z.object({
        dividendId: objectId,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const existing = await ctx.db.dividend.findFirst({
        where: {
          id: input.dividendId,
          stock: { userId },
        },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dividend not found" });
      }

      await ctx.db.dividend.delete({
        where: { id: input.dividendId },
      });

      return { success: true };
    }),

  // Stock History - Get historical price data (mock data simulation)
  getStockHistory: protectedProcedure
    .input(
      z.object({
        ticker: z.string().min(1),
        period: z.enum(["1mo", "3mo", "6mo", "1y", "2y", "5y"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify stock belongs to user
      const stock = await ctx.db.stock.findFirst({
        where: { ticker: input.ticker.toUpperCase(), userId },
      });
      if (!stock) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Stock not found" });
      }

      // Generate mock historical data based on current price and period
      const daysMap: Record<PriceHistoryPeriod, number> = {
        "1mo": 30,
        "3mo": 90,
        "6mo": 180,
        "1y": 365,
        "2y": 730,
        "5y": 1825,
      };

      const days = daysMap[input.period];
      let basePrice = stock.currentPrice;
      const history: Array<{ date: Date; close: number; open: number; high: number; low: number }> =
        [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      for (let i = 0; i < days; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);

        // Random walk simulation
        const changePercent = (Math.random() - 0.5) * 0.02; // +/- 1% daily
        const openPrice = basePrice * (1 + changePercent);
        const closePrice = basePrice * (1 + changePercent + (Math.random() - 0.5) * 0.01);
        const highPrice = Math.max(openPrice, closePrice) * (1 + Math.random() * 0.01);
        const lowPrice = Math.min(openPrice, closePrice) * (1 - Math.random() * 0.01);

        history.push({
          date: currentDate,
          open: Math.round(openPrice * 100) / 100,
          close: Math.round(closePrice * 100) / 100,
          high: Math.round(highPrice * 100) / 100,
          low: Math.round(lowPrice * 100) / 100,
        });

        basePrice = closePrice;
      }

      return history;
    }),

  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(PAGE_SIZE_DEFAULT),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { page, limit } = input;
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        ctx.db.stock.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { ticker: "asc" },
        }),
        ctx.db.stock.count({ where: { userId } }),
      ]);

      return { items, total, page, limit };
    }),

  getById: protectedProcedure.input(z.object({ id: objectId })).query(async ({ ctx, input }) => {
    const stock = await ctx.db.stock.findFirst({
      where: { id: input.id, userId: ctx.session.user.id },
    });
    if (!stock) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Stock not found" });
    }
    return stock;
  }),

  create: protectedProcedure
    .input(
      z.object({
        ticker: z
          .string()
          .min(1)
          .max(20)
          .transform((value) => value.toUpperCase()),
        name: z.string().min(1).max(200),
        exchange: ExchangeEnum.default("OTHER"),
        quantity: z.number().positive(),
        avgBuyPrice: z.number().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const totalCost = input.quantity * input.avgBuyPrice;
      return ctx.db.stock.create({
        data: {
          userId: ctx.session.user.id,
          ticker: input.ticker,
          name: input.name,
          exchange: input.exchange,
          quantity: input.quantity,
          avgBuyPrice: input.avgBuyPrice,
          currentPrice: input.avgBuyPrice,
          totalCost,
          currentValue: totalCost,
          gain: 0,
          gainPercent: 0,
          lastUpdated: new Date(),
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: objectId,
        currentPrice: z.number().nonnegative().optional(),
        quantity: z.number().nonnegative().optional(),
        avgBuyPrice: z.number().nonnegative().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.stock.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Stock not found" });
      }

      const newQuantity = input.quantity ?? existing.quantity;
      const newAvgBuyPrice = input.avgBuyPrice ?? existing.avgBuyPrice;
      const newCurrentPrice = input.currentPrice ?? existing.currentPrice;

      const totalCost = newQuantity * newAvgBuyPrice;
      const currentValue = newQuantity * newCurrentPrice;
      const gain = currentValue - totalCost;
      const gainPercent = totalCost > 0 ? (gain / totalCost) * 100 : 0;

      return ctx.db.stock.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: {
          quantity: newQuantity,
          avgBuyPrice: newAvgBuyPrice,
          currentPrice: newCurrentPrice,
          totalCost,
          currentValue,
          gain,
          gainPercent,
          lastUpdated: new Date(),
        },
      });
    }),

  updatePrice: protectedProcedure
    .input(
      z.object({
        id: objectId,
        currentPrice: z.number().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.stock.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Stock not found" });
      }

      const currentValue = existing.quantity * input.currentPrice;
      const totalCost = existing.quantity * existing.avgBuyPrice;
      const gain = currentValue - totalCost;
      const gainPercent = totalCost > 0 ? (gain / totalCost) * 100 : 0;

      return ctx.db.stock.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: {
          currentPrice: input.currentPrice,
          currentValue,
          gain,
          gainPercent,
          lastUpdated: new Date(),
        },
      });
    }),

  delete: protectedProcedure.input(z.object({ id: objectId })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.stock.findFirst({
      where: { id: input.id, userId: ctx.session.user.id },
    });
    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Stock not found" });
    }

    await ctx.db.stock.delete({ where: { id: input.id, userId: ctx.session.user.id } });
    return { success: true };
  }),

  search: protectedProcedure
    .input(
      z.object({
        searchQuery: z.string().min(1).max(50),
        limit: z.number().int().min(1).max(20).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const query = input.searchQuery.trim();

      const idxMatches = searchIdxStocks(query, input.limit);
      const idxTickers = new Set(idxMatches.map((item) => item.ticker));

      const userStocks = await ctx.db.stock.findMany({
        where: {
          userId,
          OR: [
            { ticker: { contains: query, mode: "insensitive" as const } },
            { name: { contains: query, mode: "insensitive" as const } },
          ],
        },
        take: input.limit,
        orderBy: { lastUpdated: "desc" },
        select: {
          id: true,
          ticker: true,
          name: true,
          exchange: true,
          currentPrice: true,
          gainPercent: true,
          lastUpdated: true,
        },
      });

      const idxResults = idxMatches.map((stock) => {
        const quote = getIdxQuote(stock.ticker);
        return {
          id: stock.ticker,
          ticker: stock.ticker,
          name: stock.name,
          exchange: "IDX",
          sector: stock.sector,
          lastPrice: quote?.lastPrice ?? stock.basePrice,
          changePercent: quote?.changePercent ?? 0,
          lastUpdated: quote?.lastUpdated ?? new Date(),
        };
      });

      const customUserResults = userStocks
        .filter((stock) => !idxTickers.has(stock.ticker.toUpperCase()))
        .map((stock) => ({
          id: stock.id,
          ticker: stock.ticker,
          name: stock.name,
          exchange: stock.exchange,
          sector: "Unknown",
          lastPrice: stock.currentPrice,
          changePercent: stock.gainPercent,
          lastUpdated: stock.lastUpdated,
        }));

      return [...idxResults, ...customUserResults].slice(0, input.limit);
    }),

  getInfo: protectedProcedure
    .input(
      z.object({
        ticker: z
          .string()
          .min(1)
          .max(20)
          .transform((value) => value.toUpperCase()),
      }),
    )
    .query(async ({ ctx, input }) => {
      const idxQuote = getIdxQuote(input.ticker);
      const idxInfo = getIdxStockByTicker(input.ticker);

      if (idxQuote && idxInfo) {
        return {
          ticker: idxQuote.ticker,
          name: idxQuote.name,
          exchange: idxQuote.exchange,
          sector: idxQuote.sector,
          lastPrice: idxQuote.lastPrice,
          changePercent: idxQuote.changePercent,
          lastUpdated: idxQuote.lastUpdated,
        };
      }

      const userStock = await ctx.db.stock.findFirst({
        where: {
          userId: ctx.session.user.id,
          ticker: input.ticker,
        },
      });

      if (!userStock) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Stock not found",
        });
      }

      return {
        ticker: userStock.ticker,
        name: userStock.name,
        exchange: userStock.exchange,
        sector: "Unknown",
        lastPrice: userStock.currentPrice,
        changePercent: userStock.gainPercent,
        lastUpdated: userStock.lastUpdated,
      };
    }),

  getWatchlist: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(PAGE_SIZE_DEFAULT),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { page, limit } = input;
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        ctx.db.watchlist.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { addedAt: "desc" },
          include: {
            stock: {
              select: {
                id: true,
                ticker: true,
                name: true,
                exchange: true,
                currentPrice: true,
                gainPercent: true,
                lastUpdated: true,
              },
            },
          },
        }),
        ctx.db.watchlist.count({ where: { userId } }),
      ]);

      return {
        items: items.map((item) => ({
          ...item,
          stock: toWatchStockView(item.stock),
        })),
        total,
        page,
        limit,
      };
    }),

  addToWatchlist: protectedProcedure
    .input(
      z.object({
        ticker: z.string().min(1).max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const ticker = input.ticker.trim().toUpperCase();
      const stock = await ensureUserWatchableStock(ctx, userId, ticker);

      const existing = await ctx.db.watchlist.findFirst({
        where: {
          userId,
          stockId: stock.id,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Stock is already in your watchlist",
        });
      }

      const watchlistItem = await ctx.db.watchlist.create({
        data: {
          userId,
          stockId: stock.id,
        },
        include: {
          stock: {
            select: {
              id: true,
              ticker: true,
              name: true,
              exchange: true,
              currentPrice: true,
              gainPercent: true,
              lastUpdated: true,
            },
          },
        },
      });

      return {
        success: true,
        message: "Stock added to watchlist",
        watchlistItem: {
          ...watchlistItem,
          stock: toWatchStockView(watchlistItem.stock),
        },
      };
    }),

  removeFromWatchlist: protectedProcedure
    .input(
      z.object({
        watchlistId: objectId,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const existing = await ctx.db.watchlist.findFirst({
        where: {
          id: input.watchlistId,
          userId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Watchlist item not found",
        });
      }

      await ctx.db.watchlist.delete({
        where: {
          id: input.watchlistId,
          userId,
        },
      });

      return { success: true, message: "Stock removed from watchlist" };
    }),

  getAlerts: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(PAGE_SIZE_DEFAULT),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { page, limit } = input;
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        ctx.db.priceAlert.findMany({
          where: { userId, notified: false },
          skip,
          take: limit,
          orderBy: [{ createdAt: "desc" }],
          include: {
            stock: {
              select: {
                id: true,
                ticker: true,
                name: true,
                exchange: true,
                currentPrice: true,
                gainPercent: true,
                lastUpdated: true,
              },
            },
          },
        }),
        ctx.db.priceAlert.count({ where: { userId, notified: false } }),
      ]);

      return {
        items: items.map((alert) => ({
          ...alert,
          stock: toWatchStockView(alert.stock),
        })),
        total,
        page,
        limit,
      };
    }),

  createAlert: protectedProcedure
    .input(
      z.object({
        stockId: objectId,
        targetPrice: z.number().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const stock = await ctx.db.stock.findFirst({
        where: {
          id: input.stockId,
          userId,
        },
      });

      if (!stock) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Stock not found",
        });
      }

      const existingAlert = await ctx.db.priceAlert.findFirst({
        where: {
          userId,
          stockId: input.stockId,
          notified: false,
        },
      });

      if (existingAlert) {
        const alert = await ctx.db.priceAlert.update({
          where: {
            id: existingAlert.id,
            userId,
          },
          data: {
            targetPrice: input.targetPrice,
          },
          include: {
            stock: {
              select: {
                id: true,
                ticker: true,
                name: true,
                exchange: true,
                currentPrice: true,
                gainPercent: true,
                lastUpdated: true,
              },
            },
          },
        });

        return {
          success: true,
          message: "Price alert updated",
          alert: {
            ...alert,
            stock: toWatchStockView(alert.stock),
          },
        };
      }

      const alert = await ctx.db.priceAlert.create({
        data: {
          userId,
          stockId: input.stockId,
          targetPrice: input.targetPrice,
        },
        include: {
          stock: {
            select: {
              id: true,
              ticker: true,
              name: true,
              exchange: true,
              currentPrice: true,
              gainPercent: true,
              lastUpdated: true,
            },
          },
        },
      });

      return {
        success: true,
        message: "Price alert created",
        alert: {
          ...alert,
          stock: toWatchStockView(alert.stock),
        },
      };
    }),

  deleteAlert: protectedProcedure
    .input(
      z.object({
        alertId: objectId,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const existing = await ctx.db.priceAlert.findFirst({
        where: {
          id: input.alertId,
          userId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Price alert not found",
        });
      }

      await ctx.db.priceAlert.delete({
        where: {
          id: input.alertId,
          userId,
        },
      });

      return { success: true, message: "Price alert deleted" };
    }),

  checkAlerts: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const alerts = await ctx.db.priceAlert.findMany({
      where: {
        userId,
        notified: false,
      },
      include: {
        stock: true,
      },
    });

    const triggeredAlerts: Array<{
      alertId: string;
      ticker: string;
      stockName: string;
      currentPrice: number;
      targetPrice: number;
      changePercent: number;
      triggeredAt: Date;
    }> = [];

    for (const alert of alerts) {
      const quote = getIdxQuote(alert.stock.ticker);
      const currentPrice = quote?.lastPrice ?? alert.stock.currentPrice;
      const changePercent = quote?.changePercent ?? alert.stock.gainPercent;
      const stockName = quote?.name ?? alert.stock.name;

      if (
        currentPrice !== alert.stock.currentPrice ||
        changePercent !== alert.stock.gainPercent ||
        (quote && quote.lastUpdated.getTime() !== alert.stock.lastUpdated.getTime())
      ) {
        await ctx.db.stock.update({
          where: {
            id: alert.stock.id,
            userId,
          },
          data: {
            currentPrice,
            gainPercent: changePercent,
            lastUpdated: quote?.lastUpdated ?? new Date(),
          },
        });
      }

      if (currentPrice >= alert.targetPrice) {
        await ctx.db.priceAlert.update({
          where: {
            id: alert.id,
            userId,
          },
          data: {
            notified: true,
          },
        });

        triggeredAlerts.push({
          alertId: alert.id,
          ticker: alert.stock.ticker,
          stockName,
          currentPrice,
          targetPrice: alert.targetPrice,
          changePercent,
          triggeredAt: new Date(),
        });
      }
    }

    return {
      triggeredAlerts,
      count: triggeredAlerts.length,
    };
  }),
});
