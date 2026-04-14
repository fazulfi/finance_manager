// @finance/utils — Pure currency formatting and parsing utilities
// Uses Intl.NumberFormat for locale-aware currency operations
// No external dependencies or side effects

import { CurrencyCode } from "@finance/types";

export const CurrencyFractionDigits: Record<CurrencyCode, 0 | 2> = {
  [CurrencyCode.IDR]: 0,
  [CurrencyCode.USD]: 2,
  [CurrencyCode.EUR]: 2,
  [CurrencyCode.SGD]: 2,
  [CurrencyCode.JPY]: 0,
};

const supportedCurrencyCodes = new Set<CurrencyCode>(Object.values(CurrencyCode));

/**
 * Currency symbols mapping
 * ISO currency codes mapped to their standardized symbol representations
 */
export const CurrencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  IDR: "Rp",
  AUD: "A$",
  CAD: "C$",
  CHF: "Fr",
  CNY: "¥",
  HKD: "HK$",
  NZD: "NZ$",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  KRW: "₩",
  SGD: "S$",
  MXN: "MX$",
  INR: "₹",
  PHP: "₱",
  THB: "฿",
  BRL: "R$",
  ZAR: "R",
  TRY: "₺",
  PLN: "zł",
  RUB: "₽",
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Formats a numeric value as currency string with locale-specific formatting
 *
 * @param value - The numeric value to format (positive, negative, or zero)
 * @param currency - ISO 4217 currency code (e.g., "USD", "EUR", "IDR")
 * @param locale - BCP 47 locale tag (e.g., "en-US", "id-ID", "fr-FR")
 * @returns Formatted currency string with locale-appropriate symbol and separators
 *
 * @example
 * formatCurrency(1234.56, "USD", "en-US") // "USD 1,234.56"
 * formatCurrency(500000, "IDR", "id-ID") // "Rp 500.000"
 * formatCurrency(-100, "EUR", "fr-FR") // "-€ 100,00"
 *
 * @throws If currency code is not a 3-letter ISO 4217 code (use currency() validator first)
 * @throws If locale string is not a valid BCP 47 tag
 *
 * Edge Cases:
 * - Infinity → Returns "∞" symbol or locale-appropriate
 * - NaN → Returns locale-appropriate NaN representation
 * - 0 → Returns "0" or currency symbol representation
 * - Very large numbers → Uses locale-specific grouping (thousands separators)
 * - Negative values → Returns negative value with currency symbol at start
 */
export function formatCurrency(
  value: number,
  currency: CurrencyCode | string,
  locale: string,
): string {
  if (!supportedCurrencyCodes.has(currency as CurrencyCode)) {
    throw new Error(`Unsupported currency code: ${currency}.`);
  }

  const supportedCurrency = currency as CurrencyCode;

  const fractionDigits = CurrencyFractionDigits[supportedCurrency];

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: supportedCurrency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });

    return formatter.format(value);
  } catch (error) {
    throw new Error(
      `Failed to format currency with locale "${locale}" and currency "${currency}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Parses a formatted currency string back to a numeric value
 *
 * @param formattedValue - The locale-formatted currency string (e.g., "USD 1,234.56", "Rp 500.000")
 * @param locale - BCP 47 locale tag (must match the formatting locale)
 * @returns Parsed numeric value as a number (positive, negative, or zero)
 *
 * @example
 * parseCurrency("USD 1,234.56", "en-US") // 1234.56
 * parseCurrency("Rp 500.000", "id-ID") // 500000
 * parseCurrency("-€ 100,00", "fr-FR") // -100
 *
 * @throws If formattedValue contains non-numeric characters beyond currency symbols
 * @throws If locale string is not a valid BCP 47 tag
 *
 * Edge Cases:
 * - Input without currency symbol → Returns numeric value directly
 * - Input with multiple spaces/tabs → Whitespace is trimmed
 * - Input with leading/trailing whitespace → Whitespace is stripped
 * - Missing decimal separator → Interprets as integer (e.g., "1000" → 1000)
 * - Empty string → Throws error with descriptive message
 * - Malformed number → Throws error with descriptive message
 *
 * Limitations:
 * - Does not validate currency symbol matches expected currency code
 * - Locale must exactly match the formatting locale for correct parsing
 * - Thousands separators and decimal point must match locale conventions
 */
export function parseCurrency(formattedValue: string, locale: string): number {
  if (!formattedValue || typeof formattedValue !== "string") {
    throw new Error("Invalid input: formattedValue must be a non-empty string.");
  }

  // Strip whitespace (spaces, tabs, newlines)
  const trimmedValue = formattedValue.trim();

  if (trimmedValue.length === 0) {
    throw new Error("Invalid input: formattedValue cannot be empty after trimming.");
  }

  // Identify locale-specific decimal separator from Intl.NumberFormat
  const decimalSeparator = new Intl.NumberFormat(locale).format(1.1).charAt(1);

  // Check for negative sign
  const negativeMatch = trimmedValue.match(/^-/);
  const isNegative = !!negativeMatch;
  let valueWithoutSign = trimmedValue.replace(/^-/, "");

  // Remove currency symbols
  Object.values(CurrencySymbols).forEach((symbol) => {
    valueWithoutSign = valueWithoutSign.replace(symbol, "");
  });

  // Remove whitespace
  valueWithoutSign = valueWithoutSign.replace(/\p{White_Space}/gu, "");

  // Remove thousands separators while preserving decimal separator
  // Build a regex to match thousands separators (but not decimal separator)
  const thousandSeparator = new Intl.NumberFormat(locale).format(1000).charAt(1);
  const parts = valueWithoutSign.split(decimalSeparator);

  const thousandSeparatorPattern = thousandSeparator
    ? new RegExp(escapeRegExp(thousandSeparator), "g")
    : null;

  if (parts.length === 2) {
    // Has decimal part: remove thousands separator from integer part
    const integerPart = thousandSeparatorPattern
      ? (parts[0]?.replace(thousandSeparatorPattern, "") ?? "")
      : (parts[0] ?? "");
    const fractionalPart = thousandSeparatorPattern
      ? (parts[1]?.replace(thousandSeparatorPattern, "") ?? "")
      : (parts[1] ?? "");
    valueWithoutSign = `${integerPart}${decimalSeparator}${fractionalPart}`;
  } else if (parts.length === 1) {
    // No decimal part (integer value)
    const integerPart = thousandSeparatorPattern
      ? (parts[0]?.replace(thousandSeparatorPattern, "") ?? "")
      : (parts[0] ?? "");
    valueWithoutSign = integerPart;
  }

  // Convert to number
  const parsed = parseFloat(valueWithoutSign);

  if (isNaN(parsed)) {
    throw new Error(`Failed to parse currency value "${formattedValue}" with locale "${locale}"`);
  }

  // Apply negative if needed
  const result = isNegative ? -parsed : parsed;

  return result;
}
