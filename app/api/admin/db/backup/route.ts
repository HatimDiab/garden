import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { rawDb } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z");
  const tmp = path.join(os.tmpdir(), `garden-backup-${stamp}.db`);

  try {
    await rawDb.backup(tmp);
    const bytes = await fs.readFile(tmp);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.sqlite3",
        "Content-Disposition": `attachment; filename="garden-${stamp}.db"`,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await fs.unlink(tmp).catch(() => {});
  }
}
