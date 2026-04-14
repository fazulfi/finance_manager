/**
 * Pure financial calculation functions
 * All functions are side-effect-free and use only arithmetic operations
 */

// Budget status result type
export interface BudgetStatusResult {
  status: "under" | "approaching" | "exceeded";
  percentage: number; // 0-100
}

// Date range result type
export interface BudgetDateRange {
  start: Date;
  end: Date;
}

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

export interface DebtPaymentScheduleRow {
  month: number;
  date: Date;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

export interface DebtPaymentScheduleResult {
  schedule: DebtPaymentScheduleRow[];
  truncated: boolean;
  isPayoffFeasible: boolean;
  monthsToPayoff: number | null;
  payoffDate: Date | null;
  totalInterest: number;
  totalPaid: number;
}

export interface DebtSnowballItem {
  debtId: string;
  name: string;
  order: number;
  monthsToPayoff: number | null;
  payoffDate: Date | null;
  totalInterest: number;
  totalPaid: number;
}

export interface DebtSnowballResult {
  debts: DebtSnowballItem[];
  orderedDebtIds: string[];
  totalMonths: number | null;
  totalInterest: number;
  totalPaid: number;
  truncated: boolean;
}

const DEFAULT_SCHEDULE_MONTH_LIMIT = 600;

function normalizeMaxMonths(maxMonths?: number): number {
  if (maxMonths === undefined || !Number.isFinite(maxMonths)) {
    return DEFAULT_SCHEDULE_MONTH_LIMIT;
  }

  return Math.min(Math.max(1, Math.floor(maxMonths)), DEFAULT_SCHEDULE_MONTH_LIMIT);
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function addMonths(baseDate: Date, months: number): Date {
  const date = new Date(baseDate);
  date.setMonth(date.getMonth() + months);
  return date;
}

function sortDebtsForSnowball<T extends Debt>(debts: T[]): T[] {
  return [...debts].sort(
    (a, b) =>
      a.remaining - b.remaining ||
      a.interestRate - b.interestRate ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id),
  );
}

export function monthlyInterestAmount(debt: Debt, balance = debt.remaining): number {
  if (balance <= 0 || debt.interestRate <= 0) {
    return 0;
  }

  return roundCurrency(balance * (debt.interestRate / 12 / 100));
}

export function isDebtPayoffFeasible(debt: Debt, monthlyPayment = debt.minPayment): boolean {
  if (debt.remaining <= 0) {
    return true;
  }

  if (monthlyPayment <= 0) {
    return false;
  }

  if (debt.interestRate <= 0) {
    return true;
  }

  return monthlyPayment > monthlyInterestAmount(debt);
}

export function projectedDebtPayoffDate(
  debt: Debt,
  monthlyPayment?: number,
  startDate = new Date(),
): Date | null {
  const months = debtPayoff(debt, monthlyPayment);

  if (!Number.isFinite(months)) {
    return null;
  }

  return addMonths(startDate, months);
}

export function generateDebtPaymentSchedule(
  debt: Debt,
  monthlyPayment = debt.minPayment,
  options?: {
    startDate?: Date;
    maxMonths?: number;
  },
): DebtPaymentScheduleResult {
  const startDate = options?.startDate ?? new Date();
  const maxMonths = normalizeMaxMonths(options?.maxMonths);

  if (debt.remaining <= 0) {
    return {
      schedule: [],
      truncated: false,
      isPayoffFeasible: true,
      monthsToPayoff: 0,
      payoffDate: startDate,
      totalInterest: 0,
      totalPaid: 0,
    };
  }

  if (!isDebtPayoffFeasible(debt, monthlyPayment)) {
    return {
      schedule: [],
      truncated: false,
      isPayoffFeasible: false,
      monthsToPayoff: null,
      payoffDate: null,
      totalInterest: 0,
      totalPaid: 0,
    };
  }

  const schedule: DebtPaymentScheduleRow[] = [];
  let balance = roundCurrency(debt.remaining);
  let totalInterest = 0;
  let totalPaid = 0;

  for (let month = 1; month <= maxMonths && balance > 0; month += 1) {
    const interest = monthlyInterestAmount(debt, balance);
    const payment = roundCurrency(Math.min(monthlyPayment, balance + interest));
    const principal = roundCurrency(payment - interest);
    balance = roundCurrency(Math.max(0, balance - principal));
    totalInterest = roundCurrency(totalInterest + interest);
    totalPaid = roundCurrency(totalPaid + payment);

    schedule.push({
      month,
      date: addMonths(startDate, month),
      payment,
      interest,
      principal,
      balance,
    });
  }

  const truncated = balance > 0;
  const monthsToPayoff = truncated ? null : schedule.length;

  return {
    schedule,
    truncated,
    isPayoffFeasible: true,
    monthsToPayoff,
    payoffDate: monthsToPayoff === null ? null : addMonths(startDate, monthsToPayoff),
    totalInterest,
    totalPaid,
  };
}

export function calculateDebtSnowball(
  debts: Debt[],
  extraPayment = 0,
  options?: {
    startDate?: Date;
    maxMonths?: number;
  },
): DebtSnowballResult {
  const startDate = options?.startDate ?? new Date();
  const maxMonths = normalizeMaxMonths(options?.maxMonths);
  const orderedDebts = sortDebtsForSnowball(debts.filter((debt) => debt.remaining > 0));

  if (orderedDebts.length === 0) {
    return {
      debts: [],
      orderedDebtIds: [],
      totalMonths: 0,
      totalInterest: 0,
      totalPaid: 0,
      truncated: false,
    };
  }

  const state = orderedDebts.map((debt, index) => ({
    ...debt,
    order: index + 1,
    balance: roundCurrency(debt.remaining),
    totalInterest: 0,
    totalPaid: 0,
    monthsToPayoff: null as number | null,
    payoffDate: null as Date | null,
  }));
  const totalMonthlyBudget = roundCurrency(
    state.reduce((sum, debt) => sum + debt.minPayment, 0) + Math.max(0, extraPayment),
  );

  for (let month = 1; month <= maxMonths; month += 1) {
    const activeDebts = state.filter((debt) => debt.balance > 0);

    if (activeDebts.length === 0) {
      break;
    }

    const monthState = sortDebtsForSnowball(activeDebts);
    const balanceWithInterest = new Map<string, number>();
    let paymentPool = totalMonthlyBudget;

    for (const debt of monthState) {
      const interest = monthlyInterestAmount(debt, debt.balance);
      const accruedBalance = roundCurrency(debt.balance + interest);

      debt.totalInterest = roundCurrency(debt.totalInterest + interest);
      balanceWithInterest.set(debt.id, accruedBalance);
    }

    for (const debt of monthState) {
      const accruedBalance = balanceWithInterest.get(debt.id) ?? 0;
      const minimumPayment = roundCurrency(Math.min(debt.minPayment, accruedBalance));

      debt.totalPaid = roundCurrency(debt.totalPaid + minimumPayment);
      balanceWithInterest.set(debt.id, roundCurrency(accruedBalance - minimumPayment));
      paymentPool = roundCurrency(paymentPool - minimumPayment);
    }

    for (const debt of monthState) {
      if (paymentPool <= 0) {
        break;
      }

      const remainingBalance = balanceWithInterest.get(debt.id) ?? 0;
      if (remainingBalance <= 0) {
        continue;
      }

      const extra = roundCurrency(Math.min(paymentPool, remainingBalance));
      debt.totalPaid = roundCurrency(debt.totalPaid + extra);
      balanceWithInterest.set(debt.id, roundCurrency(remainingBalance - extra));
      paymentPool = roundCurrency(paymentPool - extra);
    }

    for (const debt of monthState) {
      debt.balance = balanceWithInterest.get(debt.id) ?? 0;

      if (debt.balance === 0 && debt.monthsToPayoff === null) {
        debt.monthsToPayoff = month;
        debt.payoffDate = addMonths(startDate, month);
      }
    }
  }

  const truncated = state.some((debt) => debt.balance > 0);

  return {
    debts: state.map((debt) => ({
      debtId: debt.id,
      name: debt.name,
      order: debt.order,
      monthsToPayoff: debt.monthsToPayoff,
      payoffDate: debt.payoffDate,
      totalInterest: roundCurrency(debt.totalInterest),
      totalPaid: roundCurrency(debt.totalPaid),
    })),
    orderedDebtIds: state.map((debt) => debt.id),
    totalMonths: truncated ? null : Math.max(...state.map((debt) => debt.monthsToPayoff ?? 0)),
    totalInterest: roundCurrency(state.reduce((sum, debt) => sum + debt.totalInterest, 0)),
    totalPaid: roundCurrency(state.reduce((sum, debt) => sum + debt.totalPaid, 0)),
    truncated,
  };
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

  if (!isDebtPayoffFeasible(debt, payment)) {
    return Infinity;
  }

  // Convert annual rate to monthly rate (percentage to decimal)
  const r = annualRate / 12 / 100;

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

/**
 * Calculates the overall budget status based on spent amount and budget
 *
 * @param spent - Amount already spent (must be >= 0)
 * @param budget - Total budget amount (must be >= 0)
 * @returns Object containing budget status and percentage spent (0-100)
 *
 * @remarks
 * Status thresholds:
 * - "under": 0% to 79% spent (budget is safe)
 * - "approaching": 80% to 99% spent (budget is nearly used)
 * - "exceeded": 100%+ spent (budget is exceeded)
 *
 * Percentage is capped at 100% for "exceeded" status
 *
 * @example
 * ```typescript
 * calculateBudgetStatus(300, 1000)
 * // Returns { status: 'under', percentage: 30 }
 *
 * calculateBudgetStatus(800, 1000)
 * // Returns { status: 'approaching', percentage: 80 }
 *
 * calculateBudgetStatus(1500, 1000)
 * // Returns { status: 'exceeded', percentage: 100 } (capped at 100)
 *
 * calculateBudgetStatus(0, 1000)
 * // Returns { status: 'under', percentage: 0 }
 *
 * calculateBudgetStatus(1200, 0)
 * // Returns { status: 'exceeded', percentage: 100 } (budget is 0)
 * ```
 */
export function calculateBudgetStatus(spent: number, budget: number): BudgetStatusResult {
  // Handle edge cases
  if (budget <= 0) {
    // If budget is 0 or negative, spending exceeds it (or spent is negative)
    return {
      status: "exceeded",
      percentage: Math.min(100, (spent / Math.abs(budget)) * 100),
    };
  }

  if (spent < 0) {
    // Negative spending doesn't make sense for budget status
    return {
      status: "under",
      percentage: 0,
    };
  }

  // Calculate percentage spent (capped at 100)
  const percentage = Math.min(100, (spent / budget) * 100);

  // Determine status based on percentage thresholds
  if (percentage >= 100) {
    return {
      status: "exceeded",
      percentage: 100, // Cap at 100% for consistency
    };
  } else if (percentage >= 80) {
    return {
      status: "approaching",
      percentage: percentage,
    };
  } else {
    return {
      status: "under",
      percentage: percentage,
    };
  }
}

/**
 * Calculates the date range for a budget period
 *
 * @param startDate - Starting date of the period (defaults to first day of current month if not provided)
 * @param period - Budget period type ("week" | "month" | "quarter" | "year" | "custom")
 * @returns Object containing start and end dates for the period
 *
 * @remarks
 * Returns the full date range for the specified period.
 * For "custom" period, startDate is required (end is optional — defaults to startDate if not provided).
 * All dates are returned as JavaScript Date objects in UTC.
 *
 * @example
 * ```typescript
 * getBudgetDateRange(undefined, 'month')
 * // Returns { start: <first day of current month>, end: <last day of current month> }
 *
 * getBudgetDateRange(new Date('2024-01-15'), 'week')
 * // Returns start date of that week, end date of that week
 *
 * getBudgetDateRange(new Date('2024-01-01'), 'quarter')
 * // Returns { start: 2024-01-01, end: 2024-03-31 }
 *
 * getBudgetDateRange(new Date('2024-01-01'), 'custom')
 * // Returns { start: 2024-01-01, end: 2024-01-01 } (both to start date if no end provided)
 * ```
 */
export function getBudgetDateRange(startDate?: Date, period: string = "month"): BudgetDateRange {
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (period) {
    case "week": {
      // Get start of week (Monday)
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const currentDay = now.getDate();
      const dayOfWeek = now.getDay();
      const diff = currentDay - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday

      const weekStart = new Date(currentYear, currentMonth, diff, 0, 0, 0, 0);
      const weekEnd = new Date(currentYear, currentMonth, diff + 6, 23, 59, 59, 999);
      return { start: weekStart, end: weekEnd };
    }

    case "month": {
      // Use provided startDate or current month
      start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    case "quarter": {
      // Use provided startDate or start of current quarter
      start = startDate || new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const month = start.getMonth();
      end = new Date(start.getFullYear(), month + 3, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    case "year": {
      // Use provided startDate or current year
      start = startDate || new Date(now.getFullYear(), 0, 1);
      end = new Date(start.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    case "custom": {
      // Custom period — use startDate as both start and end if not provided
      start = startDate || new Date();
      end = startDate || new Date();
      return { start, end };
    }

    default: {
      // Default to month if invalid period
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
  }
}

/**
 * Calculates the remaining budget amount (without capping)
 *
 * @param budget - Total budget amount (must be >= 0)
 * @param spent - Amount already spent (must be >= 0)
 * @returns Remaining budget (budget - spent), can be negative if spent exceeds budget
 *
 * @remarks
 * Unlike budgetRemaining(), this function does NOT cap at zero.
 * Returns negative values when spent exceeds budget (over-budget scenario).
 * Use this for calculations that need to know exact remaining amount, including over-budget scenarios.
 *
 * @example
 * ```typescript
 * calculateRemaining(1000, 300) // Returns 700
 * calculateRemaining(500, 500) // Returns 0
 * calculateRemaining(1000, 1200) // Returns -200 (over budget by 200)
 * calculateRemaining(1000, 0) // Returns 1000
 * calculateRemaining(0, 0) // Returns 0
 * ```
 */
export function calculateRemaining(budget: number, spent: number): number {
  return budget - spent;
}
