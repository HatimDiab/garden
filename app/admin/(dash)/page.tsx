import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { entries, albums, events } from "@/lib/db/schema";
import { format } from "date-fns";

export const metadata = { title: "Overview" };

export default async function AdminHome() {
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
        <h2 className="text-2xl text-moss-deep">Quick plant</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Start something new.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/admin/journal/new" className="btn">
            ✿ New journal entry
          </Link>
          <Link href="/admin/gallery/new" className="btn">
            ❁ New album
          </Link>
          <Link href="/admin/events/new" className="btn">
            ☀ New event
          </Link>
        </div>
      </section>

      <section className="paper p-6 md:col-span-2">
        <h3 className="text-xl text-moss-deep">Recent journal entries</h3>
        <ul className="mt-3 divide-y divide-sage/20">
          {recentEntries.length === 0 && (
            <li className="py-6 text-ink-soft">No entries yet — start the first page.</li>
          )}
          {recentEntries.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <Link
                  href={`/admin/journal/${e.id}`}
                  className="font-display text-lg hover:text-moss-deep"
                >
                  {e.title || "Untitled"}
                </Link>
                <div className="text-xs text-ink-soft">
                  {format(e.updatedAt, "PPP")} ·{" "}
                  <span className={e.status === "published" ? "text-moss" : "text-honey"}>
                    {e.status}
                  </span>
                </div>
              </div>
              {e.status === "published" && (
                <Link href={`/journal/${e.slug}`} className="link-soft text-sm">
                  view →
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="paper p-6">
        <h3 className="text-xl text-moss-deep">Albums</h3>
        <ul className="mt-3 space-y-2">
          {recentAlbums.length === 0 && (
            <li className="text-ink-soft">No albums yet.</li>
          )}
          {recentAlbums.map((a) => (
            <li key={a.id}>
              <Link href={`/admin/gallery/${a.id}`} className="link-soft">
                {a.title}
              </Link>
            </li>
          ))}
        </ul>

        <h3 className="mt-6 text-xl text-moss-deep">Upcoming events</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {upcoming.length === 0 && <li className="text-ink-soft">Nothing scheduled.</li>}
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
