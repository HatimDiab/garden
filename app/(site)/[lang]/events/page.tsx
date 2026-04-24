import { asc, eq, gte } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db/client";
import { albums, entries, events } from "@/lib/db/schema";
import { Divider } from "@/components/watercolor/Divider";
import { CalendarMonth } from "@/components/events/CalendarMonth";
import { Link } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import { formatDate } from "@/lib/i18n/date";
import { pickText, pickLocaleSlug } from "@/lib/content";

export default async function EventsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  const locale = lang as Locale;
  const t = await getTranslations({ locale, namespace: "events" });

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const all = db.select().from(events).orderBy(asc(events.startsAt)).all();
  const upcoming = db
    .select()
    .from(events)
    .where(gte(events.startsAt, now))
    .orderBy(asc(events.startsAt))
    .limit(12)
    .all();

  const albumRows = new Map<string, typeof albums.$inferSelect>();
  const entryRows = new Map<string, typeof entries.$inferSelect>();
  for (const ev of upcoming) {
    if (ev.albumId && !albumRows.has(ev.albumId)) {
      const a = db.select().from(albums).where(eq(albums.id, ev.albumId)).get();
      if (a) albumRows.set(a.id, a);
    }
    if (ev.entryId && !entryRows.has(ev.entryId)) {
      const e = db.select().from(entries).where(eq(entries.id, ev.entryId)).get();
      if (e) entryRows.set(e.id, e);
    }
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
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <CalendarMonth
          locale={locale}
          events={all.map((e) => ({
            id: e.id,
            title: pickText(e, "title", locale).value,
            startsAt: e.startsAt.getTime(),
          }))}
        />
        <aside>
          <h2 className="font-display text-2xl text-moss-deep">
            {t("upcoming")}
          </h2>
          {upcoming.length === 0 ? (
            <p className="mt-3 text-ink-soft">{t("noUpcoming")}</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {upcoming.map((ev) => {
                const album = ev.albumId ? albumRows.get(ev.albumId) : null;
                const entry = ev.entryId ? entryRows.get(ev.entryId) : null;
                const title = pickText(ev, "title", locale).value;
                const description = pickText(ev, "description", locale).value;
                return (
                  <li key={ev.id} className="paper p-4">
                    <p className="text-xs uppercase tracking-widest text-moss">
                      {formatDate(ev.startsAt, "EEE, PPP · p", locale)}
                    </p>
                    <h3 className="mt-1 font-display text-xl text-ink">
                      {title}
                    </h3>
                    {description && (
                      <p className="mt-1 text-sm text-ink-soft">
                        {description}
                      </p>
                    )}
                    <div className="mt-2 flex gap-3 text-xs">
                      {album && (
                        <Link
                          href={`/gallery/${pickLocaleSlug(album, locale)}`}
                          className="link-soft"
                        >
                          album →
                        </Link>
                      )}
                      {entry && (
                        <Link
                          href={`/journal/${pickLocaleSlug(entry, locale)}`}
                          className="link-soft"
                        >
                          entry →
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
