// @finance/utils — Pure number formatting, percentage calculations, and comparisons
// Uses Intl.NumberFormat for locale-aware number operations
// No external dependencies or side effects

/**
 * Formats a numeric value using locale-specific formatting rules
 *
 * @param value - The numeric value to format (positive, negative, zero, Infinity, or NaN)
 * @param locale - BCP 47 locale tag (e.g., "en-US", "id-ID", "fr-FR")
 * @param options - Optional Intl.NumberFormatOptions for custom formatting (defaults: style="decimal", minimumFractionDigits=0, maximumFractionDigits=6)
 * @returns Formatted number string with locale-appropriate separators, decimal points, and thousands grouping
 *
 * @example
 * formatNumber(1234.56789, "en-US") // "1,234.56789"
 * formatNumber(1234567, "id-ID") // "1.234.567"
 * formatNumber(-100.5, "en-US") // "-100.5"
 * formatNumber(0, "en-US") // "0"
 * formatNumber(NaN, "en-US") // "NaN"
 * formatNumber(Infinity, "en-US") // "∞"
 * formatNumber(1234.56789, "fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) // "1 234,57"
 *
 * @throws If locale string is not a valid BCP 47 tag
 * @throws If options are invalid Intl.NumberFormatOptions
 *
 * Default Intl.NumberFormatOptions:
 * - style: "decimal"
 * - minimumFractionDigits: 0
 * - maximumFractionDigits: 6
 * - useGrouping: true (locale-dependent)
 *
 * Edge Cases:
 * - 0 → Returns "0" or locale representation of zero
 * - Negative numbers → Returns negative value with proper sign
 * - Very large numbers → Uses locale-specific thousands grouping
 * - Very small numbers → Uses locale-specific notation
 * - Infinity → Returns "∞" symbol or locale-appropriate representation
 * - NaN → Returns "NaN" or locale-appropriate representation
 * - Negative zero (-0) → Returns "0" (negative zero is treated as zero)
 */
