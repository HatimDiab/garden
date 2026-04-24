import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { albums, images } from "@/lib/db/schema";
import { format } from "date-fns";

export const metadata = { title: "Gallery" };

export default async function AdminGalleryList() {
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
        <h1 className="font-display text-3xl text-moss-deep">Gallery</h1>
        <Link href="/admin/gallery/new" className="btn">
          ❁ New album
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="paper mt-6 p-6 text-ink-soft">
          No albums yet — gather the first bouquet.
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
