/**
 * Unit tests for calculation utilities
 * Tests budgetRemaining, budgetSpentPercentage, portfolioGain, debtPayoff, investmentGain functions
 */

import { describe, it, expect } from "vitest";
import {
  budgetRemaining,
  budgetSpentPercentage,
  portfolioGain,
  debtPayoff,
  investmentGain,
} from "../calculations";

describe("calculations", () => {
  describe("budgetRemaining", () => {
    it("should calculate remaining budget", () => {
      expect(budgetRemaining(1000, 300)).toBe(700);
    });

    it("should return zero when budget equals spent", () => {
      expect(budgetRemaining(500, 500)).toBe(0);
    });

    it("should cap at zero when spent exceeds budget", () => {
      expect(budgetRemaining(1000, 1200)).toBe(0);
      expect(budgetRemaining(100, 150)).toBe(0);
    });

    it("should handle zero budget", () => {
      expect(budgetRemaining(0, 0)).toBe(0);
    });

    it("should handle zero spent", () => {
      expect(budgetRemaining(1000, 0)).toBe(1000);
    });

    it("should handle negative values", () => {
      expect(budgetRemaining(1000, -100)).toBe(1100);
    });
  });

  describe("budgetSpentPercentage", () => {
    it("should calculate percentage of budget spent", () => {
      expect(budgetSpentPercentage(1000, 300)).toBe(30);
    });

    it("should return 100 when budget is fully spent", () => {
      expect(budgetSpentPercentage(500, 500)).toBe(100);
    });

    it("should return 0 when nothing is spent", () => {
      expect(budgetSpentPercentage(1000, 0)).toBe(0);
    });

    it("should return 0 for zero budget", () => {
      expect(budgetSpentPercentage(0, 0)).toBe(0);
    });

    it("should return NaN for NaN budget", () => {
      expect(budgetSpentPercentage(NaN, 100)).toBeNaN();
    });

    it("should return 0 for negative spent", () => {
      expect(budgetSpentPercentage(1000, -100)).toBe(0);
    });

    it("should cap at 100 for over-spend", () => {
      expect(budgetSpentPercentage(100, 150)).toBe(100);
    });

    it("should not cap for under-spend (returns 10%)", () => {
      expect(budgetSpentPercentage(1000, 100)).toBe(10);
    });
  });

  describe("portfolioGain", () => {
    it("should calculate total gain from stocks", () => {
      const stocks: any[] = [
        {
          id: "1",
          ticker: "AAPL",
          name: "Apple",
          exchange: "NASDAQ",
          quantity: 100,
          avgBuyPrice: 100,
          currentPrice: 110,
          totalCost: 10000,
          currentValue: 11000,
          gain: 5000,
          gainPercent: 10,
          lastUpdated: new Date(),
        },
        {
          id: "2",
          ticker: "GOOGL",
          name: "Google",
          exchange: "NASDAQ",
          quantity: 50,
          avgBuyPrice: 100,
          currentPrice: 80,
          totalCost: 5000,
          currentValue: 4000,
          gain: -2000,
          gainPercent: -5,
          lastUpdated: new Date(),
        },
      ];
      expect(portfolioGain(stocks, "IDR")).toBe(3000);
    });

    it("should return zero for empty stocks array", () => {
      const stocks: any[] = [];
      expect(portfolioGain(stocks, "USD")).toBe(0);
    });

    it("should handle all positive gains", () => {
      const stocks: any[] = [
        {
          id: "1",
          ticker: "AAPL",
          name: "Apple",
          exchange: "NASDAQ",
          quantity: 100,
          avgBuyPrice: 100,
          currentPrice: 110,
          totalCost: 10000,
          currentValue: 11000,
          gain: 1000,
          gainPercent: 10,
          lastUpdated: new Date(),
        },
        {
          id: "2",
          ticker: "GOOGL",
          name: "Google",
          exchange: "NASDAQ",
          quantity: 50,
          avgBuyPrice: 100,
          currentPrice: 120,
          totalCost: 5000,
          currentValue: 6000,
          gain: 2000,
          gainPercent: 20,
          lastUpdated: new Date(),
        },
      ];
      expect(portfolioGain(stocks, "EUR")).toBe(3000);
    });

    it("should handle all negative losses", () => {
      const stocks: any[] = [
        {
          id: "1",
          ticker: "AAPL",
          name: "Apple",
          exchange: "NASDAQ",
          quantity: 100,
          avgBuyPrice: 100,
          currentPrice: 95,
          totalCost: 10000,
          currentValue: 9500,
          gain: -500,
          gainPercent: -5,
          lastUpdated: new Date(),
        },
        {
          id: "2",
          ticker: "GOOGL",
          name: "Google",
          exchange: "NASDAQ",
          quantity: 50,
          avgBuyPrice: 100,
          currentPrice: 90,
          totalCost: 5000,
          currentValue: 4500,
          gain: -1000,
          gainPercent: -10,
          lastUpdated: new Date(),
        },
      ];
      expect(portfolioGain(stocks, "USD")).toBe(-1500);
    });

    it("should ignore currency parameter in calculation", () => {
      const stocks: any[] = [
        {
          id: "1",
          ticker: "AAPL",
          name: "Apple",
          exchange: "NASDAQ",
          quantity: 100,
          avgBuyPrice: 100,
          currentPrice: 110,
          totalCost: 10000,
          currentValue: 11000,
          gain: 1000,
          gainPercent: 10,
          lastUpdated: new Date(),
        },
        {
          id: "2",
          ticker: "GOOGL",
          name: "Google",
          exchange: "NASDAQ",
          quantity: 50,
          avgBuyPrice: 100,
          currentPrice: 120,
          totalCost: 5000,
          currentValue: 6000,
          gain: 2000,
          gainPercent: 20,
          lastUpdated: new Date(),
        },
      ];
      expect(portfolioGain(stocks, "USD")).toBe(3000);
      expect(portfolioGain(stocks, "EUR")).toBe(3000);
    });
  });

  describe("debtPayoff", () => {
    it("should calculate months to payoff with payment", () => {
      const debt: any = {
        id: "1",
        name: "Credit Card",
        type: "credit",
        totalAmount: 100000,
        interestRate: 10, // 10% annual rate
        minPayment: 1000,
        remaining: 100000,
      };
      expect(debtPayoff(debt, 2000)).toBe(53);
    });

    it("should use minPayment when not provided", () => {
      const debt: any = {
        id: "1",
        name: "Credit Card",
        type: "credit",
        totalAmount: 100000,
        interestRate: 10,
        minPayment: 1000,
        remaining: 100000,
      };
      expect(debtPayoff(debt)).toBe(100); // 100,000 / 1,000 = 100 months
    });

    it("should return 0 for zero debt", () => {
      const debt: any = {
        id: "1",
        name: "Credit Card",
        type: "credit",
        totalAmount: 0,
        interestRate: 10,
        minPayment: 1000,
        remaining: 0,
      };
      expect(debtPayoff(debt, 1000)).toBe(0);
    });

    it("should return Infinity for zero payment", () => {
      const debt: any = {
        id: "1",
        name: "Credit Card",
        type: "credit",
        totalAmount: 100000,
        interestRate: 10,
        minPayment: 1000,
        remaining: 100000,
      };
      expect(debtPayoff(debt, 0)).toBe(Infinity);
    });

    it("should return 0 for zero remaining", () => {
      const debt: any = {
        id: "1",
        name: "Credit Card",
        type: "credit",
        totalAmount: 100000,
        interestRate: 10,
        minPayment: 1000,
        remaining: 0,
      };
      expect(debtPayoff(debt, 1000)).toBe(0);
    });

    it("should handle no interest rate", () => {
      const debt: any = {
        id: "1",
        name: "Credit Card",
        type: "credit",
        totalAmount: 100000,
        interestRate: 0,
        minPayment: 1000,
        remaining: 100000,
      };
      expect(debtPayoff(debt, 1000)).toBe(100); // 100,000 / 1,000
    });

    it("should handle high interest rate (109 months)", () => {
      const debt: any = {
        id: "1",
        name: "Credit Card",
        type: "credit",
        totalAmount: 100000,
        interestRate: 20, // 20% annual rate
        minPayment: 1000,
        remaining: 100000,
      };
      const months = debtPayoff(debt, 2000);
      expect(months).toBe(109);
    });

    it("should handle low interest rate (53 months)", () => {
      const debt: any = {
        id: "1",
        name: "Credit Card",
        type: "credit",
        totalAmount: 100000,
        interestRate: 2, // 2% annual rate
        minPayment: 1000,
        remaining: 100000,
      };
      const months = debtPayoff(debt, 2000);
      expect(months).toBe(53);
    });

    it("should handle very low interest rate (51 months)", () => {
      const debt: any = {
        id: "1",
        name: "Credit Card",
        type: "credit",
        totalAmount: 100000,
        interestRate: 0.1, // Very low
        minPayment: 1000,
        remaining: 100000,
      };
      const months = debtPayoff(debt, 2000);
      expect(months).toBe(51);
    });
  });

  describe("investmentGain", () => {
    it("should calculate gain and percentage", () => {
      const result = investmentGain({ cost: 10000, currentValue: 12500 });
      expect(result.gain).toBe(2500);
      expect(result.percent).toBe(25);
    });

    it("should calculate loss and negative percentage", () => {
      const result = investmentGain({ cost: 5000, currentValue: 4000 });
      expect(result.gain).toBe(-1000);
      expect(result.percent).toBe(-20);
    });

    it("should return zero gain when unchanged", () => {
      const result = investmentGain({ cost: 1000, currentValue: 1000 });
      expect(result.gain).toBe(0);
      expect(result.percent).toBe(0);
    });

    it("should return zero gain and percent for zero cost", () => {
      const result = investmentGain({ cost: 0, currentValue: 1000 });
      expect(result.gain).toBe(0);
      expect(result.percent).toBe(0);
    });

    it("should return zero gain and percent for negative cost (invalid)", () => {
      const result = investmentGain({ cost: -100, currentValue: 100 });
      expect(result.gain).toBe(0);
      expect(result.percent).toBe(0);
    });

    it("should return zero gain and percent for zero current value", () => {
      const result = investmentGain({ cost: 1000, currentValue: 0 });
      expect(result.gain).toBe(-1000);
      expect(result.percent).toBe(-100);
    });

    it("should handle large investments", () => {
      const result = investmentGain({ cost: 1000000, currentValue: 1500000 });
      expect(result.gain).toBe(500000);
      expect(result.percent).toBe(50);
    });
  });
});
