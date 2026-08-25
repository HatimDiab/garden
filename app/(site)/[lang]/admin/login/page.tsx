import { getLocale, getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { verifyDummyPassword, verifyPassword } from "@/lib/auth/password";
import {
  checkThrottle,
  clearFailures,
  recordFailure,
  throttleKeys,
} from "@/lib/auth/throttle";
import {
  createSession,
  generateSessionToken,
  getCurrentUser,
  setSessionCookie,
} from "@/lib/auth/session";
import { Bloom } from "@/components/watercolor/Bloom";
import { PasswordInput } from "@/components/admin/PasswordInput";
import { redirect } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";

export async function generateMetadata() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "admin.login" });
  return { title: t("metaTitle") };
}

async function login(formData: FormData) {
  "use server";
  const locale = (await getLocale()) as Locale;
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) {
    redirect({ href: `/admin/login?error=missing`, locale });
  }

  // Throttle before touching argon2: an unthrottled login is both a brute-force
  // hole and a cheap memory-exhaustion DoS, since every attempt costs 19 MiB.
  const keys = await throttleKeys(username);
  const throttled = checkThrottle(keys);
  if (throttled.locked) {
    const mins = Math.max(1, Math.ceil(throttled.retryAfterMs / 60000));
    redirect({ href: `/admin/login?error=locked&mins=${mins}`, locale });
  }

  const user = db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .get();

  // Always pay the full hashing cost, even for an unknown username, so timing
  // cannot be used to enumerate which accounts exist.
  const ok = user
    ? await verifyPassword(user.passwordHash, password)
    : await verifyDummyPassword(password);

  if (!ok) {
    recordFailure(keys);
    redirect({ href: `/admin/login?error=invalid`, locale });
  }

  clearFailures(keys);
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await createSession(token, user!.id);
  await setSessionCookie(token, expiresAt);
  redirect({ href: "/admin", locale });
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ error?: string; mins?: string }>;
}) {
  const { lang } = await params;
  const locale = lang as Locale;
  const { user } = await getCurrentUser();
  if (user) redirect({ href: "/admin", locale });
  const { error, mins } = await searchParams;
  const t = await getTranslations({ locale, namespace: "admin.login" });
  const msg =
    error === "invalid"
      ? t("errorInvalid")
      : error === "missing"
        ? t("errorMissing")
        : error === "locked"
          ? t("errorLocked", { minutes: Math.min(60, Number(mins) || 1) })
          : null;

  return (
    <main className="relative mx-auto flex min-h-[80vh] w-full max-w-md flex-col items-center justify-center px-6">
      <Bloom size={120} />
      <div className="paper mt-6 w-full p-8">
        <h1 className="text-center text-3xl text-moss-deep">{t("heading")}</h1>
        <p className="mt-1 text-center text-sm text-ink-soft">{t("subhead")}</p>
        <form action={login} className="mt-6 space-y-3">
          <label className="block">
            <span className="text-sm text-ink-soft">{t("username")}</span>
            <input
              name="username"
              className="field mt-1"
              autoFocus
              autoComplete="username"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink-soft">{t("password")}</span>
            <PasswordInput
              name="password"
              autoComplete="current-password"
              required
            />
          </label>
          {msg && <p className="text-sm text-rose">{msg}</p>}
          <button className="btn w-full" type="submit">
            {t("submit")}
          </button>
        </form>
      </div>
    </main>
  );
}
