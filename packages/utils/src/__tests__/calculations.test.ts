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
  monthlyInterestAmount,
  isDebtPayoffFeasible,
  projectedDebtPayoffDate,
  generateDebtPaymentSchedule,
  calculateDebtSnowball,
  investmentGain,
} from "../calculations";

type PortfolioStock = Parameters<typeof portfolioGain>[0][number];
type CalculationDebt = Parameters<typeof debtPayoff>[0];

function createStock(overrides: Partial<PortfolioStock> = {}): PortfolioStock {
  return {
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
    lastUpdated: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function createDebt(overrides: Partial<CalculationDebt> = {}): CalculationDebt {
  return {
    id: "1",
    name: "Credit Card",
    type: "credit",
    totalAmount: 100000,
    interestRate: 10,
    minPayment: 1000,
    remaining: 100000,
    ...overrides,
  };
}

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
      const stocks: PortfolioStock[] = [
        createStock({ gain: 5000 }),
        createStock({
          id: "2",
          ticker: "GOOGL",
          name: "Google",
          quantity: 50,
          currentPrice: 80,
          totalCost: 5000,
          currentValue: 4000,
          gain: -2000,
          gainPercent: -5,
        }),
      ];
      expect(portfolioGain(stocks, "IDR")).toBe(3000);
    });

    it("should return zero for empty stocks array", () => {
      const stocks: PortfolioStock[] = [];
      expect(portfolioGain(stocks, "USD")).toBe(0);
    });

    it("should handle all positive gains", () => {
      const stocks: PortfolioStock[] = [
        createStock(),
        createStock({
          id: "2",
          ticker: "GOOGL",
          name: "Google",
          quantity: 50,
          currentPrice: 120,
          totalCost: 5000,
          currentValue: 6000,
          gain: 2000,
          gainPercent: 20,
        }),
      ];
      expect(portfolioGain(stocks, "EUR")).toBe(3000);
    });

    it("should handle all negative losses", () => {
      const stocks: PortfolioStock[] = [
        createStock({ currentPrice: 95, currentValue: 9500, gain: -500, gainPercent: -5 }),
        createStock({
          id: "2",
          ticker: "GOOGL",
          name: "Google",
          quantity: 50,
          currentPrice: 90,
          totalCost: 5000,
          currentValue: 4500,
          gain: -1000,
          gainPercent: -10,
        }),
      ];
      expect(portfolioGain(stocks, "USD")).toBe(-1500);
    });

    it("should ignore currency parameter in calculation", () => {
      const stocks: PortfolioStock[] = [
        createStock(),
        createStock({
          id: "2",
          ticker: "GOOGL",
          name: "Google",
          quantity: 50,
          currentPrice: 120,
          totalCost: 5000,
          currentValue: 6000,
          gain: 2000,
          gainPercent: 20,
        }),
      ];
      expect(portfolioGain(stocks, "USD")).toBe(3000);
      expect(portfolioGain(stocks, "EUR")).toBe(3000);
    });
  });

  describe("debtPayoff", () => {
    it("should calculate months to payoff with payment", () => {
      const debt = createDebt();
      expect(debtPayoff(debt, 2000)).toBe(65);
    });

    it("should use minPayment when not provided", () => {
      const debt = createDebt();
      expect(debtPayoff(debt)).toBe(216);
    });

    it("should return 0 for zero debt", () => {
      const debt = createDebt({ totalAmount: 0, remaining: 0 });
      expect(debtPayoff(debt, 1000)).toBe(0);
    });

    it("should return Infinity for zero payment", () => {
      const debt = createDebt();
      expect(debtPayoff(debt, 0)).toBe(Infinity);
    });

    it("should return 0 for zero remaining", () => {
      const debt = createDebt({ remaining: 0 });
      expect(debtPayoff(debt, 1000)).toBe(0);
    });

    it("should handle no interest rate", () => {
      const debt = createDebt({ interestRate: 0 });
      expect(debtPayoff(debt, 1000)).toBe(100); // 100,000 / 1,000
    });

    it("should handle high interest rate (109 months)", () => {
      const debt = createDebt({ interestRate: 20 });
      const months = debtPayoff(debt, 2000);
      expect(months).toBe(109);
    });

    it("should handle low interest rate (53 months)", () => {
      const debt = createDebt({ interestRate: 2 });
      const months = debtPayoff(debt, 2000);
      expect(months).toBe(53);
    });

    it("should handle very low interest rate (51 months)", () => {
      const debt = createDebt({ interestRate: 0.1 });
      const months = debtPayoff(debt, 2000);
      expect(months).toBe(51);
    });

    it("should return Infinity when payment does not beat monthly interest", () => {
      const debt = createDebt({
        totalAmount: 1000,
        interestRate: 24,
        minPayment: 20,
        remaining: 1000,
      });

      expect(monthlyInterestAmount(debt)).toBe(20);
      expect(isDebtPayoffFeasible(debt)).toBe(false);
      expect(debtPayoff(debt)).toBe(Infinity);
      expect(projectedDebtPayoffDate(debt)).toBeNull();
    });
  });

  describe("debt analytics helpers", () => {
    it("should generate a zero-interest schedule", () => {
      const startDate = new Date("2026-01-01T00:00:00.000Z");
      const debt = createDebt({
        name: "Family Loan",
        type: "personal",
        totalAmount: 1200,
        interestRate: 0,
        minPayment: 300,
        remaining: 1200,
      });

      const result = generateDebtPaymentSchedule(debt, 300, { startDate });

      expect(result.isPayoffFeasible).toBe(true);
      expect(result.truncated).toBe(false);
      expect(result.monthsToPayoff).toBe(4);
      expect(result.totalInterest).toBe(0);
      expect(result.schedule).toHaveLength(4);
      expect(result.schedule[0]).toMatchObject({
        month: 1,
        payment: 300,
        interest: 0,
        principal: 300,
        balance: 900,
      });
      expect(result.schedule[3]).toMatchObject({
        month: 4,
        payment: 300,
        interest: 0,
        principal: 300,
        balance: 0,
      });
      expect(result.payoffDate?.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    });

    it("should generate a standard amortization schedule", () => {
      const debt = createDebt({
        name: "Car Loan",
        type: "loan",
        totalAmount: 1000,
        interestRate: 12,
        minPayment: 100,
        remaining: 1000,
      });

      const result = generateDebtPaymentSchedule(debt, 100, {
        startDate: new Date("2026-01-01T00:00:00.000Z"),
      });

      expect(result.truncated).toBe(false);
      expect(result.monthsToPayoff).toBe(11);
      expect(result.totalInterest).toBe(58.98);
      expect(result.totalPaid).toBe(1058.98);
      expect(result.schedule[0]).toMatchObject({
        month: 1,
        payment: 100,
        interest: 10,
        principal: 90,
        balance: 910,
      });
      expect(result.schedule[10]).toMatchObject({
        month: 11,
        payment: 58.98,
        interest: 0.58,
        principal: 58.4,
        balance: 0,
      });
    });

    it("should return an impossible payoff result when payment is too low", () => {
      const debt = createDebt({
        name: "Store Card",
        totalAmount: 500,
        interestRate: 24,
        minPayment: 10,
        remaining: 500,
      });

      const result = generateDebtPaymentSchedule(debt, 10);

      expect(result.isPayoffFeasible).toBe(false);
      expect(result.monthsToPayoff).toBeNull();
      expect(result.payoffDate).toBeNull();
      expect(result.schedule).toEqual([]);
    });

    it("should honor schedule bounds and mark truncation", () => {
      const debt = createDebt({
        name: "Student Loan",
        type: "loan",
        totalAmount: 1000,
        interestRate: 12,
        minPayment: 100,
        remaining: 1000,
      });

      const result = generateDebtPaymentSchedule(debt, 100, { maxMonths: 3 });

      expect(result.schedule).toHaveLength(3);
      expect(result.truncated).toBe(true);
      expect(result.monthsToPayoff).toBeNull();
      expect(result.payoffDate).toBeNull();
      expect(result.schedule[2]?.balance).toBe(727.29);
    });

    it("should order debts by snowball priority and project payoff", () => {
      const startDate = new Date("2026-01-01T00:00:00.000Z");
      const debts: CalculationDebt[] = [
        createDebt({
          id: "car",
          name: "Car Loan",
          type: "loan",
          totalAmount: 1000,
          interestRate: 0,
          minPayment: 100,
          remaining: 1000,
        }),
        createDebt({
          id: "card",
          totalAmount: 300,
          interestRate: 0,
          minPayment: 50,
          remaining: 300,
        }),
      ];

      const result = calculateDebtSnowball(debts, 50, { startDate });

      expect(result.orderedDebtIds).toEqual(["card", "car"]);
      expect(result.truncated).toBe(false);
      expect(result.totalMonths).toBe(7);
      expect(result.totalInterest).toBe(0);
      expect(result.totalPaid).toBe(1300);
      expect(result.debts).toEqual([
        {
          debtId: "card",
          name: "Credit Card",
          order: 1,
          monthsToPayoff: 3,
          payoffDate: new Date("2026-04-01T00:00:00.000Z"),
          totalInterest: 0,
          totalPaid: 300,
        },
        {
          debtId: "car",
          name: "Car Loan",
          order: 2,
          monthsToPayoff: 7,
          payoffDate: new Date("2026-08-01T00:00:00.000Z"),
          totalInterest: 0,
          totalPaid: 1000,
        },
      ]);
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
