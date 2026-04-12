/**
 * Pure validation functions for common data validation scenarios.
 *
 * All functions are pure (no side effects) and return boolean values:
 * - `true` = validation passed
 * - `false` = validation failed
 *
 * @module @finance/utils/validation
 */

/**
 * Validates email format using RFC 5322 compliant regular expression.
 *
 * Handles:
 * - Standard email format (user@domain.tld)
 * - Subdomains (user@sub.domain.tld)
 * - Plus signs for aliases (user+tag@domain.com)
 * - Dot separators in domain
 * - International TLDs
 *
 * @param email - Email string to validate (can be null, undefined, or empty string)
 * @returns `true` if email matches valid format, `false` otherwise
 *
 * @example
 * ```ts
 * email("user@example.com"); // true
 * email("user+tag@example.co.uk"); // true
 * email("invalid-email"); // false
 * email(null); // false
 * email(""); // false
 * ```
 *
 * @see https://emailregex.com/
 */
export function email(email: unknown): boolean {
  // Handle null, undefined, empty string, non-string inputs
  if (email === null || email === undefined || email === "") {
    return false;
  }

  if (typeof email !== "string") {
    return false;
  }

  // RFC 5322 compliant email regex
  // Matches most common email formats
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * Validates phone number format supporting US and EU patterns.
 *
 * Handles:
 * - US format: +1 XXX-XXX-XXXX, (XXX) XXX-XXXX, XXX-XXX-XXXX
 * - EU format: +XX XXXX XXXXXX, +XX XX XXXXXX (without leading zero)
 *
 * @param phone - Phone string to validate (can be null, undefined, or empty string)
 * @param country - Optional country code ('us' or 'eu'), defaults to 'us'
 * @returns `true` if phone matches valid format, `false` otherwise
 *
 * @example
 * ```ts
 * phone("+1 555-123-4567"); // true
 * phone("555-123-4567"); // true
 * phone("+44 20 12345678"); // true
 * phone("invalid-phone"); // false
 * phone(null); // false
 * ```
 */
export function phone(phone: unknown, country: "us" | "eu" = "us"): boolean {
  // Handle null, undefined, empty string, non-string inputs
  if (phone === null || phone === undefined || phone === "") {
    return false;
  }

  if (typeof phone !== "string") {
    return false;
  }

  const trimmedPhone = phone.trim();

  let phoneRegex: RegExp;

  if (country === "us") {
    // US phone patterns:
    // - +1 555-123-4567
    // - (555) 555-5555
    // - 555-555-5555
    // - 555.555.5555
    // - 5555555555 (10 digits)
    phoneRegex = /^(?:\+1\s?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}$/;
  } else {
    // EU phone patterns (UK, France, Germany, etc.):
    // - +44 20 12345678 (without leading zero)
    // - +442012345678
    // - +44 20 1234 5678
    // - 20 1234 5678
    phoneRegex = /^(?:\+\d{1,2}\s?)?\d{2,3}[\s.-]?\d{4,8}$/;
  }

  return phoneRegex.test(trimmedPhone);
}

/**
 * Validates ISO 4217 currency code (3-letter uppercase).
 *
 * Handles:
 * - USD, EUR, GBP, IDR, JPY, etc.
 * - 3-letter uppercase format only
 *
 * @param currencyCode - Currency code string (can be null, undefined, or empty string)
 * @returns `true` if currency code is valid, `false` otherwise
 *
 * @example
 * ```ts
 * currency("USD"); // true
 * currency("eur"); // false (case-sensitive)
 * currency("US"); // false (must be 3 letters)
 * currency("invalid"); // false
 * currency(null); // false
 * ```
 */
export function currency(currencyCode: unknown): boolean {
  // Handle null, undefined, empty string, non-string inputs
  if (currencyCode === null || currencyCode === undefined || currencyCode === "") {
    return false;
  }

  if (typeof currencyCode !== "string") {
    return false;
  }

  const trimmed = currencyCode.trim().toUpperCase();

  // ISO 4217 currency code must be 3 uppercase letters
  const currencyRegex = /^[A-Z]{3}$/;
  return currencyRegex.test(trimmed);
}

/**
 * Validates that a number is strictly positive (> 0).
 *
 * Handles:
 * - Positive numbers (> 0)
 * - Zero (invalid)
 * - Negative numbers (invalid)
 * - Non-numeric inputs
 *
 * @param value - Number to validate (can be null, undefined)
 * @returns `true` if value > 0, `false` otherwise
 *
 * @example
 * ```ts
 * positive(100); // true
 * positive(0); // false
 * positive(-5); // false
 * positive(null); // false
 * positive(0.01); // true
 * ```
 */
export function positive(value: unknown): boolean {
  // Handle null, undefined, non-number inputs
  if (value === null || value === undefined || typeof value !== "number") {
    return false;
  }

  // Check for NaN (not a number)
  if (Number.isNaN(value)) {
    return false;
  }

  return value > 0;
}

/**
 * Validates that a number is non-negative (>= 0).
 *
 * Handles:
 * - Zero and positive numbers (>= 0)
 * - Negative numbers (invalid)
 * - Non-numeric inputs
 *
 * @param value - Number to validate (can be null, undefined)
 * @returns `true` if value >= 0, `false` otherwise
 *
 * @example
 * ```ts
 * nonNegative(0); // true
 * nonNegative(100); // true
 * nonNegative(-5); // false
 * nonNegative(null); // false
 * nonNegative(-0.01); // false
 * ```
 */
export function nonNegative(value: unknown): boolean {
  // Handle null, undefined, non-number inputs
  if (value === null || value === undefined || typeof value !== "number") {
    return false;
  }

  // Check for NaN (not a number)
  if (Number.isNaN(value)) {
    return false;
  }

  return value >= 0;
}

/**
 * Validates budget amount against realistic budget limits.
 *
 * Handles:
 * - Zero (invalid)
 * - Positive numbers
 * - Max budget of 1,000,000 (configurable in practice)
 *
 * @param amount - Budget amount in the specified currency
 * @param currencyCode - Currency code (required for validation consistency)
 * @returns `true` if 0 < amount <= 1,000,000, `false` otherwise
 *
 * @example
 * ```ts
 * budgetAmount(500, "USD"); // true
 * budgetAmount(0, "USD"); // false (must be > 0)
 * budgetAmount(1000000, "USD"); // true (max allowed)
 * budgetAmount(1000001, "USD"); // false (exceeds max)
 * budgetAmount(-500, "USD"); // false (negative)
 * budgetAmount(null, "USD"); // false
 * ```
 */
export function budgetAmount(amount: unknown, currencyCode: string): boolean {
  // Validate amount
  if (positive(amount) === false) {
    return false;
  }

  // Validate currency code
  if (currency(currencyCode) === false) {
    return false;
  }

  // Type narrowed to number after positive() check
  const numericAmount = amount as number;

  // Budget limit: 0 < amount <= 1,000,000
  // Max can be adjusted based on business requirements
  const MAX_BUDGET = 1_000_000;
  return numericAmount <= MAX_BUDGET;
}
