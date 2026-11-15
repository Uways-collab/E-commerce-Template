import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { getSessionUser, isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 12 * 1024 * 1024; // 12MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file supplied" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, AVIF or GIF images are allowed." }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Images must be smaller than 12MB." }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const id = crypto.randomBytes(8).toString("hex");
  const base = `${Date.now().toString(36)}-${id}`;

  try {
    // Normalise every upload: strip metadata, cap dimensions, convert to WebP.
    const pipeline = sharp(buffer, { failOn: "none" }).rotate();
    const meta = await pipeline.metadata();
    const width = Math.min(meta.width ?? 1600, 2000);

    const output = await pipeline
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 86 })
      .toBuffer();

    const dir = path.join(process.cwd(), "data", "uploads");
    await fs.mkdir(dir, { recursive: true });
    const filename = `${base}.webp`;
    await fs.writeFile(path.join(dir, filename), output);

    return NextResponse.json({
      url: `/api/media/${filename}`,
      width: Math.round(width),
      height: meta.height ?? null,
      bytes: output.byteLength,
    });
  } catch (error) {
    console.error("upload failed", error);
    return NextResponse.json({ error: "That image could not be processed." }, { status: 422 });
  }
}
