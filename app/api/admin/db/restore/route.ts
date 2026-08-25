import path from "node:path";
import fs from "node:fs/promises";
import Database from "better-sqlite3";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SQLITE_MAGIC = "SQLite format 3\0";
const MAX_DB_SIZE = 500 * 1024 * 1024;

function dataDir(): string {
  return process.env.DATA_DIR ?? path.join(process.cwd(), "data");
}

export async function POST(req: NextRequest) {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_DB_SIZE) {
    return NextResponse.json({ error: "file size out of range" }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.subarray(0, 16).toString("binary") !== SQLITE_MAGIC) {
    return NextResponse.json(
      { error: "not a SQLite database file" },
      { status: 400 },
    );
  }

  const dir = dataDir();
  const staging = path.join(dir, "garden.db.restore-pending");
  await fs.writeFile(staging, buf);

  let checkDb: Database.Database | null = null;
  try {
    checkDb = new Database(staging, { readonly: true, fileMustExist: true });
    const integrity = checkDb
      .prepare("PRAGMA integrity_check")
      .get() as { integrity_check?: string } | undefined;
    if (integrity?.integrity_check !== "ok") {
      throw new Error("integrity check failed");
    }
    const hasUsers = checkDb
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'",
      )
      .get();
    if (!hasUsers) {
      throw new Error("missing 'users' table — does not look like a Garden DB");
    }
    checkDb.close();
    checkDb = null;
  } catch (err) {
    checkDb?.close();
    await fs.unlink(staging).catch(() => {});
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }

  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z");
  const live = path.join(dir, "garden.db");
  const backup = path.join(dir, `garden.db.bak-${stamp}`);

  let movedAside = false;
  await fs
    .rename(live, backup)
    .then(() => {
      movedAside = true;
    })
    .catch(async (e) => {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    });

  try {
    await fs.rename(staging, live);
  } catch (err) {
    // The live database is already moved aside at this point. Without this
    // rollback a failed second rename would leave the app with no database at
    // all, and the only copy under a name nothing looks for.
    if (movedAside) await fs.rename(backup, live).catch(() => {});
    await fs.unlink(staging).catch(() => {});
    return NextResponse.json(
      { error: `restore failed, original database kept: ${(err as Error).message}` },
      { status: 500 },
    );
  }

  await fs.unlink(path.join(dir, "garden.db-wal")).catch(() => {});
  await fs.unlink(path.join(dir, "garden.db-shm")).catch(() => {});

  // better-sqlite3 holds an open handle to the file we just replaced, so the
  // process must restart to pick up the new database. Docker's
  // `restart: unless-stopped` brings it straight back. If the restored database
  // turns out to be bad, stop the container and rename the `.bak-` file back
  // over `garden.db`.
  setTimeout(() => process.exit(0), 500);

  return NextResponse.json({
    ok: true,
    backupOf: movedAside ? path.basename(backup) : null,
    message: "Restore applied. The app is restarting to load the new database.",
  });
}
