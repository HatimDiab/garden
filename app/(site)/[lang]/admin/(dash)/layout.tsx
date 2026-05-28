import { getLocale, getTranslations } from "next-intl/server";
import {
  clearSessionCookie,
  getCurrentUser,
  invalidateSession,
} from "@/lib/auth/session";
import { Sprig } from "@/components/watercolor/Divider";
import { Link, redirect } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";

async function logout() {
  "use server";
  const { session } = await getCurrentUser();
  if (session) await invalidateSession(session.id);
  await clearSessionCookie();
  const locale = (await getLocale()) as Locale;
  redirect({ href: "/admin/login", locale });
}

export default async function DashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getCurrentUser();
  const locale = (await getLocale()) as Locale;
  if (!user) {
    redirect({ href: "/admin/login", locale });
  }
  const t = await getTranslations({ locale, namespace: "admin" });

  const tabs = [
    { href: "/admin", label: t("nav.overview") },
    { href: "/admin/journal", label: t("nav.journal") },
    { href: "/admin/gallery", label: t("nav.gallery") },
    { href: "/admin/events", label: t("nav.events") },
    { href: "/admin/settings", label: t("nav.settings") },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/admin" className="flex items-center gap-3">
          <Sprig />
          <span className="font-display text-2xl text-moss-deep">
            {t("heading")}
          </span>
        </Link>
        <div className="flex items-center gap-3 text-sm text-ink-soft">
          <span>{t("hello", { name: user!.username })}</span>
          <Link href="/" className="link-soft">
            {t("viewSite")}
          </Link>
          <form action={logout}>
            <button className="btn-ghost btn text-sm">{t("signOut")}</button>
          </form>
        </div>
      </header>
      <nav className="mt-6 flex flex-wrap gap-2 border-b border-sage/30 pb-3 text-sm">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="rounded-full px-3 py-1.5 text-ink-soft transition hover:bg-sage/20 hover:text-moss-deep"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <div className="mt-8">{children}</div>
    </div>
  );
}
