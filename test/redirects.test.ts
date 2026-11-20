import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/redirects";

const FALLBACK = "/account";

describe("safeNext", () => {
  it("keeps same-origin paths", () => {
    expect(safeNext("/account/orders", FALLBACK)).toBe("/account/orders");
    expect(safeNext("/shop?q=shirt#top", FALLBACK)).toBe("/shop?q=shirt#top");
    expect(safeNext("/", FALLBACK)).toBe("/");
  });

  it("rejects absolute URLs to other origins", () => {
    expect(safeNext("https://evil.com", FALLBACK)).toBe(FALLBACK);
    expect(safeNext("http://evil.com/account", FALLBACK)).toBe(FALLBACK);
    expect(safeNext("javascript:alert(1)", FALLBACK)).toBe(FALLBACK);
  });

  it("rejects protocol-relative and backslash tricks", () => {
    expect(safeNext("//evil.com", FALLBACK)).toBe(FALLBACK);
    expect(safeNext("///evil.com", FALLBACK)).toBe(FALLBACK);
    expect(safeNext("/\\evil.com", FALLBACK)).toBe(FALLBACK);
    expect(safeNext("\\\\evil.com", FALLBACK)).toBe(FALLBACK);
    expect(safeNext("/\t/evil.com", FALLBACK)).toBe(FALLBACK);
  });

  it("falls back for empty or non-path input", () => {
    expect(safeNext(null, FALLBACK)).toBe(FALLBACK);
    expect(safeNext(undefined, FALLBACK)).toBe(FALLBACK);
    expect(safeNext("", FALLBACK)).toBe(FALLBACK);
    expect(safeNext("account", FALLBACK)).toBe(FALLBACK);
    expect(safeNext("   ", FALLBACK)).toBe(FALLBACK);
  });
});
