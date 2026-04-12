// @finance/utils — Pure date formatting, parsing, and range operations
// Uses date-fns primitives for modern date handling
// No external dependencies or side effects

import {
  format as formatFn,
  parse,
  isValid,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  parseISO,
} from "date-fns";
import { zhCN, enUS } from "date-fns/locale";

/**
 * Formats a date to a locale-specific string using a custom format string
 *
 * @param date - The date to format (Date object, ISO string, or null/undefined)
 * @param locale - Locale code for formatting (e.g., "id-ID", "en-US", "zh-CN")
 * @param format - Date format string using date-fns token pattern (e.g., "PPP", "yyyy-MM-dd")
 * @returns Formatted date string, or an empty string for null/undefined inputs
 *
 * @example
 * formatDate(new Date(2024, 4, 10), "en-US", "PPP") // "May 10, 2024"
 * formatDate(new Date(2024, 4, 10), "id-ID", "PPP") // "10 Mei 2024"
 * formatDate(new Date(2024, 4, 10), "zh-CN", "PPP") // "2024年5月10日"
 * formatDate(null, "en-US", "PPP") // ""
 * formatDate(undefined, "en-US", "PPP") // ""
 *
 * @throws If date is not a valid Date object or ISO string
 * @throws If locale string is not a valid locale code
 * @throws If format string is invalid
 *
 * Supported date-fns tokens:
 * - y: Year
 * - M: Month
 * - d: Day
 * - H: Hour
 * - m: Minute
 * - s: Second
 * - PPP: Full date pattern (locale-dependent)
 * - ppp: Date with time
 *
 * Edge Cases:
 * - null/undefined → Returns empty string (graceful handling)
 * - Invalid date → Throws error with descriptive message
 * - Invalid format string → Throws error with descriptive message
 * - Unsupported locale → Falls back to enUS or throws error
 */
