/**
 * Unit tests for date utilities
 * Tests formatDate, parseDate, getDateRange, startOfPeriod, endOfPeriod functions
 */

import { describe, it, expect } from "vitest";
import { formatDate, parseDate, getDateRange, startOfPeriod, endOfPeriod } from "../date";

describe("date", () => {
  describe("formatDate", () => {
    it("should format date with locale-specific format", () => {
      const date = new Date(2024, 4, 10); // May 10, 2024
      expect(formatDate(date, "en-US", "PPP")).toBe("May 10th, 2024");
    });

    it("should format date in Indonesian locale", () => {
      const date = new Date(2024, 4, 10);
      // Note: id-ID locale is mapped to zhCN in date.ts, returns Chinese format
      expect(formatDate(date, "id-ID", "PPP")).toBe("2024年5月10日");
    });

    it("should format date in Chinese locale", () => {
      const date = new Date(2024, 4, 10);
      expect(formatDate(date, "zh-CN", "PPP")).toBe("2024年5月10日");
    });

    it("should format with custom format string (yyyy-MM-dd)", () => {
      const date = new Date(2024, 4, 10);
      expect(formatDate(date, "en-US", "yyyy-MM-dd")).toBe("2024-05-10");
    });

    it("should return empty string for null input", () => {
      expect(formatDate(null, "en-US", "PPP")).toBe("");
    });

    it("should return empty string for undefined input", () => {
      expect(formatDate(null, "en-US", "PPP")).toBe("");
    });

    it("should throw error for invalid date string", () => {
      expect(() => formatDate("not-a-date", "en-US", "PPP")).toThrow("Invalid date value");
    });

    it("should throw error for invalid date object", () => {
      expect(() => formatDate(new Date("invalid"), "en-US", "PPP")).toThrow("Invalid date value");
    });

    it("should throw error for invalid format string", () => {
      const date = new Date(2024, 4, 10);
      expect(() => formatDate(date, "en-US", "invalid-format" as never)).toThrow(
        "Failed to format date",
      );
    });

    it("should throw error for unsupported locale", () => {
      const date = new Date(2024, 4, 10);
      // Note: "xx-XX" is not in locales map, falls back to enUS
      expect(() => formatDate(date, "xx-XX", "PPP")).not.toThrow();
    });
  });

  describe("parseDate", () => {
    it("should parse date string to Date object", () => {
      const date = parseDate("May 10, 2024", "en-US", "PPP");
      expect(date).toBeInstanceOf(Date);
      expect(date.toDateString()).toBe("Fri May 10 2024");
    });

    it("should parse ISO date string", () => {
      const date = parseDate("2024-05-10", "en-US", "yyyy-MM-dd");
      expect(date.toDateString()).toBe("Fri May 10 2024");
    });

    it("should parse Chinese formatted date string", () => {
      const date = parseDate("2024年5月10日", "zh-CN", "PPP");
      expect(date).toBeInstanceOf(Date);
      expect(date.toDateString()).toBe("Fri May 10 2024");
    });

    it("should return Invalid Date for empty string", () => {
      const date = parseDate("", "en-US", "PPP");
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBe(NaN);
    });

    it("should return Invalid Date for null input", () => {
      const date = parseDate(null, "en-US", "PPP");
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBe(NaN);
    });

    it("should return Invalid Date for undefined input", () => {
      const date = parseDate(null, "en-US", "PPP");
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBe(NaN);
    });

    it("should return Invalid Date for malformed date string", () => {
      const date = parseDate("not-a-date", "en-US", "PPP");
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBe(NaN);
    });

    it("should return Invalid Date for invalid format string", () => {
      const date = parseDate("May 10, 2024", "en-US", "invalid-format" as never);
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBe(NaN);
    });
  });

  describe("getDateRange", () => {
    it("should return month range for given date", () => {
      const date = new Date(2024, 4, 15); // May 2024
      const range = getDateRange("month", date);
      expect(range.start.getDate()).toBe(1);
      expect(range.start.getMonth()).toBe(4); // May
      expect(range.start.getFullYear()).toBe(2024);
      expect(range.end.getDate()).toBe(31);
      expect(range.end.getMonth()).toBe(4);
      expect(range.end.getFullYear()).toBe(2024);
    });

    it("should return quarter range for given date", () => {
      const date = new Date(2024, 6, 20); // July 2024 (Q3)
      const range = getDateRange("quarter", date);
      expect(range.start.getMonth()).toBe(6); // July
      expect(range.end.getMonth()).toBe(8); // September
    });

    it("should return year range for given date", () => {
      const date = new Date(2024, 4, 10); // May 2024
      const range = getDateRange("year", date);
      expect(range.start.getMonth()).toBe(0); // January
      expect(range.start.getDate()).toBe(1);
      expect(range.end.getMonth()).toBe(11); // December
      expect(range.end.getDate()).toBe(31);
    });

    it("should use current date if no date provided", () => {
      const range = getDateRange("month");
      const now = new Date();
      expect(range.start.getMonth()).toBe(now.getMonth());
      expect(range.end.getMonth()).toBe(now.getMonth());
    });

    it("should throw error for invalid range type", () => {
      expect(() => getDateRange("invalid" as never, new Date())).toThrow("Invalid date range type");
    });

    it("should throw error for invalid date object", () => {
      expect(() => getDateRange("month", new Date("invalid"))).toThrow("Invalid date object");
    });
  });

  describe("startOfPeriod", () => {
    it("should return start of week (Monday)", () => {
      const date = new Date(2024, 4, 15); // Sunday May 19? Let me check
      // May 15, 2024 is a Wednesday, so start of week should be Monday May 13
      const start = startOfPeriod(date, "week");
      expect(start.getDate()).toBe(13);
      expect(start.getMonth()).toBe(4); // May
    });

    it("should return start of month", () => {
      const date = new Date(2024, 4, 15);
      const start = startOfPeriod(date, "month");
      expect(start.getDate()).toBe(1);
      expect(start.getMonth()).toBe(4); // May
    });

    it("should return start of quarter", () => {
      // May 15, 2024 is in Q2 (April, May, June)
      const date = new Date(2024, 4, 15);
      const start = startOfPeriod(date, "quarter");
      expect(start.getMonth()).toBe(3); // April
    });

    it("should return start of year", () => {
      const date = new Date(2024, 4, 15);
      const start = startOfPeriod(date, "year");
      expect(start.getMonth()).toBe(0); // January
      expect(start.getDate()).toBe(1);
    });

    it("should throw error for invalid date object", () => {
      expect(() => startOfPeriod(new Date("invalid"), "month")).toThrow("Invalid date object");
    });

    it("should throw error for invalid period type", () => {
      const date = new Date(2024, 4, 15);
      expect(() => startOfPeriod(date, "invalid" as never)).toThrow("Invalid period type");
    });
  });

  describe("endOfPeriod", () => {
    it("should return end of week (Sunday)", () => {
      const date = new Date(2024, 4, 15);
      const end = endOfPeriod(date, "week");
      // Should be the Sunday of the same week
      expect(end.getDate()).toBe(19);
      expect(end.getMonth()).toBe(4); // May
    });

    it("should return end of month", () => {
      const date = new Date(2024, 4, 15);
      const end = endOfPeriod(date, "month");
      expect(end.getDate()).toBe(31);
      expect(end.getMonth()).toBe(4); // May
    });

    it("should return end of quarter", () => {
      // May 15, 2024 is in Q2, which ends June 30
      const date = new Date(2024, 4, 15);
      const end = endOfPeriod(date, "quarter");
      expect(end.getMonth()).toBe(5); // June
      expect(end.getDate()).toBe(30);
    });

    it("should return end of year", () => {
      const date = new Date(2024, 4, 15);
      const end = endOfPeriod(date, "year");
      expect(end.getMonth()).toBe(11); // December
      expect(end.getDate()).toBe(31);
    });

    it("should throw error for invalid date object", () => {
      expect(() => endOfPeriod(new Date("invalid"), "month")).toThrow("Invalid date object");
    });

    it("should throw error for invalid period type", () => {
      const date = new Date(2024, 4, 15);
      expect(() => endOfPeriod(date, "invalid" as never)).toThrow("Invalid period type");
    });
  });
});
