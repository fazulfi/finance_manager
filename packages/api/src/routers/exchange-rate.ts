import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  findConversionRate,
  SUPPORTED_CURRENCIES,
  upsertExchangeRates,
  type SupportedCurrency,
} from "../lib/exchange-rate.js";
import { protectedProcedure, router } from "../trpc.js";

const currencyEnum = z.enum(SUPPORTED_CURRENCIES);

export const exchangeRateRouter = router({
  getExchangeRates: protectedProcedure
    .input(
      z.object({
        base: currencyEnum.optional(),
        target: currencyEnum.optional(),
        date: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const snapshotDate = input.date ?? new Date();
      const rates = await ctx.db.exchangeRate.findMany({
        where: {
          ...(input.base !== undefined ? { base: input.base } : {}),
          ...(input.target !== undefined ? { target: input.target } : {}),
          snapshotDate: {
            lte: new Date(
              Date.UTC(
                snapshotDate.getUTCFullYear(),
                snapshotDate.getUTCMonth(),
                snapshotDate.getUTCDate(),
              ),
            ),
          },
        },
        orderBy: [{ snapshotDate: "desc" }],
        take: 250,
      });

      return {
        items: rates,
      };
    }),

  convertCurrency: protectedProcedure
    .input(
      z.object({
        amount: z.number().finite(),
        from: currencyEnum,
        to: currencyEnum,
        date: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const asOf = input.date ?? new Date();
      const rate = await findConversionRate(
        ctx.db,
        input.from as SupportedCurrency,
        input.to as SupportedCurrency,
        asOf,
      );

      if (!rate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `No exchange rate found for ${input.from} -> ${input.to}`,
        });
      }

      return {
        amount: input.amount,
        from: input.from,
        to: input.to,
        rate,
        convertedAmount: input.amount * rate,
        asOf,
      };
    }),

  updateExchangeRates: protectedProcedure
    .input(z.object({}).optional())
    .mutation(async ({ ctx }) => {
      const result = await upsertExchangeRates(ctx.db);

      return {
        success: true,
        snapshotDate: result.snapshotDate,
        updated: result.updated,
      };
    }),
});
