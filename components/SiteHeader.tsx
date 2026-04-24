import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import { Sprig } from "@/components/watercolor/Divider";
import { LocaleSwitch } from "@/components/i18n/LocaleSwitch";

export async function SiteHeader({
  title,
  locale,
}: {
  title: string;
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: "nav" });
  const links = [
    { href: "/", label: t("home") },
    { href: "/journal", label: t("journal") },
    { href: "/gallery", label: t("gallery") },
    { href: "/events", label: t("events") },
    { href: "/about", label: t("about") },
  ];
  return (
    <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 pt-8">
      <Link href="/" className="group flex items-center gap-3">
        <img
          src="/art/bloom.svg"
          alt=""
          aria-hidden="true"
          className="h-10 w-10 drift"
        />
        <div className="leading-tight">
          <span className="block font-display text-2xl text-moss-deep">
            {title}
          </span>
          <span className="block text-xs uppercase tracking-[0.2em] text-ink-soft">
            {t("subtitle")}
          </span>
        </div>
      </Link>
      <div className="flex items-center gap-3">
        <nav className="flex items-center gap-1 rounded-full bg-paper/70 px-2 py-1 text-sm backdrop-blur">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-1.5 text-ink-soft transition hover:bg-sage/30 hover:text-moss-deep"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <LocaleSwitch current={locale} />
      </div>
    </header>
  );
}

export function SiteFooter({
  tagline,
  tended,
}: {
  tagline: string;
  tended: string;
}) {
  return (
    <footer className="mx-auto mt-24 flex w-full max-w-6xl flex-col items-center gap-3 px-6 pb-10 text-center text-sm text-ink-soft">
      <Sprig />
      <p>{tagline}</p>
      <p className="text-xs">
        {tended} {new Date().getFullYear()}
      </p>
    </footer>
  );
}
