/**
 * Pure financial calculation functions
 * All functions are side-effect-free and use only arithmetic operations
 */

// Local type definitions for types used in calculations
interface Stock {
  id: string;
  ticker: string;
  name: string;
  exchange: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  totalCost: number;
  currentValue: number;
  gain: number;
  gainPercent: number;
  lastUpdated: Date;
}

interface Debt {
  id: string;
  name: string;
  type: string;
  totalAmount: number;
  remaining: number;
  interestRate: number;
  minPayment: number;
  dueDate?: Date;
}

/**
 * Calculates the remaining budget amount
 *
 * @param budget - Total budget amount (must be >= 0)
 * @param spent - Amount already spent (must be >= 0)
 * @returns Remaining budget (budget - spent), capped at 0 (never negative)
 *
 * @example
 * ```typescript
 * budgetRemaining(1000, 300) // Returns 700
 * budgetRemaining(500, 500) // Returns 0
 * budgetRemaining(1000, 1200) // Returns 0 (capped at zero)
 * ```
 */
export function budgetRemaining(budget: number, spent: number): number {
  const remaining = budget - spent;
  return Math.max(0, remaining);
}

/**
 * Calculates the percentage of budget spent
 *
 * @param budget - Total budget amount (must be > 0)
 * @param spent - Amount already spent (must be >= 0)
 * @returns Percentage of budget spent (0-100), returns 0 if budget is 0 or NaN
 *
 * @example
 * ```typescript
 * budgetSpentPercentage(1000, 300) // Returns 30
 * budgetSpentPercentage(500, 500) // Returns 100
 * budgetSpentPercentage(1000, 0) // Returns 0
 * budgetSpentPercentage(0, 0) // Returns 0 (division by zero handled)
 * budgetSpentPercentage(1000, -100) // Returns 0 (negative spent handled)
 * ```
 */
export function budgetSpentPercentage(budget: number, spent: number): number {
  if (budget <= 0 || budget === Infinity || budget === -Infinity) {
    return 0;
  }

  const percentage = (spent / budget) * 100;
  return Math.max(0, Math.min(100, percentage));
}

/**
 * Calculates total portfolio gain/loss across all stock holdings
 *
 * @param stocks - Array of stock holdings (must have gain or gainPercent fields)
 * @param currency - Currency code for the portfolio (unused in calculation, kept for API consistency)
 * @returns Total gain (positive = profit, negative = loss)
 *
 * @example
 * ```typescript
 * const stocks = [
 *   { gain: 5000, gainPercent: 10 },
 *   { gain: -2000, gainPercent: -5 }
 * ];
 * portfolioGain(stocks, "IDR") // Returns 3000
 * ```
 */
export function portfolioGain(_stocks: Stock[], _currency: string): number {
  return _stocks.reduce((totalGain, stock) => totalGain + stock.gain, 0);
}

/**
 * Calculates months to payoff debt using amortization formula
 * This is a simplified calculation for minimum monthly payments
 *
 * @param debt - Debt object containing total amount, interest rate, and min payment
 * @param monthlyPayment - Monthly payment amount (if not provided, uses debt.minPayment)
 * @returns Number of months to payoff (ceiling), returns Infinity if payment is 0
 *
 * @example
 * ```typescript
 * const debt = {
 *   totalAmount: 100000,
 *   interestRate: 10, // 10% annual rate
 *   minPayment: 1000,
 *   remaining: 100000
 * };
 * debtPayoff(debt, 2000) // Returns 53 (months to payoff)
 * ```
 *
 * @remarks
 * Formula used:
 * r = monthly interest rate (annualRate / 12 / 100)
 * n = -log(1 - (r * P) / M) / log(1 + r)
 * where P = principal (debt.remaining), M = monthlyPayment
 *
 * For low interest rates (r < 0.01), simplified formula:
 * n ≈ P / M when interest is negligible
 */
export function debtPayoff(debt: Debt, monthlyPayment?: number): number {
  const principal = debt.remaining;
  const annualRate = debt.interestRate; // Percentage
  const payment = monthlyPayment ?? debt.minPayment;

  // Handle edge cases
  if (principal <= 0) return 0;
  if (payment <= 0) return Infinity;
  if (annualRate <= 0) {
    // No interest case: simple division
    return Math.ceil(principal / payment);
  }

  // Convert annual rate to monthly rate (percentage to decimal)
  const r = annualRate / 12 / 100;

  // Avoid division by zero in the log calculation
  if (payment * r >= principal) {
    // Payment covers all principal, no amortization needed
    return Math.ceil(principal / payment);
  }

  // Amortization formula
  const n = -Math.log(1 - (r * principal) / payment) / Math.log(1 + r);

  return Math.ceil(n);
}

/**
 * Calculates gain and percentage for an investment
 *
 * @param investment - Investment object with cost and currentValue
 * @returns Object containing gain amount and percentage gain
 *
 * @example
 * ```typescript
 * investmentGain({ cost: 10000, currentValue: 12500 })
 * // Returns { gain: 2500, percent: 25 }
 *
 * investmentGain({ cost: 5000, currentValue: 4000 })
 * // Returns { gain: -1000, percent: -20 }
 * ```
 *
 * @remarks
 * Returns { gain: 0, percent: 0 } if cost is 0 (prevents Infinity)
 */
export function investmentGain(investment: { cost: number; currentValue: number }): {
  gain: number;
  percent: number;
} {
  const { cost, currentValue } = investment;

  // Handle edge cases
  if (cost <= 0) {
    return { gain: 0, percent: 0 };
  }

  const gain = currentValue - cost;
  const percent = (gain / cost) * 100;

  return { gain, percent };
}
