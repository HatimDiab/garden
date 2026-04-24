import { notFound } from "next/navigation";
import { asc, eq, or } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db/client";
import { albums, images } from "@/lib/db/schema";
import { Divider, Sprig } from "@/components/watercolor/Divider";
import { LightboxGallery } from "@/components/gallery/Lightbox";
import { Link } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import { formatDate } from "@/lib/i18n/date";
import { pickText } from "@/lib/content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  const locale = lang as Locale;
  const row = db
    .select()
    .from(albums)
    .where(or(eq(albums.slug, slug), eq(albums.slugDe, slug)))
    .get();
  if (!row) return { title: "Album" };
  return { title: pickText(row, "title", locale).value };
}

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  setRequestLocale(lang);
  const locale = lang as Locale;
  const t = await getTranslations({ locale, namespace: "gallery" });

  const album = db
    .select()
    .from(albums)
    .where(or(eq(albums.slug, slug), eq(albums.slugDe, slug)))
    .get();
  if (!album) notFound();

  const title = pickText(album, "title", locale).value;
  const description = pickText(album, "description", locale).value;

  const rawPics = db
    .select()
    .from(images)
    .where(eq(images.albumId, album.id))
    .orderBy(asc(images.order), asc(images.createdAt))
    .all();

  const pics = rawPics.map((p) => ({
    id: p.id,
    filename: p.filename,
    caption: pickText(p, "caption", locale).value || null,
    width: p.width,
    height: p.height,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <Link href="/gallery" className="link-soft text-sm">
        {t("backToGallery")}
      </Link>
      <header className="mt-4 text-center">
        <Sprig className="mx-auto" />
        <p className="mt-3 text-sm uppercase tracking-[0.25em] text-moss">
          {album.occurredOn
            ? formatDate(album.occurredOn, "PPP", locale)
            : formatDate(album.createdAt, "MMMM yyyy", locale)}
        </p>
        <h1 className="mt-2 font-display text-5xl text-ink">{title}</h1>
        {description && (
          <p className="mx-auto mt-3 max-w-2xl text-ink-soft">{description}</p>
        )}
      </header>
      <Divider />
      {pics.length === 0 ? (
        <p className="text-center text-ink-soft">{t("albumEmpty")}</p>
      ) : (
        <LightboxGallery images={pics} />
      )}
    </div>
  );
}
