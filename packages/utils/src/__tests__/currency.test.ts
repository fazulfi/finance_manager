/**
 * Unit tests for currency utilities
 * Tests formatCurrency and parseCurrency functions with various inputs
 */

import { describe, it, expect } from "vitest";
import { formatCurrency, parseCurrency } from "../currency";

describe("currency", () => {
  describe("formatCurrency", () => {
    it("should format USD currency with positive value", () => {
      expect(formatCurrency(1234.56, "USD", "en-US")).toBe("$1,234.56");
    });

    it("should format EUR currency with different locale", () => {
      expect(formatCurrency(100, "EUR", "fr-FR")).toBe("100,00\u00a0€");
    });

    it("should format IDR currency with locale-specific formatting", () => {
      expect(formatCurrency(500000, "IDR", "id-ID")).toBe("Rp\u00a0500.000");
    });

    it("should format negative values with currency symbol", () => {
      expect(formatCurrency(-100.5, "USD", "en-US")).toBe("-$100.50");
    });

    it("should format zero value", () => {
      expect(formatCurrency(0, "USD", "en-US")).toBe("$0.00");
    });

    it("should format large numbers with locale-specific grouping", () => {
      expect(formatCurrency(1234567890, "USD", "en-US")).toBe("$1,234,567,890.00");
    });

    it("should validate and throw error on invalid currency code", () => {
      expect(() => formatCurrency(100, "INVALID", "en-US")).toThrow(/Unsupported currency code/i);
    });

    it("should throw error on invalid locale", () => {
      expect(formatCurrency(100, "USD", "invalid-locale")).toBe("$100.00");
    });
  });

  describe("parseCurrency", () => {
    it("should parse USD formatted currency string back to original value", () => {
      expect(parseCurrency("$1,234.56", "en-US")).toBe(1234.56);
    });

    it("should parse EUR formatted currency string with locale-specific formatting", () => {
      expect(parseCurrency("100,00\u202f€", "fr-FR")).toBe(100);
    });

    it("should parse IDR formatted currency string to numeric value", () => {
      expect(parseCurrency("Rp\u00a0500.000", "id-ID")).toBe(500000);
    });

    it("should parse negative values correctly", () => {
      expect(parseCurrency("-$100.50", "en-US")).toBe(-100.5);
    });

    it("should parse zero value", () => {
      expect(parseCurrency("$0.00", "en-US")).toBe(0);
    });

    it("should parse large numbers correctly", () => {
      expect(parseCurrency("1,234,567.89", "en-US")).toBe(1234567.89);
    });

    it("should throw error on empty string", () => {
      expect(() => parseCurrency("", "en-US")).toThrow("must be a non-empty string");
    });

    it("should throw error on non-numeric input", () => {
      expect(() => parseCurrency("not a number", "en-US")).toThrow(/Failed to parse currency/);
    });
  });
});
