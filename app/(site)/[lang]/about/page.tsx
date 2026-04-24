import { eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";
import { Divider } from "@/components/watercolor/Divider";
import { Bloom } from "@/components/watercolor/Bloom";
import type { Locale } from "@/lib/i18n/routing";

function getSetting(key: string): string | null {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? null;
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  const locale = lang as Locale;
  const t = await getTranslations({ locale, namespace: "about" });

  const aboutKey = locale === "de" ? "about_text_de" : "about_text";
  const about = getSetting(aboutKey) ?? t("defaultBody");

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16">
      <div className="flex flex-col items-center text-center">
        <Bloom size={180} />
        <h1 className="mt-6 font-display text-5xl text-ink">{t("title")}</h1>
      </div>
      <Divider />
      <div className="story-prose drop-cap">
        {about.split("\n\n").map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </div>
  );
}
