import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

/**
 * Serves admin-uploaded media from the persistent data volume. Uploads live
 * outside /public so they survive deploys and can be backed up independently.
 */
export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await context.params;
  const filename = segments.join("/");

  // Prevent traversal outside the uploads directory.
  const uploadsDir = path.join(process.cwd(), "data", "uploads");
  const resolved = path.resolve(uploadsDir, filename);
  if (!resolved.startsWith(path.resolve(uploadsDir) + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const file = await fs.readFile(resolved);
    const type = TYPES[path.extname(resolved).toLowerCase()] ?? "application/octet-stream";
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(file.byteLength),
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
