import { DebtType } from "@finance/types";
import { describe, expect, it } from "vitest";
import { debtRouter } from "../routers/debt.js";
import { createTRPCContext, createCallerFactory, router, type DbClient, type Session } from "../trpc.js";

const createDebtCaller = createCallerFactory(router({ debt: debtRouter }));

function createCaller(session: Session | null) {
  return createDebtCaller(
    createTRPCContext({
      session,
      db: {} as unknown as DbClient,
    }),
  );
}

function createDebtInput(overrides?: Partial<{
  id: string;
  name: string;
  type: DebtType;
  totalAmount: number;
  remaining: number;
  interestRate: number;
  minPayment: number;
  dueDate: Date;
}>) {
  return {
    id: "507f1f77bcf86cd799439011",
    name: "Car Loan",
    type: DebtType.AUTO_LOAN,
    totalAmount: 1000,
    remaining: 1000,
    interestRate: 12,
    minPayment: 100,
    ...overrides,
  };
}

describe("debt router analytics procedures", () => {
  it("requires an authenticated session", async () => {
    const caller = createCaller(null);

    await expect(
      caller.debt.calculateInterest({
        debt: createDebtInput(),
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("calculates monthly interest for a valid debt", async () => {
    const caller = createCaller({ user: { id: "user-1" } });

    const result = await caller.debt.calculateInterest({
      debt: createDebtInput(),
    });

    expect(result).toEqual({
      monthlyInterest: 10,
      isPayoffFeasible: true,
    });
  });

  it("projects a payoff date for a feasible debt", async () => {
    const caller = createCaller({ user: { id: "user-1" } });

    const result = await caller.debt.projectPayoffDate({
      debt: createDebtInput(),
      monthlyPayment: 100,
      startDate: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result.monthsToPayoff).toBe(11);
    expect(result.isPayoffFeasible).toBe(true);
    expect(result.payoffDate?.toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });

  it("returns null payoff details when payoff is infeasible", async () => {
    const caller = createCaller({ user: { id: "user-1" } });

    const result = await caller.debt.projectPayoffDate({
      debt: createDebtInput({
        name: "Store Card",
        type: DebtType.CREDIT_CARD,
        totalAmount: 500,
        remaining: 500,
        interestRate: 24,
        minPayment: 10,
      }),
      monthlyPayment: 10,
      startDate: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result).toEqual({
      monthsToPayoff: null,
      payoffDate: null,
      isPayoffFeasible: false,
    });
  });

  it("generates a standard payment schedule", async () => {
    const caller = createCaller({ user: { id: "user-1" } });

    const result = await caller.debt.generatePaymentSchedule({
      debt: createDebtInput(),
      monthlyPayment: 100,
      startDate: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result.truncated).toBe(false);
    expect(result.monthsToPayoff).toBe(11);
    expect(result.totalInterest).toBe(58.98);
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

  it("returns an empty schedule when payoff is impossible", async () => {
    const caller = createCaller({ user: { id: "user-1" } });

    const result = await caller.debt.generatePaymentSchedule({
      debt: createDebtInput({
        name: "Store Card",
        type: DebtType.CREDIT_CARD,
        totalAmount: 500,
        remaining: 500,
        interestRate: 24,
        minPayment: 10,
      }),
      monthlyPayment: 10,
    });

    expect(result).toEqual({
      schedule: [],
      truncated: false,
      isPayoffFeasible: false,
      monthsToPayoff: null,
      payoffDate: null,
      totalInterest: 0,
      totalPaid: 0,
    });
  });

  it("caps the generated schedule when maxMonths is reached", async () => {
    const caller = createCaller({ user: { id: "user-1" } });

    const result = await caller.debt.generatePaymentSchedule({
      debt: createDebtInput(),
      monthlyPayment: 100,
      maxMonths: 3,
    });

    expect(result.schedule).toHaveLength(3);
    expect(result.truncated).toBe(true);
    expect(result.monthsToPayoff).toBeNull();
    expect(result.payoffDate).toBeNull();
    expect(result.schedule[2]?.balance).toBe(727.29);
  });

  it("calculates a snowball payoff plan", async () => {
    const caller = createCaller({ user: { id: "user-1" } });

    const result = await caller.debt.calculateSnowball({
      debts: [
        createDebtInput({
          id: "507f1f77bcf86cd799439011",
          name: "Car Loan",
          type: DebtType.AUTO_LOAN,
          interestRate: 0,
          minPayment: 100,
        }),
        createDebtInput({
          id: "507f1f77bcf86cd799439012",
          name: "Credit Card",
          type: DebtType.CREDIT_CARD,
          totalAmount: 300,
          remaining: 300,
          interestRate: 0,
          minPayment: 50,
        }),
      ],
      extraPayment: 50,
      startDate: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result.orderedDebtIds).toEqual([
      "507f1f77bcf86cd799439012",
      "507f1f77bcf86cd799439011",
    ]);
    expect(result.totalMonths).toBe(7);
    expect(result.totalInterest).toBe(0);
    expect(result.truncated).toBe(false);
    expect(result.debts).toEqual([
      {
        debtId: "507f1f77bcf86cd799439012",
        name: "Credit Card",
        order: 1,
        monthsToPayoff: 3,
        payoffDate: new Date("2026-04-01T00:00:00.000Z"),
        totalInterest: 0,
        totalPaid: 300,
      },
      {
        debtId: "507f1f77bcf86cd799439011",
        name: "Car Loan",
        order: 2,
        monthsToPayoff: 7,
        payoffDate: new Date("2026-08-01T00:00:00.000Z"),
        totalInterest: 0,
        totalPaid: 1000,
      },
    ]);
  });

  it("marks snowball results as truncated when maxMonths is too low", async () => {
    const caller = createCaller({ user: { id: "user-1" } });

    const result = await caller.debt.calculateSnowball({
      debts: [
        createDebtInput({
          id: "507f1f77bcf86cd799439011",
          name: "Car Loan",
          type: DebtType.AUTO_LOAN,
          interestRate: 0,
          minPayment: 100,
        }),
        createDebtInput({
          id: "507f1f77bcf86cd799439012",
          name: "Credit Card",
          type: DebtType.CREDIT_CARD,
          totalAmount: 300,
          remaining: 300,
          interestRate: 0,
          minPayment: 50,
        }),
      ],
      extraPayment: 50,
      maxMonths: 2,
    });

    expect(result.truncated).toBe(true);
    expect(result.totalMonths).toBeNull();
    expect(result.debts).toMatchObject([
      {
        debtId: "507f1f77bcf86cd799439012",
        monthsToPayoff: null,
      },
      {
        debtId: "507f1f77bcf86cd799439011",
        monthsToPayoff: null,
      },
    ]);
  });
});
