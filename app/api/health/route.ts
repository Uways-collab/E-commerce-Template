import { NextResponse } from "next/server";
import { databaseInfo, db } from "@/lib/db";
import { authSelfTest } from "@/lib/sign";

export const dynamic = "force-dynamic";

/**
 * Deployment diagnostics. Answers two questions an error page cannot:
 *
 * 1. "is the store backed by a database I can actually read?" — `ephemeral: true`
 *    means the instance is using the serverless temporary store: the site works,
 *    but data written there does not survive a cold start and is not shared
 *    between instances.
 * 2. "will sessions work?" — `auth.ok` sign-and-verify a throwaway token with
 *    `AUTH_SECRET`. Without a secret, anonymous pages still render while every
 *    signed-in request throws, which is hard to spot from the outside.
 *
 * Any failing check makes the endpoint answer 503 so uptime monitoring catches it.
 */
export async function GET() {
  const auth = authSelfTest();

  try {
    const info = databaseInfo();
    const counts = db().get<{ products: number }>(
      "SELECT (SELECT COUNT(*) FROM products) AS products",
    );

    return NextResponse.json(
      {
        ok: auth.ok,
        auth,
        database: {
          ephemeral: info.ephemeral,
          source: info.source,
          seededDemoData: info.seeded,
          file: info.path.split("/").pop() ?? info.path,
        },
        products: Number(counts?.products ?? 0),
        ...(auth.ok
          ? {}
          : { hint: "Set AUTH_SECRET (16+ characters) for every environment — see docs/DEPLOYMENT.md." }),
      },
      { status: auth.ok ? 200 : 503, headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        auth,
        error: (error as Error)?.message ?? "Database unavailable",
        hint: "Set DATABASE_PATH to a writable path or move to Postgres — see docs/DEPLOYMENT.md.",
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
