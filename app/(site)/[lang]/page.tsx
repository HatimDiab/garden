import { desc, eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db/client";
import { albums, entries, settings, images } from "@/lib/db/schema";
import { Divider } from "@/components/watercolor/Divider";
import { Bloom, CornerVine } from "@/components/watercolor/Bloom";
import { FadeIn } from "@/components/FadeIn";
import { Link } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import { formatDate } from "@/lib/i18n/date";
import { pickText, pickLocaleSlug } from "@/lib/content";

function getSetting(key: string): string | null {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? null;
}

export default async function Home({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  const locale = lang as Locale;
  const t = await getTranslations({ locale, namespace: "home" });
  const tSite = await getTranslations({ locale, namespace: "site" });

  const suffix = locale === "de" ? "_de" : "";
  const siteTitle = getSetting(`site_title${suffix}`) ?? tSite("title");
  const tagline = getSetting(`site_tagline${suffix}`) ?? tSite("tagline");
  const season = getSetting("active_season") ?? "Spring";

  const latest = db
    .select()
    .from(entries)
    .where(eq(entries.status, "published"))
    .orderBy(desc(entries.publishedAt))
    .limit(3)
    .all();

  const newestAlbum = db
    .select()
    .from(albums)
    .orderBy(desc(albums.createdAt))
    .limit(1)
    .get();

  let coverFilename: string | null = null;
  if (newestAlbum?.coverImageId) {
    const cover = db
      .select()
      .from(images)
      .where(eq(images.id, newestAlbum.coverImageId))
      .get();
    if (cover) coverFilename = cover.filename;
  }

  return (
    <div className="relative">
      <CornerVine position="tl" />
      <CornerVine position="br" />

      <section className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-6 pt-16 md:grid-cols-5 md:pt-24">
        <div className="md:col-span-3">
          <FadeIn>
            <p className="mb-3 inline-flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-moss">
              <span className="h-px w-8 bg-moss/60" />
              {season} · {new Date().getFullYear()}
            </p>
            <h1 className="font-display text-5xl leading-[1.05] text-ink md:text-7xl">
              {siteTitle}
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-soft">{tagline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/journal" className="btn">
                {t("openDiary")}
              </Link>
              <Link href="/gallery" className="btn-ghost btn">
                {t("wanderGallery")}
              </Link>
            </div>
          </FadeIn>
        </div>
        <FadeIn delay={0.2} className="relative md:col-span-2">
          <Bloom size={380} className="mx-auto" />
        </FadeIn>
      </section>

      <Divider />

      <section className="mx-auto w-full max-w-6xl px-6">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-3xl text-moss-deep">
            {t("latestPages")}
          </h2>
          <Link href="/journal" className="link-soft text-sm">
            {t("allEntries")}
          </Link>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {latest.length === 0 && (
            <p className="text-ink-soft md:col-span-3">{t("nothingWritten")}</p>
          )}
          {latest.map((e, i) => {
            const title = pickText(e, "title", locale).value;
            const excerpt = pickText(e, "excerpt", locale).value;
            const slug = pickLocaleSlug(e, locale);
            return (
              <FadeIn key={e.id} delay={i * 0.1}>
                <Link
                  href={`/journal/${slug}`}
                  className="group paper block h-full p-6 transition hover:-translate-y-1"
                >
                  <p className="text-xs uppercase tracking-widest text-moss">
                    {e.publishedAt
                      ? formatDate(e.publishedAt, "PPP", locale)
                      : ""}
                  </p>
                  <h3 className="mt-2 font-display text-2xl text-ink group-hover:text-moss-deep">
                    {title}
                  </h3>
                  {excerpt && (
                    <p className="mt-3 text-sm text-ink-soft">{excerpt}</p>
                  )}
                </Link>
              </FadeIn>
            );
          })}
        </div>
      </section>

      <Divider />

      {newestAlbum && (() => {
        const title = pickText(newestAlbum, "title", locale).value;
        const description = pickText(newestAlbum, "description", locale).value;
        const slug = pickLocaleSlug(newestAlbum, locale);
        return (
          <section className="mx-auto w-full max-w-6xl px-6">
            <div className="paper grid items-center gap-6 p-6 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-widest text-moss">
                  {t("newestAlbum")}
                </p>
                <h3 className="mt-2 font-display text-3xl text-ink">{title}</h3>
                {description && (
                  <p className="mt-3 text-ink-soft">{description}</p>
                )}
                <Link
                  href={`/gallery/${slug}`}
                  className="mt-4 inline-block link-soft"
                >
                  {t("wanderPictures")}
                </Link>
              </div>
              {coverFilename && (
                <img
                  src={`/uploads/${coverFilename}`}
                  alt={title}
                  className="h-64 w-full rounded-xl object-cover"
                />
              )}
            </div>
          </section>
        );
      })()}
    </div>
  );
}
