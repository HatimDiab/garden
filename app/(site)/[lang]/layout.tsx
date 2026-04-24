import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { routing, type Locale } from "@/lib/i18n/routing";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return routing.locales.map((lang) => ({ lang }));
}

function getSetting(key: string): string | null {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? null;
}

async function getLocalizedSite(locale: Locale) {
  const t = await getTranslations({ locale, namespace: "site" });
  const suffix = locale === "de" ? "_de" : "";
  const title = getSetting(`site_title${suffix}`) ?? t("title");
  const tagline = getSetting(`site_tagline${suffix}`) ?? t("tagline");
  return { title, tagline };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!routing.locales.includes(lang as Locale)) return {};
  const locale = lang as Locale;
  const { title, tagline } = await getLocalizedSite(locale);
  const alternates: Record<string, string> = {};
  for (const l of routing.locales) alternates[l] = `/${l}`;
  return {
    title: { default: title, template: `%s · ${title}` },
    description: tagline,
    alternates: {
      canonical: `/${locale}`,
      languages: alternates,
    },
  };
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!routing.locales.includes(lang as Locale)) notFound();
  setRequestLocale(lang);

  const locale = lang as Locale;
  const { title, tagline } = await getLocalizedSite(locale);
  const tFooter = await getTranslations({ locale, namespace: "footer" });
  return (
    <>
      <SiteHeader title={title} locale={locale} />
      <main className="flex-1">{children}</main>
      <SiteFooter tagline={tagline} tended={tFooter("tended")} />
    </>
  );
}
