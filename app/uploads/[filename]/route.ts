import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const uploadsDir = path.join(dataDir, "uploads");

export const runtime = "nodejs";

const ALLOWED = /^[a-z0-9._-]+$/i;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ filename: string }> },
) {
  const { filename } = await ctx.params;
  if (!ALLOWED.test(filename) || filename.includes("..")) {
    return new NextResponse("bad path", { status: 400 });
  }
  const full = path.join(uploadsDir, filename);
  try {
    const buf = await fs.readFile(full);
    const type = filename.endsWith(".webp")
      ? "image/webp"
      : filename.endsWith(".png")
        ? "image/png"
        : filename.endsWith(".jpg") || filename.endsWith(".jpeg")
          ? "image/jpeg"
          : "application/octet-stream";
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "content-type": type,
        // The pipeline only ever writes webp, but this path serves whatever is
        // in the uploads dir — nosniff stops a browser from re-interpreting an
        // octet-stream fallback as something executable.
        "x-content-type-options": "nosniff",
        "content-disposition": "inline",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("not found", { status: 404 });
  }
}