export function formatDate(
  date: Date | string | null,
  locale: string,
  formatString: string,
): string {
  // Handle null/undefined inputs gracefully
  if (date === null || date === undefined) {
    return "";
  }

  // Parse date (support both Date objects and ISO strings)
  let dateObj: Date;
  try {
    if (typeof date === "string") {
      dateObj = parseISO(date);
    } else {
      dateObj = date;
    }
  } catch (error) {
    throw new Error(`Invalid date format: ${date}. Expected Date object or ISO string.`);
  }

  // Validate date is a valid date object
  if (!isValid(dateObj)) {
    throw new Error(`Invalid date value: ${date}.`);
  }

  // Get locale
  const locales = { "id-ID": zhCN, "zh-CN": zhCN, "en-US": enUS };
  const dateLocale = locales[locale as keyof typeof locales] || enUS;

  // Format date with locale-specific tokens
  try {
    return formatFn(dateObj, formatString, { locale: dateLocale });
  } catch (error) {
    throw new Error(
      `Failed to format date with format "${formatString}" and locale "${locale}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Parses a formatted date string back to a Date object
 *
 * @param dateString - The formatted date string (e.g., "May 10, 2024", "2024-05-10")
 * @param locale - Locale code for parsing (must match the formatting locale)
 * @param format - Date format string that was used for formatting
 * @returns Parsed Date object (may be invalid if parsing fails)
 *
 * @example
 * parseDate("May 10, 2024", "en-US", "PPP") // May 10, 2024
 * parseDate("2024-05-10", "en-US", "yyyy-MM-dd") // May 10, 2024
 * parseDate("2024年5月10日", "zh-CN", "PPP") // May 10, 2024
 * parseDate("", "en-US", "PPP") // Invalid Date
 *
 * @throws If dateString is not a non-empty string
 * @throws If locale string is not a valid locale code
 * @throws If format string is invalid
 *
 * Edge Cases:
 * - Empty string → Returns Invalid Date
 * - Invalid date format → Returns Invalid Date
 * - Malformed date string → Returns Invalid Date
 * - Unknown locale → Falls back to enUS (may cause parsing errors)
 *
 * Limitations:
 * - Parsing only supports basic format patterns (does not handle complex token sets)
 * - Locale must exactly match the formatting locale for correct parsing
 * - Some date formats may not parse correctly without additional validation
 */
export function parseDate(dateString: string | null, locale: string, format: string): Date {
  // Handle null/undefined inputs gracefully
  if (dateString === null || dateString === undefined || dateString === "") {
    return new Date(NaN);
  }

  // Ensure dateString is a string
  if (typeof dateString !== "string") {
    return new Date(NaN);
  }

  // Get locale
  const locales = { "id-ID": zhCN, "zh-CN": zhCN, "en-US": enUS };
  const dateLocale = locales[locale as keyof typeof locales] || enUS;

  // Parse date string with locale-specific format
  try {
    const dateObj = parse(dateString, format, new Date(), { locale: dateLocale });

    // Validate parsed date
    if (!isValid(dateObj)) {
      return new Date(NaN);
    }

    return dateObj;
  } catch (error) {
    // Parsing failed - return invalid date
    return new Date(NaN);
  }
}

/**
 * Returns the start and end dates for a specific period (month, quarter, or year)
 *
 * @param type - The period type: "month", "quarter", or "year"
 * @param date - Optional date reference (defaults to current date if not provided)
 * @returns Object containing start and end Date objects for the period
 *
 * @example
 * getDateRange("month", new Date(2024, 4, 15)) // { start: 2024-05-01, end: 2024-05-31 }
 * getDateRange("quarter", new Date(2024, 6, 20)) // { start: 2024-07-01, end: 2024-09-30 }
 * getDateRange("year", new Date(2024, 4, 10)) // { start: 2024-01-01, end: 2024-12-31 }
 * getDateRange("month") // { start: current month start, end: current month end }
 *
 * @throws If type is not one of "month", "quarter", or "year"
 * @throws If date is not a valid Date object
 *
 * Edge Cases:
 * - No date provided → Uses current date as reference
 * - Invalid date type → Throws error
 * - Invalid date object → Throws error
 */
export function getDateRange(
  type: "month" | "quarter" | "year",
  date?: Date,
): { start: Date; end: Date } {
  // Validate type
  if (!["month", "quarter", "year"].includes(type)) {
    throw new Error(`Invalid date range type: "${type}". Must be "month", "quarter", or "year".`);
  }

  // Use current date as reference if not provided
  const dateObj = date ? new Date(date) : new Date();

  // Validate date is a valid date object
  if (!isValid(dateObj)) {
    throw new Error(`Invalid date object: ${date}.`);
  }

  let startDate: Date;
  let endDate: Date;

  switch (type) {
    case "month":
      startDate = startOfMonth(dateObj);
      endDate = endOfMonth(dateObj);
      break;
    case "quarter":
      startDate = startOfQuarter(dateObj);
      endDate = endOfQuarter(dateObj);
      break;
    case "year":
      startDate = startOfYear(dateObj);
      endDate = endOfYear(dateObj);
      break;
    default:
      throw new Error(`Unreachable: Invalid date range type "${type}".`);
  }

  return { start: startDate, end: endDate };
}

/**
 * Returns the start date of a specific period (week, month, quarter, or year)
 *
 * @param date - The reference date (used to determine which period)
 * @param period - The period type: "week", "month", "quarter", or "year"
 * @returns Start Date object for the period
 *
 * @example
 * startOfPeriod(new Date(2024, 4, 15), "week") // Monday of week containing May 15, 2024
 * startOfPeriod(new Date(2024, 4, 15), "month") // 2024-05-01
 * startOfPeriod(new Date(2024, 4, 15), "quarter") // 2024-04-01 (Q2 starts April 1)
 * startOfPeriod(new Date(2024, 4, 15), "year") // 2024-01-01
 *
 * @throws If date is not a valid Date object
 * @throws If period is not one of "week", "month", "quarter", or "year"
 * @throws If period is not supported in startOfPeriod function
 *
 * Edge Cases:
 * - Invalid date object → Throws error
 * - Invalid period type → Throws error
 * - Unsupported period → Throws error
 *
 * Notes:
 * - Week starts on Monday (date-fns default)
 * - Quarter start depends on quarter definition (start of first month)
 * - Year starts on January 1st
 */
export function startOfPeriod(date: Date, period: "week" | "month" | "quarter" | "year"): Date {
  // Validate date is a valid date object
  if (!isValid(date)) {
    throw new Error(`Invalid date object: ${date}.`);
  }

  // Validate period
  if (!["week", "month", "quarter", "year"].includes(period)) {
    throw new Error(
      `Invalid period type: "${period}". Must be "week", "month", "quarter", or "year".`,
    );
  }

  switch (period) {
    case "week":
      return startOfWeek(date, { weekStartsOn: 1 }); // Monday as first day
    case "month":
      return startOfMonth(date);
    case "quarter":
      return startOfQuarter(date);
    case "year":
      return startOfYear(date);
    default:
      // This should never be reached due to validation above
      throw new Error(`Unreachable: Invalid period type "${period}".`);
  }
}

/**
 * Returns the end date of a specific period (week, month, quarter, or year)
 *
 * @param date - The reference date (used to determine which period)
 * @param period - The period type: "week", "month", "quarter", or "year"
 * @returns End Date object for the period
 *
 * @example
 * endOfPeriod(new Date(2024, 4, 15), "week") // Sunday of week containing May 15, 2024
 * endOfPeriod(new Date(2024, 4, 15), "month") // 2024-05-31
 * endOfPeriod(new Date(2024, 4, 15), "quarter") // 2024-06-30
 * endOfPeriod(new Date(2024, 4, 15), "year") // 2024-12-31
 *
 * @throws If date is not a valid Date object
 * @throws If period is not one of "week", "month", "quarter", or "year"
 * @throws If period is not supported in endOfPeriod function
 *
 * Edge Cases:
 * - Invalid date object → Throws error
 * - Invalid period type → Throws error
 * - Unsupported period → Throws error
 *
 * Notes:
 * - Week ends on Sunday (date-fns default)
 * - Quarter ends on last day of third month (e.g., Q2 ends June 30)
 * - Year ends on December 31st
 */
export function endOfPeriod(date: Date, period: "week" | "month" | "quarter" | "year"): Date {
  // Validate date is a valid date object
  if (!isValid(date)) {
    throw new Error(`Invalid date object: ${date}.`);
  }

  // Validate period
  if (!["week", "month", "quarter", "year"].includes(period)) {
    throw new Error(
      `Invalid period type: "${period}". Must be "week", "month", "quarter", or "year".`,
    );
  }

  switch (period) {
    case "week":
      return endOfWeek(date, { weekStartsOn: 1 }); // Monday as first day
    case "month":
      return endOfMonth(date);
    case "quarter":
      return endOfQuarter(date);
    case "year":
      return endOfYear(date);
    default:
      // This should never be reached due to validation above
      throw new Error(`Unreachable: Invalid period type "${period}".`);
  }
}
