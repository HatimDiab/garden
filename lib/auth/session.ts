import { sha256 } from "@oslojs/crypto/sha2";
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from "@oslojs/encoding";
import { cookies, headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sessions, users } from "@/lib/db/schema";
import { redirect as intlRedirect } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";

const SESSION_COOKIE = "garden_session";
const DAY = 1000 * 60 * 60 * 24;

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
}

function hashToken(token: string): string {
  return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

export async function createSession(
  token: string,
  userId: string,
): Promise<void> {
  const id = hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * DAY);
  db.insert(sessions).values({ id, userId, expiresAt }).run();
}

type Validated =
  | { user: { id: string; username: string }; session: { id: string; expiresAt: Date } }
  | { user: null; session: null };

async function validateToken(token: string): Promise<Validated> {
  const id = hashToken(token);
  const row = db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      userId: users.id,
      username: users.username,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .get();
  if (!row) return { user: null, session: null };

  const now = Date.now();
  if (row.expiresAt.getTime() < now) {
    db.delete(sessions).where(eq(sessions.id, id)).run();
    return { user: null, session: null };
  }
  if (row.expiresAt.getTime() - now < 15 * DAY) {
    const newExpires = new Date(now + 30 * DAY);
    db.update(sessions)
      .set({ expiresAt: newExpires })
      .where(eq(sessions.id, id))
      .run();
    row.expiresAt = newExpires;
  }
  return {
    user: { id: row.userId, username: row.username },
    session: { id: row.sessionId, expiresAt: row.expiresAt },
  };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  db.delete(sessions).where(eq(sessions.id, sessionId)).run();
}

export async function invalidateAllUserSessions(userId: string): Promise<void> {
  db.delete(sessions).where(eq(sessions.userId, userId)).run();
}

async function isRequestSecure(): Promise<boolean> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  const host = h.get("host") ?? "";
  return host.endsWith(":443") || host === "localhost" || host.startsWith("localhost:");
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await isRequestSecure(),
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async () => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return { user: null, session: null } as Validated;
  return validateToken(token);
});

export async function requireAdmin() {
  const { user } = await getCurrentUser();
  if (!user) {
    const locale = (await getLocale()) as Locale;
    intlRedirect({ href: "/admin/login", locale });
  }
  return user;
}

export { and, eq };
