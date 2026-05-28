import { desc, eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db/client";
import { albums, images } from "@/lib/db/schema";
import { format } from "date-fns";
import { Link } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";

export async function generateMetadata() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "admin.gallery.list" });
  return { title: t("metaTitle") };
}

export default async function AdminGalleryList() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "admin.gallery.list" });

  const rows = db
    .select()
    .from(albums)
    .orderBy(desc(albums.createdAt))
    .all();
  const covers = new Map<string, string>();
  for (const a of rows) {
    if (!a.coverImageId) continue;
    const img = db.select().from(images).where(eq(images.id, a.coverImageId)).get();
    if (img) covers.set(a.id, img.filename);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-moss-deep">{t("heading")}</h1>
        <Link href="/admin/gallery/new" className="btn">
          {t("newButton")}
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="paper mt-6 p-6 text-ink-soft">
          {t("empty")}
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((a) => (
            <Link
              key={a.id}
              href={`/admin/gallery/${a.id}`}
              className="paper group overflow-hidden transition hover:-translate-y-1"
            >
              {covers.has(a.id) ? (
                <img
                  src={`/uploads/${covers.get(a.id)}`}
                  alt=""
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="h-40 w-full bg-gradient-to-br from-petal/40 to-sage/30" />
              )}
              <div className="p-4">
                <div className="font-display text-xl text-ink group-hover:text-moss-deep">
                  {a.title}
                </div>
                <div className="text-xs text-ink-soft">
                  {a.occurredOn
                    ? format(a.occurredOn, "PPP")
                    : format(a.createdAt, "PPP")}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
