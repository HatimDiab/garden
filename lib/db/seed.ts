import { db, schema } from "./client";
import { hashPassword, verifyPassword } from "../auth/password";
import { randomId } from "../util/id";
import { eq } from "drizzle-orm";

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
    const matches = await verifyPassword(existing.passwordHash, password);
    if (matches) {
      console.log(`Admin "${username}" already exists.`);
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
    console.log(`↻ synced admin "${username}" password from ADMIN_PASSWORD`);
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

async function main() {
  await ensureAdmin();
  ensureSettings();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
