export const INVESTMENT_TYPE_OPTIONS = [
  { value: "CRYPTO", label: "Crypto" },
  { value: "MUTUAL_FUND", label: "Mutual Fund" },
  { value: "GOLD", label: "Gold" },
  { value: "DEPOSIT", label: "Deposit" },
  { value: "P2P_LENDING", label: "P2P Lending" },
] as const;

export type SupportedInvestmentType = (typeof INVESTMENT_TYPE_OPTIONS)[number]["value"];

export interface InvestmentItem {
  id: string;
  name: string;
  type: string;
  amount: number;
  cost: number;
  currentValue: number;
  gain: number;
  roiPercent: number;
  notes?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export function formatTypeLabel(type: string): string {
  return INVESTMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label
    ?? type.replace(/_/g, " ");
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
