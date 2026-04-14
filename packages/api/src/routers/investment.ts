import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { Context } from "../trpc.js";
import { objectId, protectedProcedure, router } from "../trpc.js";

const DbInvestmentTypeEnum = z.enum([
  "STOCK",
  "BOND",
  "CRYPTO",
  "REAL_ESTATE",
  "MUTUAL_FUND",
  "OTHER",
]);

const ApiInvestmentTypeEnum = z.enum([
  "STOCK",
  "BOND",
  "CRYPTO",
  "REAL_ESTATE",
  "MUTUAL_FUND",
  "GOLD",
  "DEPOSIT",
  "P2P_LENDING",
  "OTHER",
]);

const DashboardInvestmentTypeEnum = z.enum([
  "CRYPTO",
  "MUTUAL_FUND",
  "GOLD",
  "DEPOSIT",
  "P2P_LENDING",
]);

type ApiInvestmentType = z.infer<typeof ApiInvestmentTypeEnum>;
type DbInvestmentType = z.infer<typeof DbInvestmentTypeEnum>;
type Metadata = Record<string, unknown>;

type AuthedContext = Context & { session: { user: { id: string } } };

interface ParsedNotes {
  userNotes: string | undefined;
  metadata: Metadata;
}

export interface ValueMetrics {
  amount: number;
  cost: number;
  currentValue: number;
  gain: number;
  roiPercent: number;
}

const PAGE_SIZE_DEFAULT = 20;
const GOLD_OUNCE_TO_GRAM = 31.1034768;

function calculateRoiPercent(cost: number, currentValue: number): number {
  if (cost <= 0) return 0;
  return ((currentValue - cost) / cost) * 100;
}

function calculateGain(cost: number, currentValue: number): number {
  return currentValue - cost;
}

function calculateValueFromPrice(amount: number, purchasePrice: number, currentPrice: number): ValueMetrics {
  const cost = amount * purchasePrice;
  const currentValue = amount * currentPrice;
  return {
    amount,
    cost,
    currentValue,
    gain: calculateGain(cost, currentValue),
    roiPercent: calculateRoiPercent(cost, currentValue),
  };
}

function calculateDepositValue(
  principal: number,
  annualInterestRate: number,
  startDate: Date,
  maturityDate?: Date,
): ValueMetrics {
  const endDate = maturityDate ?? new Date();
  const elapsedMs = Math.max(0, endDate.getTime() - startDate.getTime());
  const elapsedYears = (elapsedMs / (1000 * 60 * 60 * 24)) / 365;
  const currentValue = principal * (1 + (annualInterestRate / 100) * elapsedYears);

  return {
    amount: principal,
    cost: principal,
    currentValue,
    gain: calculateGain(principal, currentValue),
    roiPercent: calculateRoiPercent(principal, currentValue),
  };
}

function parseStoredNotes(notes: string | null | undefined): ParsedNotes {
  if (!notes || notes.trim().length === 0) {
    return { userNotes: undefined, metadata: {} };
  }

  try {
    const parsed = JSON.parse(notes) as { userNotes?: unknown; metadata?: unknown };
    const metadata = typeof parsed.metadata === "object" && parsed.metadata !== null
      ? (parsed.metadata as Metadata)
      : {};

    return {
      userNotes: typeof parsed.userNotes === "string" ? parsed.userNotes : undefined,
      metadata,
    };
  } catch {
    return { userNotes: notes, metadata: {} };
  }
}

function buildStoredNotes(userNotes: string | undefined, metadata: Metadata): string | null {
  const cleanNotes = userNotes?.trim();
  const hasMetadata = Object.keys(metadata).length > 0;

  if (!cleanNotes && !hasMetadata) {
    return null;
  }

  return JSON.stringify({
    userNotes: cleanNotes,
    metadata,
  });
}

function getApiType(dbType: DbInvestmentType, metadata: Metadata): ApiInvestmentType {
  const metaType = metadata.assetType;

  if (
    metaType === "GOLD"
    || metaType === "DEPOSIT"
    || metaType === "P2P_LENDING"
    || metaType === "CRYPTO"
    || metaType === "MUTUAL_FUND"
  ) {
    return metaType;
  }

  return dbType;
}

