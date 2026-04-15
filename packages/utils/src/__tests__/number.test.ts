/**
 * Unit tests for number utilities
 * Tests formatNumber, calculatePercentage, formatPercentage, formatCompact, toFixed, compareNumbers functions
 */

import { describe, it, expect } from "vitest";

import {
  formatNumber,
  calculatePercentage,
  formatPercentage,
  formatCompact,
  toFixed,
  compareNumbers,
} from "../number";

describe("number", () => {
  describe("formatNumber", () => {
    it("should format positive number with default settings", () => {
      expect(formatNumber(1234.56789, "en-US")).toBe("1,234.56789");
    });

    it("should format number with locale-specific grouping (Indonesian)", () => {
      expect(formatNumber(1234567, "id-ID")).toBe("1.234.567");
    });

    it("should format negative number", () => {
      expect(formatNumber(-100.5, "en-US")).toBe("-100.5");
    });

    it("should format zero", () => {
      expect(formatNumber(0, "en-US")).toBe("0");
    });

    it("should format Infinity", () => {
      expect(formatNumber(Infinity, "en-US")).toBe("∞");
    });

    it("should format NaN", () => {
      expect(formatNumber(NaN, "en-US")).toBe("NaN");
    });

    it("should format with custom decimal places", () => {
      expect(
        formatNumber(1234.56789, "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      ).toBe("1,234.57");
    });

    it("should throw error for invalid locale string", () => {
      expect(() => formatNumber(100, "")).toThrow("Invalid locale string");
    });

    it("should throw error for invalid locale type", () => {
      expect(() => formatNumber(100, undefined as never)).toThrow("Invalid locale string");
    });
  });

  describe("calculatePercentage", () => {
    it("should calculate percentage of part to total", () => {
      expect(calculatePercentage(50, 200)).toBe(25);
    });

    it("should calculate percentage correctly", () => {
      expect(calculatePercentage(10, 100)).toBe(10);
    });

    it("should return zero for part is zero", () => {
      expect(calculatePercentage(0, 100)).toBe(0);
    });

    it("should return NaN for total is zero", () => {
      expect(calculatePercentage(25, 0)).toBeNaN();
    });

    it("should handle decimal percentages", () => {
      expect(calculatePercentage(33.33, 100)).toBe(33.33);
    });

    it("should handle negative part", () => {
      expect(calculatePercentage(-10, 100)).toBe(-10);
    });

    it("should handle part greater than total (>100%)", () => {
      expect(calculatePercentage(150, 100)).toBe(150);
    });

    it("should handle both negative", () => {
      expect(calculatePercentage(-10, -100)).toBe(10);
    });

    it("should throw error if part is not a number", () => {
      expect(() => calculatePercentage("100" as never, 100)).toThrow("Invalid inputs");
    });

    it("should throw error if total is not a number", () => {
      expect(() => calculatePercentage(100, "200" as never)).toThrow("Invalid inputs");
    });
  });

  describe("formatPercentage", () => {
    it("should format percentage with percent symbol", () => {
      expect(formatPercentage(25, "en-US")).toBe("25.00%");
    });

    it("should format decimal percentage", () => {
      expect(formatPercentage(50.5, "en-US")).toBe("50.50%");
    });

    it("should format zero percentage", () => {
      expect(formatPercentage(0, "en-US")).toBe("0.00%");
    });

    it("should format negative percentage", () => {
      expect(formatPercentage(-10, "en-US")).toBe("-10.00%");
    });

    it("should format percentage greater than 100", () => {
      expect(formatPercentage(110, "en-US")).toBe("110.00%");
    });

    it("should format with Indonesian locale (decimal comma)", () => {
      expect(formatPercentage(33.333, "id-ID")).toBe("33,33%");
    });

    it("should format NaN percentage", () => {
      expect(formatPercentage(NaN, "en-US")).toBe("NaN%");
    });

    it("should format Infinity percentage", () => {
      expect(formatPercentage(Infinity, "en-US")).toBe("∞%");
    });

    it("should throw error if value is not a number", () => {
      expect(() => formatPercentage("100" as never, "en-US")).toThrow("Invalid value");
    });

    it("should throw error for invalid locale string", () => {
      expect(() => formatPercentage(100, "")).toThrow("Invalid locale string");
    });
  });

  describe("formatCompact", () => {
    it("should format large number in compact notation", () => {
      expect(formatCompact(1000, "en-US")).toBe("1K");
    });

    it("should format million in compact notation", () => {
      expect(formatCompact(1000000, "en-US")).toBe("1M");
    });

    it("should format billion in compact notation", () => {
      expect(formatCompact(1000000000, "en-US")).toBe("1B");
    });

    it("should format with Indonesian locale", () => {
      expect(formatCompact(1234, "id-ID")).toBe("1,23 rb");
    });

    it("should format numbers below compact threshold", () => {
      expect(formatCompact(150000, "en-US")).toBe("150K");
    });

    it("should format decimal values", () => {
      expect(formatCompact(1.5, "en-US")).toBe("1.5");
    });

    it("should format zero", () => {
      expect(formatCompact(0, "en-US")).toBe("0");
    });

    it("should format negative numbers", () => {
      expect(formatCompact(-5000, "en-US")).toBe("-5K");
    });

    it("should format NaN", () => {
      expect(formatCompact(NaN, "en-US")).toBe("NaN");
    });

    it("should format Infinity", () => {
      expect(formatCompact(Infinity, "en-US")).toBe("∞");
    });

    it("should throw error if value is not a number", () => {
      expect(() => formatCompact("1000" as never, "en-US")).toThrow("Invalid value");
    });

    it("should throw error for invalid locale string", () => {
      expect(() => formatCompact(1000, "")).toThrow("Invalid locale string");
    });
  });

  describe("toFixed", () => {
    it("should round to zero decimal places", () => {
      expect(toFixed(123.456, 0)).toBe(123);
    });

    it("should round to one decimal place", () => {
      expect(toFixed(123.456, 1)).toBe(123.5);
    });

    it("should round to two decimal places", () => {
      expect(toFixed(123.456, 2)).toBe(123.46);
    });

    it("should round to three decimal places", () => {
      expect(toFixed(123.456, 3)).toBe(123.456);
    });

    it("should not change value if precision is greater than actual decimals", () => {
      expect(toFixed(123.456, 6)).toBe(123.456);
    });

    it("should round negative numbers", () => {
      expect(toFixed(-123.456, 2)).toBe(-123.46);
    });

    it("should round .5 up", () => {
      expect(toFixed(123.455, 2)).toBe(123.46);
    });

    it("should round -0.5 according to standard JS Math.round", () => {
      expect(toFixed(-123.455, 2)).toBe(-123.45);
    });

    it("should handle zero", () => {
      expect(toFixed(0, 2)).toBe(0);
    });

    it("should return NaN for NaN input", () => {
      expect(toFixed(NaN, 2)).toBeNaN();
    });

    it("should return Infinity for Infinity input", () => {
      expect(toFixed(Infinity, 2)).toBe(Infinity);
    });

    it("should throw error for negative precision", () => {
      expect(() => toFixed(123.456, -1)).toThrow("Invalid precision");
    });

    it("should throw error for precision that is not an integer", () => {
      expect(() => toFixed(123.456, 1.5)).toThrow("Invalid precision");
    });

    it("should throw error if value is not a number", () => {
      expect(() => toFixed("123" as never, 2)).toThrow("Invalid value");
    });
  });

  describe("compareNumbers", () => {
    it("should return -1 when first number is less than second", () => {
      expect(compareNumbers(10, 20)).toBe(-1);
    });

    it("should return 1 when first number is greater than second", () => {
      expect(compareNumbers(20, 10)).toBe(1);
    });

    it("should return 0 when numbers are equal", () => {
      expect(compareNumbers(10, 10)).toBe(0);
    });

    it("should handle decimal comparisons", () => {
      expect(compareNumbers(10.5, 10)).toBe(1);
      expect(compareNumbers(9.9, 10)).toBe(-1);
    });

    it("should handle NaN comparison (NaN equals NaN)", () => {
      expect(compareNumbers(NaN, NaN)).toBe(0);
    });

    it("should handle Infinity comparison", () => {
      expect(compareNumbers(Infinity, Infinity)).toBe(0);
      expect(compareNumbers(Infinity, 100)).toBe(1);
      expect(compareNumbers(100, Infinity)).toBe(-1);
      expect(compareNumbers(Infinity, -Infinity)).toBe(1);
    });

    it("should handle -Infinity comparison", () => {
      expect(compareNumbers(-Infinity, -Infinity)).toBe(0);
      expect(compareNumbers(-Infinity, 0)).toBe(-1);
      expect(compareNumbers(0, -Infinity)).toBe(1);
    });

    it("should handle zero comparison", () => {
      expect(compareNumbers(0, 0)).toBe(0);
      expect(compareNumbers(-0, 0)).toBe(0);
    });

    it("should throw error if first argument is not a number", () => {
      expect(() => compareNumbers("10" as never, 20)).toThrow("Invalid inputs");
    });

    it("should throw error if second argument is not a number", () => {
      expect(() => compareNumbers(10, "20" as never)).toThrow("Invalid inputs");
    });
  });
});
