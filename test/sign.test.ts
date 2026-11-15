import { describe, expect, it } from "vitest";
import { open, safeEqual, seal } from "@/lib/sign";

describe("sealed payloads", () => {
  it("round-trips data and rejects tampering", () => {
    const token = seal({ orders: ["PPH-ABC123"], exp: Date.now() + 60_000 });
    const decoded = open<{ orders: string[] }>(token);
    expect(decoded?.orders).toEqual(["PPH-ABC123"]);

    // Flip one character of the encoded payload.
    const [payload, signature] = token.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ orders: ["PPH-ZZZZZZ"], exp: Date.now() + 60_000 }),
    ).toString("base64url");
    expect(open(`${forgedPayload}.${signature}`)).toBeNull();
    expect(open(`${payload}.${signature}x`)).toBeNull();
    expect(open(payload)).toBeNull();
    expect(open("")).toBeNull();
    expect(open(undefined)).toBeNull();
  });

  it("produces a different signature for the same payload when data differs", () => {
    const a = seal({ uid: "usr_1" });
    const b = seal({ uid: "usr_2" });
    expect(a).not.toBe(b);
  });

  it("compares strings without throwing on length mismatch", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});
