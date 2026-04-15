import { CurrencyCode, type ExchangeRate } from "@finance/types";
import { describe, expect, it } from "vitest";

import {
  convertAmount,
  getConversionRate,
  getRateKey,
  normalizeRateMap,
} from "../currency-conversion";

const sampleRates: ExchangeRate[] = [
  {
    id: "rate-1",
    base: CurrencyCode.USD,
    target: CurrencyCode.IDR,
    rate: 15000,
    snapshotDate: new Date("2026-04-14T00:00:00.000Z"),
    source: "mock",
    fetchedAt: new Date("2026-04-14T12:00:00.000Z"),
    createdAt: new Date("2026-04-14T12:00:00.000Z"),
    updatedAt: new Date("2026-04-14T12:00:00.000Z"),
  },
  {
    id: "rate-2",
    base: CurrencyCode.EUR,
    target: CurrencyCode.USD,
    rate: 1.1,
    snapshotDate: new Date("2026-04-14T00:00:00.000Z"),
    source: "mock",
    fetchedAt: new Date("2026-04-14T12:00:00.000Z"),
    createdAt: new Date("2026-04-14T12:00:00.000Z"),
    updatedAt: new Date("2026-04-14T12:00:00.000Z"),
  },
];

describe("currency-conversion", () => {
  describe("normalizeRateMap", () => {
    it("normalizes rates into pair-keyed lookup", () => {
      expect(normalizeRateMap(sampleRates)).toEqual({
        [getRateKey(CurrencyCode.USD, CurrencyCode.IDR)]: 15000,
        [getRateKey(CurrencyCode.EUR, CurrencyCode.USD)]: 1.1,
      });
    });

    it("skips non-positive and non-finite rates", () => {
      const sampleRate0 = sampleRates[0]!; // Non-null assertion is safe here since sampleRates is initialized
      const badRates = [
        ...sampleRates,
        {
          ...sampleRate0,
          id: "bad-1",
          rate: 0,
          base: CurrencyCode.SGD,
          target: CurrencyCode.USD,
          snapshotDate: sampleRate0.snapshotDate,
          source: "mock",
        },
        {
          ...sampleRate0,
          id: "bad-2",
          rate: Number.NaN,
          base: CurrencyCode.JPY,
          target: CurrencyCode.USD,
          snapshotDate: sampleRate0.snapshotDate,
          source: "mock",
        },
      ];

      expect(normalizeRateMap(badRates)).toEqual({
        [getRateKey(CurrencyCode.USD, CurrencyCode.IDR)]: 15000,
        [getRateKey(CurrencyCode.EUR, CurrencyCode.USD)]: 1.1,
      });
    });
  });

  describe("getConversionRate", () => {
    const rates = normalizeRateMap(sampleRates);

    it("returns 1 for same-currency conversion", () => {
      expect(getConversionRate(CurrencyCode.USD, CurrencyCode.USD, rates)).toBe(1);
    });

    it("uses direct rate when available", () => {
      expect(getConversionRate(CurrencyCode.USD, CurrencyCode.IDR, rates)).toBe(15000);
    });

    it("uses inverse rate when direct pair is missing", () => {
      expect(getConversionRate(CurrencyCode.USD, CurrencyCode.EUR, rates)).toBeCloseTo(1 / 1.1, 8);
    });

    it("returns null when no direct or inverse pair exists", () => {
      expect(getConversionRate(CurrencyCode.SGD, CurrencyCode.JPY, rates)).toBeNull();
    });
  });

  describe("convertAmount", () => {
    const rates = normalizeRateMap(sampleRates);

    it("converts and rounds to target currency decimals", () => {
      expect(convertAmount(12.34, CurrencyCode.USD, CurrencyCode.IDR, rates)).toBe(185100);
      expect(convertAmount(100, CurrencyCode.EUR, CurrencyCode.USD, rates)).toBe(110);
    });

    it("supports negative amounts", () => {
      expect(convertAmount(-100, CurrencyCode.EUR, CurrencyCode.USD, rates)).toBe(-110);
    });

    it("throws when conversion pair cannot be resolved", () => {
      expect(() => convertAmount(10, CurrencyCode.SGD, CurrencyCode.JPY, rates)).toThrow(
        /Missing exchange rate/,
      );
    });
  });
});
