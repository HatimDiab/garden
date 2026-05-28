import { desc } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db/client";
import { entries, albums, events } from "@/lib/db/schema";
import { format } from "date-fns";
import { Link } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";

export async function generateMetadata() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "admin.overview" });
  return { title: t("metaTitle") };
}

export default async function AdminHome() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "admin.overview" });

  const recentEntries = db
    .select({
      id: entries.id,
      title: entries.title,
      status: entries.status,
      updatedAt: entries.updatedAt,
      slug: entries.slug,
    })
    .from(entries)
    .orderBy(desc(entries.updatedAt))
    .limit(6)
    .all();

  const recentAlbums = db
    .select({ id: albums.id, title: albums.title, slug: albums.slug, createdAt: albums.createdAt })
    .from(albums)
    .orderBy(desc(albums.createdAt))
    .limit(4)
    .all();

  const upcoming = db
    .select({ id: events.id, title: events.title, startsAt: events.startsAt })
    .from(events)
    .orderBy(desc(events.startsAt))
    .limit(4)
    .all();

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <section className="paper p-6 md:col-span-3">
        <h2 className="text-2xl text-moss-deep">{t("quickPlant")}</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {t("quickPlantSub")}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/admin/journal/new" className="btn">
            {t("newEntry")}
          </Link>
          <Link href="/admin/gallery/new" className="btn">
            {t("newAlbum")}
          </Link>
          <Link href="/admin/events/new" className="btn">
            {t("newEvent")}
          </Link>
        </div>
      </section>

      <section className="paper p-6 md:col-span-2">
        <h3 className="text-xl text-moss-deep">{t("recentEntries")}</h3>
        <ul className="mt-3 divide-y divide-sage/20">
          {recentEntries.length === 0 && (
            <li className="py-6 text-ink-soft">{t("recentEntriesEmpty")}</li>
          )}
          {recentEntries.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <Link
                  href={`/admin/journal/${e.id}`}
                  className="font-display text-lg hover:text-moss-deep"
                >
                  {e.title || t("untitled")}
                </Link>
                <div className="text-xs text-ink-soft">
                  {format(e.updatedAt, "PPP")} ·{" "}
                  <span className={e.status === "published" ? "text-moss" : "text-honey"}>
                    {e.status === "published" ? t("statusPublished") : t("statusDraft")}
                  </span>
                </div>
              </div>
              {e.status === "published" && (
                <Link href={`/journal/${e.slug}`} className="link-soft text-sm">
                  {t("view")}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="paper p-6">
        <h3 className="text-xl text-moss-deep">{t("albums")}</h3>
        <ul className="mt-3 space-y-2">
          {recentAlbums.length === 0 && (
            <li className="text-ink-soft">{t("albumsEmpty")}</li>
          )}
          {recentAlbums.map((a) => (
            <li key={a.id}>
              <Link href={`/admin/gallery/${a.id}`} className="link-soft">
                {a.title}
              </Link>
            </li>
          ))}
        </ul>

        <h3 className="mt-6 text-xl text-moss-deep">{t("upcomingEvents")}</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {upcoming.length === 0 && <li className="text-ink-soft">{t("upcomingEventsEmpty")}</li>}
          {upcoming.map((ev) => (
            <li key={ev.id}>
              <span className="chip mr-2">{format(ev.startsAt, "MMM d")}</span>
              {ev.title}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
