import { NextResponse } from "next/server";
import { databaseInfo, db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Deployment diagnostics. Answers "is the store actually backed by a database
 * I can write to?" without exposing the filesystem layout.
 *
 * `ephemeral: true` means the instance is using the serverless temporary store:
 * the site works, but data written there does not survive a cold start and is
 * not shared between instances.
 */
export async function GET() {
  try {
    const info = databaseInfo();
    const counts = db().get<{ products: number }>(
      "SELECT (SELECT COUNT(*) FROM products) AS products",
    );

    return NextResponse.json(
      {
        ok: true,
        database: {
          ephemeral: info.ephemeral,
          source: info.source,
          seededDemoData: info.seeded,
          file: info.path.split("/").pop() ?? info.path,
        },
        products: Number(counts?.products ?? 0),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: (error as Error)?.message ?? "Database unavailable",
        hint: "Set DATABASE_PATH to a writable path or move to Postgres — see docs/DEPLOYMENT.md.",
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
