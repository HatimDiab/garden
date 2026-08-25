import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
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
    const { size } = await fs.stat(tmp);

    // Stream the snapshot rather than reading it into a Buffer first: on a Pi a
    // few hundred MB of database would otherwise have to fit in memory at once.
    // The temp file is unlinked when the stream ends, errors, or the client aborts.
    const file = createReadStream(tmp);
    const cleanup = () => void fs.unlink(tmp).catch(() => {});
    file.once("close", cleanup);
    file.once("error", cleanup);

    return new NextResponse(Readable.toWeb(file) as ReadableStream, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.sqlite3",
        "Content-Disposition": `attachment; filename="garden-${stamp}.db"`,
        "Content-Length": String(size),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    await fs.unlink(tmp).catch(() => {});
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
