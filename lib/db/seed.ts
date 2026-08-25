import { db, schema } from "./client";
import { hashPassword, verifyPassword } from "../auth/password";
import { randomId } from "../util/id";
import { eq, lt } from "drizzle-orm";

async function ensureAdmin() {
  const username = process.env.ADMIN_USERNAME ?? "gardener";
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.log("No ADMIN_PASSWORD set; skipping admin bootstrap.");
    return;
  }
  const existing = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .get();
  if (existing) {
    // ADMIN_PASSWORD bootstraps the account; it does NOT own it afterwards.
    // Re-syncing on every boot would silently revert a password changed in the
    // admin UI (and drop every session) on the next restart or reboot.
    if (process.env.ADMIN_PASSWORD_FORCE_RESET !== "1") {
      console.log(`Admin "${username}" already exists; leaving password as-is.`);
      return;
    }
    const matches = await verifyPassword(existing.passwordHash, password);
    if (matches) {
      console.log(`Admin "${username}" already matches ADMIN_PASSWORD.`);
      return;
    }
    const passwordHash = await hashPassword(password);
    db.update(schema.users)
      .set({ passwordHash })
      .where(eq(schema.users.id, existing.id))
      .run();
    db.delete(schema.sessions)
      .where(eq(schema.sessions.userId, existing.id))
      .run();
    console.log(
      `↻ ADMIN_PASSWORD_FORCE_RESET=1 — reset admin "${username}" password and cleared sessions`,
    );
    return;
  }
  const passwordHash = await hashPassword(password);
  db.insert(schema.users)
    .values({ id: randomId(), username, passwordHash })
    .run();
  console.log(`✓ created admin "${username}"`);
}

function ensureSettings() {
  const defaults: Record<string, string> = {
    site_title: process.env.SITE_TITLE ?? "The Garden Diary",
    site_tagline:
      process.env.SITE_TAGLINE ?? "Pages from our garden, petal by petal.",
    active_season: "Spring",
  };
  for (const [key, value] of Object.entries(defaults)) {
    const row = db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, key))
      .get();
    if (!row) db.insert(schema.settings).values({ key, value }).run();
  }
  console.log("✓ settings seeded");
}

function pruneExpired() {
  // Sessions are otherwise only cleared lazily when a stale token is presented,
  // so an abandoned one lingers forever. Same for spent throttle counters.
  const now = new Date();
  const sessions = db
    .delete(schema.sessions)
    .where(lt(schema.sessions.expiresAt, now))
    .run().changes;
  const attempts = db
    .delete(schema.loginAttempts)
    .where(
      lt(schema.loginAttempts.lastFailureAt, new Date(now.getTime() - 60 * 60 * 1000)),
    )
    .run().changes;
  if (sessions || attempts) {
    console.log(
      `✓ pruned ${sessions} expired session(s), ${attempts} throttle row(s)`,
    );
  }
}

async function main() {
  await ensureAdmin();
  ensureSettings();
  pruneExpired();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
