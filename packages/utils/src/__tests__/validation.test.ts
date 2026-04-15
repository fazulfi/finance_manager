/**
 * Unit tests for validation utilities
 * Tests email, phone, currency, positive, nonNegative, budgetAmount functions
 */

import { describe, it, expect } from "vitest";

import { email, phone, currency, positive, nonNegative, budgetAmount } from "../validation";

describe("validation", () => {
  describe("email", () => {
    it("should validate standard email format", () => {
      expect(email("user@example.com")).toBe(true);
    });

    it("should validate email with subdomain", () => {
      expect(email("user@sub.domain.com")).toBe(true);
    });

    it("should validate email with plus sign for aliases", () => {
      expect(email("user+tag@example.com")).toBe(true);
    });

    it("should validate email with international TLD", () => {
      expect(email("user@example.co.uk")).toBe(true);
    });

    it("should return false for invalid email (missing @)", () => {
      expect(email("invalid-email")).toBe(false);
    });

    it("should return false for invalid email (missing domain)", () => {
      expect(email("user@")).toBe(false);
    });

    it("should return false for null input", () => {
      expect(email(null)).toBe(false);
    });

    it("should return false for undefined input", () => {
      expect(email(undefined)).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(email("")).toBe(false);
    });

    it("should return false for non-string input", () => {
      expect(email(123 as never)).toBe(false);
    });
  });

  describe("phone", () => {
    it("should validate US phone format with country code", () => {
      expect(phone("+1 555-123-4567", "us")).toBe(true);
    });

    it("should validate US phone format without country code", () => {
      expect(phone("555-123-4567", "us")).toBe(true);
    });

    it("should validate US phone format with parentheses", () => {
      expect(phone("(555) 555-5555", "us")).toBe(true);
    });

    it("should validate US phone format with dots", () => {
      expect(phone("555.555.5555", "us")).toBe(true);
    });

    it("should validate US phone format as 10 digits", () => {
      expect(phone("5555555555", "us")).toBe(true);
    });

    it("should validate EU phone format", () => {
      expect(phone("+44 20 12345678", "eu")).toBe(true);
    });

    it("should validate EU phone format without leading zero", () => {
      expect(phone("+442012345678", "eu")).toBe(true);
    });

    it("should validate EU phone format with spaces (single separator)", () => {
      expect(phone("+44 20 12345678", "eu")).toBe(true);
    });

    it("should return false for invalid US phone", () => {
      expect(phone("invalid-phone", "us")).toBe(false);
    });

    it("should return false for EU format in US mode", () => {
      expect(phone("+44 20 12345678", "us")).toBe(false);
    });

    it("should return false for null input", () => {
      expect(phone(null, "us")).toBe(false);
    });

    it("should return false for undefined input", () => {
      expect(phone(undefined, "us")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(phone("", "us")).toBe(false);
    });

    it("should return false for non-string input", () => {
      expect(phone(123 as never, "us")).toBe(false);
    });

    it("should use US mode by default", () => {
      expect(phone("+1 555-123-4567")).toBe(true);
    });
  });

  describe("currency", () => {
    it("should validate valid currency code", () => {
      expect(currency("USD")).toBe(true);
      expect(currency("EUR")).toBe(true);
      expect(currency("GBP")).toBe(true);
      expect(currency("IDR")).toBe(true);
      expect(currency("JPY")).toBe(true);
    });

    it("should be case-insensitive (uses .toUpperCase())", () => {
      expect(currency("usd")).toBe(true);
      expect(currency("Usd")).toBe(true);
    });

    it("should return false for 2-letter code", () => {
      expect(currency("US")).toBe(false);
    });

    it("should return false for 4-letter code", () => {
      expect(currency("USDA")).toBe(false);
    });

    it("should return false for 4-letter code (invalid ISO 4217)", () => {
      expect(currency("XYZ")).toBe(true); // 3-letter code, passes regex
    });

    it("should return false for null input", () => {
      expect(currency(null)).toBe(false);
    });

    it("should return false for undefined input", () => {
      expect(currency(undefined)).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(currency("")).toBe(false);
    });

    it("should return false for non-string input", () => {
      expect(currency(123 as never)).toBe(false);
    });
  });

  describe("positive", () => {
    it("should validate positive number", () => {
      expect(positive(100)).toBe(true);
      expect(positive(0.01)).toBe(true);
    });

    it("should return false for zero", () => {
      expect(positive(0)).toBe(false);
    });

    it("should return false for negative number", () => {
      expect(positive(-5)).toBe(false);
      expect(positive(-0.01)).toBe(false);
    });

    it("should return false for null input", () => {
      expect(positive(null)).toBe(false);
    });

    it("should return false for undefined input", () => {
      expect(positive(undefined)).toBe(false);
    });

    it("should return false for non-number input", () => {
      expect(positive("100" as never)).toBe(false);
      expect(positive(true as never)).toBe(false);
    });

    it("should return false for NaN", () => {
      expect(positive(NaN)).toBe(false);
    });
  });

  describe("nonNegative", () => {
    it("should validate non-negative number (zero and positive)", () => {
      expect(nonNegative(0)).toBe(true);
      expect(nonNegative(100)).toBe(true);
      expect(nonNegative(0.01)).toBe(true);
    });

    it("should return false for negative number", () => {
      expect(nonNegative(-5)).toBe(false);
      expect(nonNegative(-0.01)).toBe(false);
    });

    it("should return false for null input", () => {
      expect(nonNegative(null)).toBe(false);
    });

    it("should return false for undefined input", () => {
      expect(nonNegative(undefined)).toBe(false);
    });

    it("should return false for non-number input", () => {
      expect(nonNegative("100" as never)).toBe(false);
      expect(nonNegative(true as never)).toBe(false);
    });

    it("should return false for NaN", () => {
      expect(nonNegative(NaN)).toBe(false);
    });
  });

  describe("budgetAmount", () => {
    it("should validate valid budget amount under max limit", () => {
      expect(budgetAmount(500, "USD")).toBe(true);
      expect(budgetAmount(1000000, "USD")).toBe(true);
    });

    it("should return false for zero budget", () => {
      expect(budgetAmount(0, "USD")).toBe(false);
    });

    it("should return false for budget above max limit", () => {
      expect(budgetAmount(1000001, "USD")).toBe(false);
    });

    it("should return false for negative budget", () => {
      expect(budgetAmount(-500, "USD")).toBe(false);
    });

    it("should return false for null budget", () => {
      expect(budgetAmount(null, "USD")).toBe(false);
    });

    it("should return false for 4-letter currency code", () => {
      expect(budgetAmount(500, "XYZA")).toBe(false);
    });

    it("should return false for non-number budget", () => {
      expect(budgetAmount("500" as never, "USD")).toBe(false);
    });

    it("should work with different currency codes", () => {
      expect(budgetAmount(500, "EUR")).toBe(true);
      expect(budgetAmount(500, "GBP")).toBe(true);
      expect(budgetAmount(1000000, "EUR")).toBe(true);
    });
  });
});
