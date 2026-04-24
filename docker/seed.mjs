import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import { hash } from "@node-rs/argon2";

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const sqlite = new Database(path.join(dataDir, "garden.db"));
sqlite.pragma("foreign_keys = ON");

const BASE32 = "abcdefghijklmnopqrstuvwxyz234567";
function randomId() {
  const buf = new Uint8Array(15);
  crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < buf.length; i += 5) {
    const n =
      (BigInt(buf[i] ?? 0) << 32n) |
      (BigInt(buf[i + 1] ?? 0) << 24n) |
      (BigInt(buf[i + 2] ?? 0) << 16n) |
      (BigInt(buf[i + 3] ?? 0) << 8n) |
      BigInt(buf[i + 4] ?? 0);
    for (let j = 7; j >= 0; j--) out += BASE32[Number((n >> BigInt(j * 5)) & 31n)];
  }
  return out;
}

const now = Math.floor(Date.now() / 1000);

async function ensureAdmin() {
  const username = process.env.ADMIN_USERNAME || "gardener";
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.log("No ADMIN_PASSWORD set; skipping admin bootstrap.");
    return;
  }
  const existing = sqlite
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(username);
  if (existing) {
    console.log(`Admin "${username}" already exists.`);
    return;
  }
  const passwordHash = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
  sqlite
    .prepare(
      "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
    )
    .run(randomId(), username, passwordHash, now);
  console.log(`✓ created admin "${username}"`);
}

function ensureSettings() {
  const defaults = {
    site_title: process.env.SITE_TITLE || "The Garden Diary",
    site_tagline:
      process.env.SITE_TAGLINE || "Pages from our garden, petal by petal.",
    active_season: "Spring",
  };
  const check = sqlite.prepare("SELECT value FROM settings WHERE key = ?");
  const insert = sqlite.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
  for (const [key, value] of Object.entries(defaults)) {
    if (!check.get(key)) insert.run(key, value);
  }
  console.log("✓ settings seeded");
}

await ensureAdmin();
ensureSettings();
sqlite.close();
