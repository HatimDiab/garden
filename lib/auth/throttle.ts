import { headers } from "next/headers";
import { eq, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { loginAttempts } from "@/lib/db/schema";

const SECOND = 1000;
const MINUTE = 60 * SECOND;

/** Failures allowed before locking begins. */
const FREE_ATTEMPTS = 5;
/** First lock duration; doubles per subsequent failure. */
const BASE_LOCK = 30 * SECOND;
/** Ceiling on the exponential backoff. */
const MAX_LOCK = 15 * MINUTE;
/** A scope with no failures for this long is forgiven. */
const DECAY = 60 * MINUTE;

export type ThrottleState = { locked: boolean; retryAfterMs: number };

function lockFor(failures: number): number {
  const over = failures - FREE_ATTEMPTS;
  if (over < 0) return 0;
  return Math.min(BASE_LOCK * 2 ** over, MAX_LOCK);
}

/**
 * Client IP as seen through the reverse proxy. Only the left-most hop of
 * x-forwarded-for is meaningful, and it is attacker-controlled when the app is
 * reached directly — so this is a throttling hint, never an authorization input.
 */
async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0].trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || "unknown";
}

export async function throttleKeys(username: string): Promise<string[]> {
  return [`user:${username.toLowerCase()}`, `ip:${await clientIp()}`];
}

/** Returns the strictest active lock across the given scopes. */
export function checkThrottle(keys: string[]): ThrottleState {
  if (keys.length === 0) return { locked: false, retryAfterMs: 0 };
  const now = Date.now();
  const rows = db
    .select()
    .from(loginAttempts)
    .where(inArray(loginAttempts.key, keys))
    .all();

  let retryAfterMs = 0;
  for (const row of rows) {
    const until = row.lockedUntil?.getTime() ?? 0;
    if (until > now) retryAfterMs = Math.max(retryAfterMs, until - now);
  }
  return { locked: retryAfterMs > 0, retryAfterMs };
}

export function recordFailure(keys: string[]): void {
  const now = new Date();
  for (const key of keys) {
    const row = db
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.key, key))
      .get();

    // Forgive a scope that has been quiet long enough, so an honest typo
    // months ago never counts toward today's lockout.
    const stale =
      row && now.getTime() - row.lastFailureAt.getTime() > DECAY;
    const failures = (stale || !row ? 0 : row.failures) + 1;
    const lock = lockFor(failures);
    const lockedUntil = lock > 0 ? new Date(now.getTime() + lock) : null;

    if (row) {
      db.update(loginAttempts)
        .set({ failures, lastFailureAt: now, lockedUntil })
        .where(eq(loginAttempts.key, key))
        .run();
    } else {
      db.insert(loginAttempts)
        .values({ key, failures, lastFailureAt: now, lockedUntil })
        .run();
    }
  }
}

export function clearFailures(keys: string[]): void {
  if (keys.length === 0) return;
  db.delete(loginAttempts).where(inArray(loginAttempts.key, keys)).run();
}

/** Drop rows whose last failure is long past. Cheap; safe to call on boot. */
export function pruneThrottle(): number {
  const cutoff = new Date(Date.now() - DECAY);
  return db
    .delete(loginAttempts)
    .where(lt(loginAttempts.lastFailureAt, cutoff))
    .run().changes;
}
