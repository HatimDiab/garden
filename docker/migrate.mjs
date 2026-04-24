import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import Database from "better-sqlite3";

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const migrationsFolder = path.join(process.cwd(), "lib", "db", "migrations");
const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));

const sqlite = new Database(path.join(dataDir, "garden.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT NOT NULL,
    created_at INTEGER
  )
`);

const applied = new Set(
  sqlite
    .prepare("SELECT hash FROM __drizzle_migrations")
    .all()
    .map((r) => r.hash),
);

let count = 0;
for (const entry of journal.entries) {
  const sqlPath = path.join(migrationsFolder, `${entry.tag}.sql`);
  const sql = fs.readFileSync(sqlPath, "utf8");
  const hash = crypto.createHash("sha256").update(sql).digest("hex");
  if (applied.has(hash)) continue;

  const statements = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  const run = sqlite.transaction(() => {
    for (const stmt of statements) sqlite.exec(stmt);
    sqlite
      .prepare(
        "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
      )
      .run(hash, Date.now());
  });
  run();
  count++;
  console.log(`✓ applied ${entry.tag}`);
}

if (count === 0) console.log("✓ migrations up to date");
sqlite.close();
