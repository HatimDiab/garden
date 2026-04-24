import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { events } from "@/lib/db/schema";
import { format } from "date-fns";

export const metadata = { title: "Events" };

export default async function AdminEventsList() {
  const rows = db
    .select()
    .from(events)
    .orderBy(desc(events.startsAt))
    .all();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-moss-deep">Events</h1>
        <Link href="/admin/events/new" className="btn">
          ☀ New event
        </Link>
      </div>

      <div className="paper mt-6 divide-y divide-sage/20">
        {rows.length === 0 ? (
          <p className="p-6 text-ink-soft">No events yet.</p>
        ) : (
          rows.map((e) => (
            <Link
              key={e.id}
              href={`/admin/events/${e.id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-sage/10"
            >
              <div>
                <div className="font-display text-xl text-ink">{e.title}</div>
                <div className="mt-1 text-xs text-ink-soft">
                  {format(e.startsAt, "PPP p")}
                </div>
              </div>
              <span className="text-ink-soft">→</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