function toApiInvestment(investment: {
  id: string;
  userId: string;
  name: string;
  type: DbInvestmentType;
  amount: number;
  currentValue: number;
  cost: number;
  gain: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const parsed = parseStoredNotes(investment.notes);
  const type = getApiType(investment.type, parsed.metadata);

  return {
    ...investment,
    type,
    notes: parsed.userNotes,
    metadata: parsed.metadata,
    roiPercent: calculateRoiPercent(investment.cost, investment.currentValue),
  };
}

function toDbTypeFilter(type?: ApiInvestmentType): DbInvestmentType | undefined {
  if (!type) return undefined;
  if (type === "GOLD" || type === "DEPOSIT" || type === "P2P_LENDING") {
    return undefined;
  }
  return type;
}

function isTypeMatch(typeFilter: ApiInvestmentType | undefined, actualType: ApiInvestmentType): boolean {
  if (!typeFilter) return true;
  return typeFilter === actualType;
}

async function fetchCoinGeckoPrice(coinId: string, vsCurrency: "usd" | "idr" = "usd"): Promise<number> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=${vsCurrency}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `CoinGecko price request failed (${response.status})`,
    });
  }

  const payload = (await response.json()) as Record<string, Record<string, number> | undefined>;
  const price = payload[coinId]?.[vsCurrency];

  if (typeof price !== "number") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Coin price not found from CoinGecko" });
  }

  return price;
}

async function fetchGoldPricePerGramUsd(): Promise<number> {
  const response = await fetch("https://api.gold-api.com/price/XAU");

  if (response.ok) {
    const payload = (await response.json()) as { price_gram_24k?: unknown; price?: unknown };

    if (typeof payload.price_gram_24k === "number") {
      return payload.price_gram_24k;
    }

    if (typeof payload.price === "number") {
      return payload.price / GOLD_OUNCE_TO_GRAM;
    }
  }

  const paxGoldPrice = await fetchCoinGeckoPrice("pax-gold", "usd");
  return paxGoldPrice / GOLD_OUNCE_TO_GRAM;
}

async function getInvestmentOrThrow(ctx: AuthedContext, id: string) {
  const investment = await ctx.db.investment.findFirst({
    where: { id, userId: ctx.session.user.id },
  });

  if (!investment) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Investment not found" });
  }

  return investment;
}

const cryptoInputSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().positive(),
  purchasePrice: z.number().nonnegative(),
  currentPrice: z.number().nonnegative().optional(),
  coinGeckoId: z.string().min(1).max(120).optional(),
  fetchFromApi: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
});

const mutualFundInputSchema = z.object({
  name: z.string().min(1).max(200),
  units: z.number().positive(),
  purchaseNav: z.number().nonnegative(),
  currentNav: z.number().nonnegative().optional(),
  notes: z.string().max(1000).optional(),
});

const goldInputSchema = z.object({
  name: z.string().min(1).max(200).default("Gold"),
  grams: z.number().positive(),
  purchasePricePerGram: z.number().nonnegative(),
  currentPricePerGram: z.number().nonnegative().optional(),
  fetchFromApi: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
});

const depositInputSchema = z.object({
  name: z.string().min(1).max(200),
  principal: z.number().positive(),
  annualInterestRate: z.number().nonnegative(),
  startDate: z.coerce.date(),
  maturityDate: z.coerce.date().optional(),
  currentValue: z.number().nonnegative().optional(),
  notes: z.string().max(1000).optional(),
});

const p2pInputSchema = z.object({
  name: z.string().min(1).max(200),
  principal: z.number().positive(),
  currentValue: z.number().nonnegative().optional(),
  expectedAnnualReturn: z.number().nonnegative().optional(),
  notes: z.string().max(1000).optional(),
});

