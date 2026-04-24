import { desc, eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db/client";
import { entries, images } from "@/lib/db/schema";
import { Divider } from "@/components/watercolor/Divider";
import { CornerVine } from "@/components/watercolor/Bloom";
import { Link } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import { formatDate } from "@/lib/i18n/date";
import { pickText, pickLocaleSlug } from "@/lib/content";

export default async function JournalPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  const locale = lang as Locale;
  const t = await getTranslations({ locale, namespace: "journal" });

  const rows = db
    .select()
    .from(entries)
    .where(eq(entries.status, "published"))
    .orderBy(desc(entries.publishedAt))
    .all();

  const heroIds = rows.map((r) => r.heroImageId).filter(Boolean) as string[];
  const heroMap = new Map<string, string>();
  for (const id of heroIds) {
    const img = db.select().from(images).where(eq(images.id, id)).get();
    if (img) heroMap.set(id, img.filename);
  }

  const grouped = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!r.publishedAt) continue;
    const key = formatDate(r.publishedAt, "MMMM yyyy", locale);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }

  return (
    <div className="relative mx-auto w-full max-w-4xl px-6 py-12">
      <CornerVine position="tr" />
      <header className="text-center">
        <p className="text-sm uppercase tracking-[0.25em] text-moss">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 font-display text-5xl text-ink">{t("title")}</h1>
      </header>
      <Divider />

      {rows.length === 0 && (
        <p className="text-center text-ink-soft">{t("empty")}</p>
      )}

      <div className="space-y-12">
        {Array.from(grouped.entries()).map(([month, items]) => (
          <section key={month}>
            <h2 className="font-display text-2xl text-moss-deep">
              <span className="mr-3 align-middle text-rose">✿</span>
              {month}
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {items.map((e) => {
                const hero = e.heroImageId ? heroMap.get(e.heroImageId) : null;
                const title = pickText(e, "title", locale).value;
                const excerpt = pickText(e, "excerpt", locale).value;
                const slug = pickLocaleSlug(e, locale);
                return (
                  <li key={e.id}>
                    <Link
                      href={`/journal/${slug}`}
                      className="group paper block h-full overflow-hidden transition hover:-translate-y-1"
                    >
                      {hero && (
                        <img
                          src={`/uploads/${hero}`}
                          alt=""
                          className="h-40 w-full object-cover"
                        />
                      )}
                      <div className="p-5">
                        <p className="text-xs uppercase tracking-widest text-moss">
                          {e.publishedAt &&
                            formatDate(e.publishedAt, "PPP", locale)}
                        </p>
                        <h3 className="mt-1 font-display text-2xl text-ink group-hover:text-moss-deep">
                          {title}
                        </h3>
                        {excerpt && (
                          <p className="mt-2 text-sm text-ink-soft">
                            {excerpt}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
