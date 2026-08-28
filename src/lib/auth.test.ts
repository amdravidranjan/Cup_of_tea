import { describe, it, expect } from "vitest";
import { parseSessionCookie } from "./auth";

describe("parseSessionCookie", () => {
  it("returns null for undefined input", () => {
    expect(parseSessionCookie(undefined)).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseSessionCookie("not json")).toBeNull();
  });

  it("returns null when required fields are missing", () => {
    expect(parseSessionCookie(JSON.stringify({ userId: "u-1" }))).toBeNull();
  });

  it("parses a valid session", () => {
    const raw = JSON.stringify({ userId: "u-1", name: "Test User", role: "district" });
    expect(parseSessionCookie(raw)).toEqual({
      userId: "u-1",
      name: "Test User",
      role: "district",
    });
  });
});
