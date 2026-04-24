import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { entries } from "@/lib/db/schema";
import { format } from "date-fns";

export const metadata = { title: "Journal" };

export default async function AdminJournalList() {
  const rows = db
    .select({
      id: entries.id,
      title: entries.title,
      slug: entries.slug,
      status: entries.status,
      publishedAt: entries.publishedAt,
      updatedAt: entries.updatedAt,
    })
    .from(entries)
    .orderBy(desc(entries.updatedAt))
    .all();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-moss-deep">Journal</h1>
        <Link href="/admin/journal/new" className="btn">
          ✿ New entry
        </Link>
      </div>

      <div className="paper mt-6 divide-y divide-sage/20">
        {rows.length === 0 ? (
          <p className="p-6 text-ink-soft">
            No entries yet — write the first page.
          </p>
        ) : (
          rows.map((r) => (
            <Link
              key={r.id}
              href={`/admin/journal/${r.id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-sage/10"
            >
              <div>
                <div className="font-display text-xl text-ink">
                  {r.title || "Untitled"}
                </div>
                <div className="mt-1 flex gap-2 text-xs text-ink-soft">
                  <span>updated {format(r.updatedAt, "PPP")}</span>
                  <span>·</span>
                  <span
                    className={
                      r.status === "published" ? "text-moss" : "text-honey"
                    }
                  >
                    {r.status}
                  </span>
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