export const investmentRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(PAGE_SIZE_DEFAULT),
        type: ApiInvestmentTypeEnum.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, type } = input;
      const skip = (page - 1) * limit;

      const dbTypeFilter = toDbTypeFilter(type);
      const where: Record<string, unknown> = { userId: ctx.session.user.id };
      if (dbTypeFilter) {
        where.type = dbTypeFilter;
      }

      const rawItems = await ctx.db.investment.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      const filteredItems = rawItems
        .map((item) => toApiInvestment(item))
        .filter((item) => isTypeMatch(type, item.type));

      const paginated = filteredItems.slice(skip, skip + limit);

      return {
        items: paginated,
        total: filteredItems.length,
        page,
        limit,
      };
    }),

  getById: protectedProcedure.input(z.object({ id: objectId })).query(async ({ ctx, input }) => {
    const investment = await getInvestmentOrThrow(ctx, input.id);
    return toApiInvestment(investment);
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        type: DbInvestmentTypeEnum,
        amount: z.number().positive(),
        currentValue: z.number().min(0),
        cost: z.number().min(0),
        notes: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const created = await ctx.db.investment.create({
        data: {
          userId: ctx.session.user.id,
          name: input.name,
          type: input.type,
          amount: input.amount,
          currentValue: input.currentValue,
          cost: input.cost,
          gain: calculateGain(input.cost, input.currentValue),
          notes: buildStoredNotes(input.notes, {}),
        },
      });

      return toApiInvestment(created);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: objectId,
        name: z.string().min(1).max(200).optional(),
        type: DbInvestmentTypeEnum.optional(),
        amount: z.number().positive().optional(),
        currentValue: z.number().min(0).optional(),
        cost: z.number().min(0).optional(),
        notes: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await getInvestmentOrThrow(ctx, input.id);
      const parsed = parseStoredNotes(existing.notes);

      const newCurrentValue = input.currentValue ?? existing.currentValue;
      const newCost = input.cost ?? existing.cost;

      const data: Parameters<typeof ctx.db.investment.update>[0]["data"] = {
        gain: calculateGain(newCost, newCurrentValue),
      };

      if (input.name !== undefined) data.name = input.name;
      if (input.type !== undefined) data.type = input.type;
      if (input.amount !== undefined) data.amount = input.amount;
      if (input.currentValue !== undefined) data.currentValue = input.currentValue;
      if (input.cost !== undefined) data.cost = input.cost;
      if (input.notes !== undefined) data.notes = buildStoredNotes(input.notes, parsed.metadata);

      const updated = await ctx.db.investment.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data,
      });

      return toApiInvestment(updated);
    }),

  createCrypto: protectedProcedure.input(cryptoInputSchema).mutation(async ({ ctx, input }) => {
    const currentPrice = input.fetchFromApi
      ? await fetchCoinGeckoPrice(input.coinGeckoId ?? "bitcoin")
      : input.currentPrice ?? input.purchasePrice;

    const metrics = calculateValueFromPrice(input.quantity, input.purchasePrice, currentPrice);

    const created = await ctx.db.investment.create({
      data: {
        userId: ctx.session.user.id,
        name: input.name,
        type: "CRYPTO",
        amount: metrics.amount,
        cost: metrics.cost,
        currentValue: metrics.currentValue,
        gain: metrics.gain,
        notes: buildStoredNotes(input.notes, {
          assetType: "CRYPTO",
          quantity: input.quantity,
          purchasePrice: input.purchasePrice,
          currentPrice,
          coinGeckoId: input.coinGeckoId,
        }),
      },
    });

    return toApiInvestment(created);
  }),

  updateCrypto: protectedProcedure
    .input(cryptoInputSchema.partial().extend({ id: objectId }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getInvestmentOrThrow(ctx, input.id);
      if (toApiInvestment(existing).type !== "CRYPTO") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Investment is not crypto" });
      }

      const parsed = parseStoredNotes(existing.notes);
      const metadata = parsed.metadata;

      const quantity = input.quantity
        ?? (typeof metadata.quantity === "number" ? metadata.quantity : existing.amount);
      const purchasePrice = input.purchasePrice
        ?? (typeof metadata.purchasePrice === "number"
          ? metadata.purchasePrice
          : existing.amount > 0
            ? existing.cost / existing.amount
            : 0);
      const selectedCoinId = input.coinGeckoId
        ?? (typeof metadata.coinGeckoId === "string" ? metadata.coinGeckoId : "bitcoin");

      let currentPrice = input.currentPrice
        ?? (typeof metadata.currentPrice === "number"
          ? metadata.currentPrice
          : existing.amount > 0
            ? existing.currentValue / existing.amount
            : purchasePrice);

      if (input.fetchFromApi === true) {
        currentPrice = await fetchCoinGeckoPrice(selectedCoinId);
      }

      const metrics = calculateValueFromPrice(quantity, purchasePrice, currentPrice);

      const updated = await ctx.db.investment.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: {
          name: input.name ?? existing.name,
          amount: metrics.amount,
          cost: metrics.cost,
          currentValue: metrics.currentValue,
          gain: metrics.gain,
          notes: buildStoredNotes(input.notes ?? parsed.userNotes, {
            assetType: "CRYPTO",
            quantity,
            purchasePrice,
            currentPrice,
            coinGeckoId: selectedCoinId,
          }),
        },
      });

      return toApiInvestment(updated);
    }),

  createMutualFund: protectedProcedure
    .input(mutualFundInputSchema)
    .mutation(async ({ ctx, input }) => {
      const currentNav = input.currentNav ?? input.purchaseNav;
      const metrics = calculateValueFromPrice(input.units, input.purchaseNav, currentNav);

      const created = await ctx.db.investment.create({
        data: {
          userId: ctx.session.user.id,
          name: input.name,
          type: "MUTUAL_FUND",
          amount: metrics.amount,
          cost: metrics.cost,
          currentValue: metrics.currentValue,
          gain: metrics.gain,
          notes: buildStoredNotes(input.notes, {
            assetType: "MUTUAL_FUND",
            units: input.units,
            purchaseNav: input.purchaseNav,
            currentNav,
          }),
        },
      });

      return toApiInvestment(created);
    }),

  updateMutualFund: protectedProcedure
    .input(mutualFundInputSchema.partial().extend({ id: objectId }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getInvestmentOrThrow(ctx, input.id);
      if (toApiInvestment(existing).type !== "MUTUAL_FUND") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Investment is not a mutual fund" });
      }

      const parsed = parseStoredNotes(existing.notes);
      const metadata = parsed.metadata;

      const units = input.units ?? (typeof metadata.units === "number" ? metadata.units : existing.amount);
      const purchaseNav = input.purchaseNav
        ?? (typeof metadata.purchaseNav === "number"
          ? metadata.purchaseNav
          : existing.amount > 0
            ? existing.cost / existing.amount
            : 0);
      const currentNav = input.currentNav
        ?? (typeof metadata.currentNav === "number"
          ? metadata.currentNav
          : existing.amount > 0
            ? existing.currentValue / existing.amount
            : purchaseNav);

      const metrics = calculateValueFromPrice(units, purchaseNav, currentNav);

      const updated = await ctx.db.investment.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: {
          name: input.name ?? existing.name,
          amount: metrics.amount,
          cost: metrics.cost,
          currentValue: metrics.currentValue,
          gain: metrics.gain,
          notes: buildStoredNotes(input.notes ?? parsed.userNotes, {
            assetType: "MUTUAL_FUND",
            units,
            purchaseNav,
            currentNav,
          }),
        },
      });

      return toApiInvestment(updated);
    }),

  createGold: protectedProcedure.input(goldInputSchema).mutation(async ({ ctx, input }) => {
    const currentPricePerGram = input.fetchFromApi
      ? await fetchGoldPricePerGramUsd()
      : input.currentPricePerGram ?? input.purchasePricePerGram;

    const metrics = calculateValueFromPrice(input.grams, input.purchasePricePerGram, currentPricePerGram);

    const created = await ctx.db.investment.create({
      data: {
        userId: ctx.session.user.id,
        name: input.name,
        type: "OTHER",
        amount: metrics.amount,
        cost: metrics.cost,
        currentValue: metrics.currentValue,
        gain: metrics.gain,
        notes: buildStoredNotes(input.notes, {
          assetType: "GOLD",
          grams: input.grams,
          purchasePricePerGram: input.purchasePricePerGram,
          currentPricePerGram,
        }),
      },
    });

    return toApiInvestment(created);
  }),

  updateGold: protectedProcedure
    .input(goldInputSchema.partial().extend({ id: objectId }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getInvestmentOrThrow(ctx, input.id);
      if (toApiInvestment(existing).type !== "GOLD") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Investment is not gold" });
      }

      const parsed = parseStoredNotes(existing.notes);
      const metadata = parsed.metadata;

      const grams = input.grams ?? (typeof metadata.grams === "number" ? metadata.grams : existing.amount);
      const purchasePricePerGram = input.purchasePricePerGram
        ?? (typeof metadata.purchasePricePerGram === "number"
          ? metadata.purchasePricePerGram
          : existing.amount > 0
            ? existing.cost / existing.amount
            : 0);

      let currentPricePerGram = input.currentPricePerGram
        ?? (typeof metadata.currentPricePerGram === "number"
          ? metadata.currentPricePerGram
          : existing.amount > 0
            ? existing.currentValue / existing.amount
            : purchasePricePerGram);

      if (input.fetchFromApi === true) {
        currentPricePerGram = await fetchGoldPricePerGramUsd();
      }

      const metrics = calculateValueFromPrice(grams, purchasePricePerGram, currentPricePerGram);

      const updated = await ctx.db.investment.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: {
          name: input.name ?? existing.name,
          amount: metrics.amount,
          cost: metrics.cost,
          currentValue: metrics.currentValue,
          gain: metrics.gain,
          notes: buildStoredNotes(input.notes ?? parsed.userNotes, {
            assetType: "GOLD",
            grams,
            purchasePricePerGram,
            currentPricePerGram,
          }),
        },
      });

      return toApiInvestment(updated);
    }),

  createDeposit: protectedProcedure
    .input(depositInputSchema)
    .mutation(async ({ ctx, input }) => {
      const metrics = input.currentValue === undefined
        ? calculateDepositValue(input.principal, input.annualInterestRate, input.startDate, input.maturityDate)
        : {
            amount: input.principal,
            cost: input.principal,
            currentValue: input.currentValue,
            gain: calculateGain(input.principal, input.currentValue),
            roiPercent: calculateRoiPercent(input.principal, input.currentValue),
          };

      const created = await ctx.db.investment.create({
        data: {
          userId: ctx.session.user.id,
          name: input.name,
          type: "OTHER",
          amount: metrics.amount,
          cost: metrics.cost,
          currentValue: metrics.currentValue,
          gain: metrics.gain,
          notes: buildStoredNotes(input.notes, {
            assetType: "DEPOSIT",
            principal: input.principal,
            annualInterestRate: input.annualInterestRate,
            startDate: input.startDate.toISOString(),
            maturityDate: input.maturityDate?.toISOString(),
          }),
        },
      });

      return toApiInvestment(created);
    }),

  updateDeposit: protectedProcedure
    .input(depositInputSchema.partial().extend({ id: objectId }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getInvestmentOrThrow(ctx, input.id);
      if (toApiInvestment(existing).type !== "DEPOSIT") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Investment is not a deposit" });
      }

      const parsed = parseStoredNotes(existing.notes);
      const metadata = parsed.metadata;

      const principal = input.principal
        ?? (typeof metadata.principal === "number" ? metadata.principal : existing.cost);
      const annualInterestRate = input.annualInterestRate
        ?? (typeof metadata.annualInterestRate === "number" ? metadata.annualInterestRate : 0);
      const startDate = input.startDate
        ?? (typeof metadata.startDate === "string" ? new Date(metadata.startDate) : existing.createdAt);
      const maturityDate = input.maturityDate
        ?? (typeof metadata.maturityDate === "string" ? new Date(metadata.maturityDate) : undefined);

      const metrics = input.currentValue === undefined
        ? calculateDepositValue(principal, annualInterestRate, startDate, maturityDate)
        : {
            amount: principal,
            cost: principal,
            currentValue: input.currentValue,
            gain: calculateGain(principal, input.currentValue),
            roiPercent: calculateRoiPercent(principal, input.currentValue),
          };

      const updated = await ctx.db.investment.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: {
          name: input.name ?? existing.name,
          amount: metrics.amount,
          cost: metrics.cost,
          currentValue: metrics.currentValue,
          gain: metrics.gain,
          notes: buildStoredNotes(input.notes ?? parsed.userNotes, {
            assetType: "DEPOSIT",
            principal,
            annualInterestRate,
            startDate: startDate.toISOString(),
            maturityDate: maturityDate?.toISOString(),
          }),
        },
      });

      return toApiInvestment(updated);
    }),

  createP2P: protectedProcedure.input(p2pInputSchema).mutation(async ({ ctx, input }) => {
    const currentValue = input.currentValue ?? input.principal;

    const created = await ctx.db.investment.create({
      data: {
        userId: ctx.session.user.id,
        name: input.name,
        type: "OTHER",
        amount: input.principal,
        cost: input.principal,
        currentValue,
        gain: calculateGain(input.principal, currentValue),
        notes: buildStoredNotes(input.notes, {
          assetType: "P2P_LENDING",
          principal: input.principal,
          expectedAnnualReturn: input.expectedAnnualReturn,
        }),
      },
    });

    return toApiInvestment(created);
  }),

  updateP2P: protectedProcedure
    .input(p2pInputSchema.partial().extend({ id: objectId }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getInvestmentOrThrow(ctx, input.id);
      if (toApiInvestment(existing).type !== "P2P_LENDING") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Investment is not P2P lending" });
      }

      const parsed = parseStoredNotes(existing.notes);
      const metadata = parsed.metadata;
      const principal = input.principal
        ?? (typeof metadata.principal === "number" ? metadata.principal : existing.cost);
      const currentValue = input.currentValue ?? existing.currentValue;

      const updated = await ctx.db.investment.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: {
          name: input.name ?? existing.name,
          amount: principal,
          cost: principal,
          currentValue,
          gain: calculateGain(principal, currentValue),
          notes: buildStoredNotes(input.notes ?? parsed.userNotes, {
            assetType: "P2P_LENDING",
            principal,
            expectedAnnualReturn: input.expectedAnnualReturn
              ?? (typeof metadata.expectedAnnualReturn === "number"
                ? metadata.expectedAnnualReturn
                : undefined),
          }),
        },
      });

      return toApiInvestment(updated);
    }),

  updateCurrentValue: protectedProcedure
    .input(
      z.object({
        id: objectId,
        currentValue: z.number().nonnegative(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await getInvestmentOrThrow(ctx, input.id);

      const updated = await ctx.db.investment.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: {
          currentValue: input.currentValue,
          gain: calculateGain(existing.cost, input.currentValue),
        },
      });

      return toApiInvestment(updated);
    }),

  getCryptoPrice: protectedProcedure
    .input(
      z.object({
        coinGeckoId: z.string().min(1).max(120),
        vsCurrency: z.enum(["usd", "idr"]).default("usd"),
      }),
    )
    .query(async ({ input }) => {
      const price = await fetchCoinGeckoPrice(input.coinGeckoId, input.vsCurrency);
      return { price, source: "CoinGecko" };
    }),

  getGoldPrice: protectedProcedure.query(async () => {
    const pricePerGram = await fetchGoldPricePerGramUsd();
    return { pricePerGram, source: "gold-api/coingecko" };
  }),

  calculateValue: protectedProcedure
    .input(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("CRYPTO"),
          quantity: z.number().positive(),
          purchasePrice: z.number().nonnegative(),
          currentPrice: z.number().nonnegative(),
        }),
        z.object({
          type: z.literal("MUTUAL_FUND"),
          units: z.number().positive(),
          purchaseNav: z.number().nonnegative(),
          currentNav: z.number().nonnegative(),
        }),
        z.object({
          type: z.literal("GOLD"),
          grams: z.number().positive(),
          purchasePricePerGram: z.number().nonnegative(),
          currentPricePerGram: z.number().nonnegative(),
        }),
        z.object({
          type: z.literal("DEPOSIT"),
          principal: z.number().positive(),
          annualInterestRate: z.number().nonnegative(),
          startDate: z.coerce.date(),
          maturityDate: z.coerce.date().optional(),
        }),
        z.object({
          type: z.literal("P2P_LENDING"),
          principal: z.number().positive(),
          currentValue: z.number().nonnegative(),
        }),
      ]),
    )
    .query(async ({ input }) => {
      switch (input.type) {
        case "CRYPTO":
          return calculateValueFromPrice(input.quantity, input.purchasePrice, input.currentPrice);
        case "MUTUAL_FUND":
          return calculateValueFromPrice(input.units, input.purchaseNav, input.currentNav);
        case "GOLD":
          return calculateValueFromPrice(input.grams, input.purchasePricePerGram, input.currentPricePerGram);
        case "DEPOSIT":
          return calculateDepositValue(input.principal, input.annualInterestRate, input.startDate, input.maturityDate);
        case "P2P_LENDING":
          return {
            amount: input.principal,
            cost: input.principal,
            currentValue: input.currentValue,
            gain: calculateGain(input.principal, input.currentValue),
            roiPercent: calculateRoiPercent(input.principal, input.currentValue),
          };
      }
    }),

  calculateRoi: protectedProcedure
    .input(
      z.object({
        cost: z.number().nonnegative(),
        currentValue: z.number().nonnegative(),
      }),
    )
    .query(async ({ input }) => {
      return {
        gain: calculateGain(input.cost, input.currentValue),
        roiPercent: calculateRoiPercent(input.cost, input.currentValue),
      };
    }),

  delete: protectedProcedure.input(z.object({ id: objectId })).mutation(async ({ ctx, input }) => {
    await getInvestmentOrThrow(ctx, input.id);
    await ctx.db.investment.delete({ where: { id: input.id, userId: ctx.session.user.id } });
    return { success: true };
  }),

  getSummary: protectedProcedure.query(async ({ ctx }) => {
    const raw = await ctx.db.investment.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    });

    const investments = raw.map((item) => toApiInvestment(item));

    const totalCost = investments.reduce((sum, inv) => sum + inv.cost, 0);
    const totalCurrentValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
    const totalGain = totalCurrentValue - totalCost;

    const byTypeMap = new Map<string, { cost: number; currentValue: number; gain: number; count: number }>();

    for (const inv of investments) {
      const current = byTypeMap.get(inv.type) ?? { cost: 0, currentValue: 0, gain: 0, count: 0 };
      byTypeMap.set(inv.type, {
        cost: current.cost + inv.cost,
        currentValue: current.currentValue + inv.currentValue,
        gain: current.gain + inv.gain,
        count: current.count + 1,
      });
    }

    const byType = Array.from(byTypeMap.entries()).map(([type, values]) => ({
      type,
      cost: values.cost,
      currentValue: values.currentValue,
      gain: values.gain,
      count: values.count,
      allocationPercent: totalCurrentValue > 0 ? (values.currentValue / totalCurrentValue) * 100 : 0,
      roiPercent: calculateRoiPercent(values.cost, values.currentValue),
    }));

    return {
      totalCost,
      totalCurrentValue,
      totalGain,
      totalGainPercent: calculateRoiPercent(totalCost, totalCurrentValue),
      investmentCount: investments.length,
      byType,
    };
  }),

  getOverview: protectedProcedure.query(async ({ ctx }) => {
    const raw = await ctx.db.investment.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    });

    const investments = raw
      .map((item) => toApiInvestment(item))
      .filter((item) => DashboardInvestmentTypeEnum.options.some((type) => type === item.type));

    const totalCurrentValue = investments.reduce((sum, investment) => sum + investment.currentValue, 0);
    const totalCost = investments.reduce((sum, investment) => sum + investment.cost, 0);

    const allocation = DashboardInvestmentTypeEnum.options.map((type) => {
      const items = investments.filter((investment) => investment.type === type);
      const value = items.reduce((sum, item) => sum + item.currentValue, 0);

      return {
        type,
        value,
        percentage: totalCurrentValue > 0 ? (value / totalCurrentValue) * 100 : 0,
        count: items.length,
      };
    }).filter((item) => item.value > 0 || item.count > 0);

    return {
      items: investments,
      totalCurrentValue,
      totalCost,
      totalGain: totalCurrentValue - totalCost,
      totalGainPercent: calculateRoiPercent(totalCost, totalCurrentValue),
      allocation,
    };
  }),
});
