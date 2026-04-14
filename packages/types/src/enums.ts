// Prisma enums mapped to TypeScript enums (exact casing preserved)

export enum AccountType {
  CHECKING,
  SAVINGS,
  CREDIT,
  INVESTMENT,
  CASH,
  OTHER,
}

export enum TransactionType {
  INCOME,
  EXPENSE,
  TRANSFER,
}

export enum CategoryType {
  INCOME,
  EXPENSE,
}

export enum ProjectStatus {
  ACTIVE,
  COMPLETED,
  PAUSED,
  CANCELLED,
}

export enum BudgetType {
  MONTHLY,
  ANNUAL,
  CUSTOM,
}

export enum BudgetPeriod {
  WEEKLY,
  MONTHLY,
  QUARTERLY,
  YEARLY,
}

export enum Exchange {
  NYSE,
  NASDAQ,
  LSE,
  OTHER,
}

export enum InvestmentType {
  STOCK,
  BOND,
  CRYPTO,
  REAL_ESTATE,
  MUTUAL_FUND,
  OTHER,
}

export enum GoalStatus {
  ACTIVE,
  COMPLETED,
  PAUSED,
}

export enum DebtType {
  CREDIT_CARD,
  MORTGAGE,
  STUDENT_LOAN,
  AUTO_LOAN,
  PERSONAL_LOAN,
  OTHER,
}

export enum CurrencyCode {
  IDR = "IDR",
  USD = "USD",
  EUR = "EUR",
  SGD = "SGD",
  JPY = "JPY",
}
