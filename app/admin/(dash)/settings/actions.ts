"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { settings, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { invalidateAllUserSessions } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

function setSetting(key: string, value: string) {
  const existing = db.select().from(settings).where(eq(settings.key, key)).get();
  if (existing) {
    db.update(settings).set({ value }).where(eq(settings.key, key)).run();
  } else {
    db.insert(settings).values({ key, value }).run();
  }
}

export async function saveSiteSettings(data: {
  siteTitle: string;
  siteTitleDe: string;
  siteTagline: string;
  siteTaglineDe: string;
  activeSeason: string;
  aboutText: string;
  aboutTextDe: string;
}) {
  await requireAdmin();
  setSetting("site_title", data.siteTitle);
  setSetting("site_title_de", data.siteTitleDe);
  setSetting("site_tagline", data.siteTagline);
  setSetting("site_tagline_de", data.siteTaglineDe);
  setSetting("active_season", data.activeSeason);
  setSetting("about_text", data.aboutText);
  setSetting("about_text_de", data.aboutTextDe);
  revalidatePath("/", "layout");
}

export async function changePassword(data: {
  current: string;
  next: string;
}) {
  const user = await requireAdmin();
  if (data.next.length < 8) throw new Error("Password must be at least 8 characters.");
  const row = db.select().from(users).where(eq(users.id, user.id)).get();
  if (!row) throw new Error("User missing");
  const ok = await verifyPassword(row.passwordHash, data.current);
  if (!ok) throw new Error("Current password is incorrect.");
  const next = await hashPassword(data.next);
  db.update(users).set({ passwordHash: next }).where(eq(users.id, user.id)).run();
  await invalidateAllUserSessions(user.id);
}
