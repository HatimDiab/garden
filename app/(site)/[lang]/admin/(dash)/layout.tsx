import { getLocale } from "next-intl/server";
import Link from "next/link";
import {
  clearSessionCookie,
  getCurrentUser,
  invalidateSession,
} from "@/lib/auth/session";
import { Sprig } from "@/components/watercolor/Divider";
import { redirect } from "@/lib/i18n/navigation";
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
  if (!user) {
    const locale = (await getLocale()) as Locale;
    redirect({ href: "/admin/login", locale });
  }

  const tabs = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/journal", label: "Journal" },
    { href: "/admin/gallery", label: "Gallery" },
    { href: "/admin/events", label: "Events" },
    { href: "/admin/settings", label: "Settings" },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/admin" className="flex items-center gap-3">
          <Sprig />
          <span className="font-display text-2xl text-moss-deep">Admin</span>
        </Link>
        <div className="flex items-center gap-3 text-sm text-ink-soft">
          <span>Hello, {user!.username}</span>
          <Link href="/" className="link-soft">
            View site →
          </Link>
          <form action={logout}>
            <button className="btn-ghost btn text-sm">Sign out</button>
          </form>
        </div>
      </header>
      <nav className="mt-6 flex flex-wrap gap-2 border-b border-sage/30 pb-3 text-sm">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-full px-3 py-1.5 text-ink-soft transition hover:bg-sage/20 hover:text-moss-deep"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="mt-8">{children}</div>
    </div>
  );
}
