import { afterEach, describe, expect, it, vi } from "vitest";
import { authSelfTest } from "@/lib/sign";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("authSelfTest", () => {
  it("passes when AUTH_SECRET is configured", () => {
    vi.stubEnv("AUTH_SECRET", "a-test-secret-that-is-long-enough");
    expect(authSelfTest()).toEqual({ ok: true });
  });

  it("passes in development without a secret (insecure fallback)", () => {
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(authSelfTest()).toEqual({ ok: true });
  });

  it("fails loudly in production without a secret", () => {
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    const result = authSelfTest();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("AUTH_SECRET");
  });

  it("fails in production with an obviously placeholder secret", () => {
    vi.stubEnv("AUTH_SECRET", "short");
    vi.stubEnv("NODE_ENV", "production");
    expect(authSelfTest().ok).toBe(false);
  });
});
