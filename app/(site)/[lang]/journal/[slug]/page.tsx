import { notFound } from "next/navigation";
import { and, eq, desc, asc, gt, lt, or } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db/client";
import { entries, entryTags, tags, images } from "@/lib/db/schema";
import { Divider } from "@/components/watercolor/Divider";
import { Sprig } from "@/components/watercolor/Divider";
import { Link } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import { formatDate } from "@/lib/i18n/date";
import { pickText, pickLocaleSlug } from "@/lib/content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  const locale = lang as Locale;
  const row = db
    .select()
    .from(entries)
    .where(or(eq(entries.slug, slug), eq(entries.slugDe, slug)))
    .get();
  if (!row) return { title: "Entry" };
  return { title: pickText(row, "title", locale).value };
}

export default async function EntryPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  setRequestLocale(lang);
  const locale = lang as Locale;
  const t = await getTranslations({ locale, namespace: "fallback" });

  const row = db
    .select()
    .from(entries)
    .where(
      and(
        or(eq(entries.slug, slug), eq(entries.slugDe, slug)),
        eq(entries.status, "published"),
      ),
    )
    .get();
  if (!row) notFound();

  const title = pickText(row, "title", locale);
  const bodyHtml = pickText(row, "bodyHtml", locale);

  const tagRows = db
    .select()
    .from(entryTags)
    .innerJoin(tags, eq(tags.id, entryTags.tagId))
    .where(eq(entryTags.entryId, row.id))
    .all();

  let hero: string | null = null;
  if (row.heroImageId) {
    const img = db.select().from(images).where(eq(images.id, row.heroImageId)).get();
    if (img) hero = img.filename;
  }

  const publishedAt = row.publishedAt;
  const prev = publishedAt
    ? db
        .select()
        .from(entries)
        .where(
          and(
            eq(entries.status, "published"),
            lt(entries.publishedAt, publishedAt),
          ),
        )
        .orderBy(desc(entries.publishedAt))
        .limit(1)
        .get()
    : undefined;
  const next = publishedAt
    ? db
        .select()
        .from(entries)
        .where(
          and(
            eq(entries.status, "published"),
            gt(entries.publishedAt, publishedAt),
          ),
        )
        .orderBy(asc(entries.publishedAt))
        .limit(1)
        .get()
    : undefined;

  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-12">
      <header className="text-center">
        <Sprig className="mx-auto" />
        <p className="mt-3 text-sm uppercase tracking-[0.25em] text-moss">
          {publishedAt && formatDate(publishedAt, "EEEE · PPP", locale)}
        </p>
        <h1 className="mt-3 font-display text-5xl leading-tight text-ink">
          {title.value}
        </h1>
        {title.fellBack && (
          <p className="mt-3">
            <span className="chip bg-sage/30 text-moss-deep">
              {t("badge")}
            </span>
          </p>
        )}
        {tagRows.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {tagRows.map((tr) => {
              const tagName = pickText(tr.tags, "name", locale).value;
              return (
                <span key={tr.tags.slug} className="chip">
                  ✿ {tagName}
                </span>
              );
            })}
          </div>
        )}
      </header>

      {hero && (
        <img
          src={`/uploads/${hero}`}
          alt=""
          className="mt-8 w-full rounded-xl object-cover shadow-lg"
        />
      )}

      <Divider />

      <div
        className="story-prose drop-cap"
        dangerouslySetInnerHTML={{ __html: bodyHtml.value }}
      />

      <Divider />

      <nav className="flex items-center justify-between text-sm">
        {prev ? (
          <Link
            href={`/journal/${pickLocaleSlug(prev, locale)}`}
            className="link-soft"
          >
            ← {pickText(prev, "title", locale).value}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/journal/${pickLocaleSlug(next, locale)}`}
            className="link-soft"
          >
            {pickText(next, "title", locale).value} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
