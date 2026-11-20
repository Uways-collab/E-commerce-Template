import { describe, expect, it } from "vitest";
import { resolveDatabasePath } from "@/lib/db";

const CWD = "/srv/app";
const TMP = "/tmp";

describe("resolveDatabasePath", () => {
  it("honours an explicit DATABASE_PATH", () => {
    const location = resolveDatabasePath({ DATABASE_PATH: "./data/custom.db" }, CWD, TMP);
    expect(location).toEqual({ file: "/srv/app/data/custom.db", source: "env", ephemeral: false });
  });

  it("uses the temporary directory on Vercel", () => {
    const location = resolveDatabasePath({ VERCEL: "1" }, CWD, TMP);
    expect(location.file).toBe("/tmp/product-pro-hub/store.db");
    expect(location.source).toBe("serverless");
    expect(location.ephemeral).toBe(true);
  });

  it("treats Lambda and Netlify as serverless too", () => {
    expect(resolveDatabasePath({ AWS_LAMBDA_FUNCTION_NAME: "fn" }, CWD, TMP).ephemeral).toBe(true);
    expect(resolveDatabasePath({ NETLIFY: "true" }, CWD, TMP).ephemeral).toBe(true);
  });

  it("falls back to the repo data directory elsewhere", () => {
    const location = resolveDatabasePath({}, CWD, TMP);
    expect(location).toEqual({ file: "/srv/app/data/store.db", source: "local", ephemeral: false });
  });

  it("lets DATABASE_PATH override the platform default", () => {
    const location = resolveDatabasePath({ VERCEL: "1", DATABASE_PATH: "/mnt/volume/store.db" }, CWD, TMP);
    expect(location.file).toBe("/mnt/volume/store.db");
    expect(location.source).toBe("env");
  });

  it("ignores a blank DATABASE_PATH", () => {
    expect(resolveDatabasePath({ DATABASE_PATH: "   ", VERCEL: "1" }, CWD, TMP).source).toBe("serverless");
  });
});
