import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime } from "./format";

describe("formatDate", () => {
  it("formats deterministically regardless of the machine's local timezone", () => {
    const date = new Date("2026-03-15T10:00:00.000Z");
    expect(formatDate(date)).toBe("15 Mar 2026");
  });
});

describe("formatDateTime", () => {
  it("formats a date and time in Asia/Kolkata regardless of the machine's local timezone", () => {
    const date = new Date("2026-03-15T10:00:00.000Z");
    // UTC 10:00 -> IST (UTC+5:30) 15:30
    expect(formatDateTime(date)).toBe("15 Mar 2026, 03:30 pm");
  });
});
