import { desc, eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db/client";
import { albums, images } from "@/lib/db/schema";
import { Divider } from "@/components/watercolor/Divider";
import { Link } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import { formatDate } from "@/lib/i18n/date";
import { pickText, pickLocaleSlug } from "@/lib/content";

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  const locale = lang as Locale;
  const t = await getTranslations({ locale, namespace: "gallery" });

  const rows = db.select().from(albums).orderBy(desc(albums.createdAt)).all();
  const covers = new Map<string, string>();
  for (const a of rows) {
    if (!a.coverImageId) continue;
    const img = db.select().from(images).where(eq(images.id, a.coverImageId)).get();
    if (img) covers.set(a.id, img.filename);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((a) => {
          const title = pickText(a, "title", locale).value;
          const description = pickText(a, "description", locale).value;
          const slug = pickLocaleSlug(a, locale);
          const dateStamp = a.occurredOn ?? a.createdAt;
          return (
            <Link
              key={a.id}
              href={`/gallery/${slug}`}
              className="group paper block overflow-hidden transition hover:-translate-y-1"
            >
              {covers.has(a.id) ? (
                <img
                  src={`/uploads/${covers.get(a.id)}`}
                  alt=""
                  className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="h-56 w-full bg-gradient-to-br from-petal/40 to-sage/30" />
              )}
              <div className="p-5">
                <p className="text-xs uppercase tracking-widest text-moss">
                  {formatDate(dateStamp, "PPP", locale)}
                </p>
                <h3 className="mt-1 font-display text-2xl text-ink group-hover:text-moss-deep">
                  {title}
                </h3>
                {description && (
                  <p className="mt-2 line-clamp-2 text-sm text-ink-soft">
                    {description}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