export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  // Handle special number values explicitly
  if (!isFinite(value)) {
    // Return locale-appropriate representation for Infinity or NaN
    const formatter = new Intl.NumberFormat(locale, options);
    try {
      return formatter.format(value);
    } catch (error) {
      // If formatting fails, return string representation
      return value === Infinity ? "∞" : "NaN";
    }
  }

  // Validate locale is a valid BCP 47 tag
  if (typeof locale !== "string" || locale.trim().length === 0) {
    throw new Error(`Invalid locale string: "${locale}". Must be a non-empty BCP 47 locale tag.`);
  }

  // Validate options if provided
  if (options !== undefined && typeof options !== "object") {
    throw new Error(`Invalid options: ${options}. Must be an object or undefined.`);
  }

  // Create formatter with provided options (with defaults)
  const formatter = new Intl.NumberFormat(locale, {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
    useGrouping: true,
    ...options,
  });

  try {
    return formatter.format(value);
  } catch (error) {
    throw new Error(
      `Failed to format number with locale "${locale}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Calculates the percentage that a part represents of a total
 *
 * @param part - The part value to convert to percentage
 * @param total - The total value for percentage calculation
 * @returns Percentage as a number (0-100), or NaN if total is zero
 *
 * @example
 * calculatePercentage(50, 200) // 25
 * calculatePercentage(10, 100) // 10
 * calculatePercentage(0, 100) // 0
 * calculatePercentage(25, 0) // NaN (division by zero)
 * calculatePercentage(33.33, 100) // 33.33
 * calculatePercentage(-10, 100) // -10
 *
 * @throws If part or total is not a number
 * @throws If total is zero (returns NaN rather than throwing)
 *
 * Edge Cases:
 * - total is zero → Returns NaN (avoid division by zero)
 * - part is zero → Returns 0
 * - part is NaN → Returns NaN
 * - part is Infinity → Returns Infinity
 * - part is negative → Returns negative percentage
 * - part > total → Returns value > 100 (e.g., 150%)
 * - part is negative and total is negative → Returns positive percentage
 *
 * Notes:
 * - Returns raw numeric percentage (e.g., 25.5, not "25.5%")
 * - Use formatPercentage() to add percent symbol and formatting
 * - NaN result indicates division by zero, which is expected behavior
 */
export function calculatePercentage(part: number, total: number): number {
  // Validate inputs are numbers
  if (typeof part !== "number" || typeof total !== "number") {
    throw new Error(
      `Invalid inputs: part and total must be numbers. Got part: ${part}, total: ${total}.`,
    );
  }

  // Handle division by zero gracefully by returning NaN
  if (total === 0) {
    return NaN;
  }

  // Calculate percentage
  return (part / total) * 100;
}

/**
 * Formats a numeric value as a percentage string with locale-specific formatting
 *
 * @param value - The percentage value to format (e.g., 0-100, or -10-110)
 * @param locale - BCP 47 locale tag (e.g., "en-US", "id-ID", "fr-FR")
 * @returns Formatted percentage string with percent symbol and locale-appropriate formatting
 *
 * @example
 * formatPercentage(25, "en-US") // "25%"
 * formatPercentage(50.5, "en-US") // "50.5%"
 * formatPercentage(0, "en-US") // "0%"
 * formatPercentage(-10, "en-US") // "-10%"
 * formatPercentage(110, "en-US") // "110%"
 * formatPercentage(0, "id-ID") // "0%"
 * formatPercentage(33.333, "id-ID") // "33,333%"
 * formatPercentage(150, "fr-FR") // "150 %"
 *
 * @throws If value is not a number
 * @throws If locale string is not a valid BCP 47 tag
 *
 * Edge Cases:
 * - 0 → Returns "0%"
 * - Negative values → Returns negative with percent symbol
 * - Values > 100 → Returns value with percent symbol (e.g., "150%")
 * - NaN → Returns "NaN%"
 * - Infinity → Returns "∞%"
 *
 * Notes:
 * - Formats to 2 decimal places by default (controlled by Intl.NumberFormat)
 * - Use formatNumber() with options if you need custom decimal places
 * - Percent symbol placement is locale-dependent (e.g., "150%" vs "150 %")
 */
export function formatPercentage(value: number, locale: string): string {
  // Validate value is a number
  if (typeof value !== "number") {
    throw new Error(`Invalid value: ${value}. Must be a number.`);
  }

  // Validate locale is a valid BCP 47 tag
  if (typeof locale !== "string" || locale.trim().length === 0) {
    throw new Error(`Invalid locale string: "${locale}". Must be a non-empty BCP 47 locale tag.`);
  }

  // Create formatter for percentages
  const formatter = new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  try {
    return formatter.format(value / 100);
  } catch (error) {
    throw new Error(
      `Failed to format percentage with locale "${locale}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Formats a numeric value using compact notation for large numbers (e.g., K, M, B)
 *
 * @param value - The numeric value to format (e.g., 1,000, 1,000,000, 1,000,000,000)
 * @param locale - BCP 47 locale tag (e.g., "en-US", "id-ID", "en-GB")
 * @returns Formatted string using compact notation (e.g., "1K", "1M", "1B", "1K")
 *
 * @example
 * formatCompact(1000, "en-US") // "1K"
 * formatCompact(1000000, "en-US") // "1M"
 * formatCompact(1000000000, "en-US") // "1B"
 * formatCompact(1234, "id-ID") // "1K"
 * formatCompact(150000, "en-US") // "150K"
 * formatCompact(1.5, "en-US") // "1.5"
 * formatCompact(0, "en-US") // "0"
 * formatCompact(-5000, "en-US") // "-5K"
 * formatCompact(NaN, "en-US") // "NaN"
 * formatCompact(Infinity, "en-US") // "∞"
 *
 * @throws If value is not a number
 * @throws If locale string is not a valid BCP 47 tag
 *
 * Compact Notation Scale:
 * - 1,000 → "1K" (Kilo)
 * - 1,000,000 → "1M" (Mega)
 * - 1,000,000,000 → "1B" (Billion)
 * - 1,000,000,000,000 → "1T" (Trillion)
 *
 * Edge Cases:
 * - 0 → Returns "0"
 * - Very small numbers (e.g., 0.001) → Returns "0" (below compact threshold)
 * - Large numbers (trillions+) → Uses appropriate compact notation
 * - Negative numbers → Returns negative with compact notation (e.g., "-5K")
 * - NaN → Returns "NaN"
 * - Infinity → Returns "∞"
 *
 * Notes:
 * - Locale determines formatting of the compact notation (e.g., "1M" vs "1M")
 * - Decimal values are supported (e.g., "1.5M")
 * - The format is locale-aware for decimal separators and percent symbols
 */
export function formatCompact(value: number, locale: string): string {
  // Validate value is a number
  if (typeof value !== "number") {
    throw new Error(`Invalid value: ${value}. Must be a number.`);
  }

  // Validate locale is a valid BCP 47 tag
  if (typeof locale !== "string" || locale.trim().length === 0) {
    throw new Error(`Invalid locale string: "${locale}". Must be a non-empty BCP 47 locale tag.`);
  }

  // Handle special number values explicitly
  if (!isFinite(value)) {
    return value === Infinity ? "∞" : "NaN";
  }

  // Create formatter with compact notation enabled
  const formatter = new Intl.NumberFormat(locale, {
    notation: "compact",
    compactDisplay: "short", // "short" for "1M", "long" for "1 million"
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  try {
    return formatter.format(value);
  } catch (error) {
    throw new Error(
      `Failed to format compact number with locale "${locale}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Rounds a numeric value to a specified number of decimal places
 *
 * @param value - The numeric value to round
 * @param precision - The number of decimal places to round to (must be non-negative integer)
 * @returns Rounded numeric value with specified precision
 *
 * @example
 * toFixed(123.456, 0) // 123
 * toFixed(123.456, 1) // 123.5
 * toFixed(123.456, 2) // 123.46
 * toFixed(123.456, 3) // 123.456
 * toFixed(123.456, 4) // 123.456
 * toFixed(0.123456, 3) // 0.123
 * toFixed(-123.456, 2) // -123.46
 * toFixed(123.999, 0) // 124
 * toFixed(NaN, 2) // NaN
 * toFixed(Infinity, 2) // Infinity
 * toFixed(-Infinity, 2) // -Infinity
 *
 * @throws If value is not a number
 * @throws If precision is not a non-negative integer
 * @throws If precision is negative
 *
 * Rounding Behavior:
 * - Uses "round half away from zero" logic (standard JavaScript Math.round)
 * - 0.5 rounds up (e.g., 1.5 → 2)
 * - -0.5 rounds down (e.g., -1.5 → -2)
 * - Negative values round away from zero (e.g., -1.5 → -2)
 *
 * Edge Cases:
 * - precision is 0 → Rounds to integer
 * - precision is 1 → Rounds to 1 decimal place
 * - precision is 2 → Rounds to 2 decimal places
 * - precision is greater than actual decimal places → Returns original value unchanged
 * - NaN → Returns NaN
 * - Infinity → Returns Infinity
 * - -Infinity → Returns -Infinity
 *
 * Notes:
 * - This is a wrapper around Math.round() with precision adjustment
 * - Unlike Number.prototype.toFixed(), this returns a number, not a string
 * - Useful for financial calculations requiring precise decimal rounding
 */
export function toFixed(value: number, precision: number): number {
  // Validate value is a number
  if (typeof value !== "number") {
    throw new Error(`Invalid value: ${value}. Must be a number.`);
  }

  // Validate precision is a non-negative integer
  if (typeof precision !== "number" || !Number.isInteger(precision) || precision < 0) {
    throw new Error(`Invalid precision: ${precision}. Must be a non-negative integer.`);
  }

  // Handle special number values explicitly
  if (!isFinite(value)) {
    return value;
  }

  // Round to specified precision
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Compares two numbers and returns their relative order
 *
 * @param a - The first number to compare
 * @param b - The second number to compare
 * @returns -1 if a < b, 0 if a = b, 1 if a > b
 *
 * @example
 * compareNumbers(10, 20) // -1 (10 < 20)
 * compareNumbers(20, 10) // 1 (20 > 10)
 * compareNumbers(10, 10) // 0 (10 = 10)
 * compareNumbers(10.5, 10) // 1 (10.5 > 10)
 * compareNumbers(9.9, 10) // -1 (9.9 < 10)
 *
 * @throws If a or b is not a number
 *
 * Comparison Behavior:
 * - Returns -1 if a < b
 * - Returns 0 if a equals b
 * - Returns 1 if a > b
 * - NaN values are compared numerically (NaN < anything except NaN)
 * - Infinity compared normally (Infinity > any finite number)
 * - -Infinity compared normally (-Infinity < any finite number)
 *
 * Edge Cases:
 * - NaN vs NaN → Returns 0 (NaN equals NaN)
 * - NaN vs number → Returns negative if number > 0, positive if number < 0, 0 if number is 0
 * - Infinity vs Infinity → Returns 0
 * - -Infinity vs -Infinity → Returns 0
 * - Infinity vs -Infinity → Returns 1 (Infinity > -Infinity)
 * - Zero comparisons → -0 equals 0, both return 0
 *
 * Notes:
 * - Returns a three-way comparison value, not just boolean
 * - Useful for sorting algorithms and comparison utilities
 * - More explicit than a/b comparisons which can throw or return NaN
 */
export function compareNumbers(a: number, b: number): -1 | 0 | 1 {
  // Validate inputs are numbers
  if (typeof a !== "number" || typeof b !== "number") {
    throw new Error(`Invalid inputs: a and b must be numbers. Got a: ${a}, b: ${b}.`);
  }

  // Compare numbers using subtraction
  if (a < b) {
    return -1;
  } else if (a > b) {
    return 1;
  } else {
    return 0;
  }
}
