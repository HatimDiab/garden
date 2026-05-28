import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { albums, entries, events } from "@/lib/db/schema";
import { EventForm } from "@/components/admin/EventForm";
import { deleteEvent, updateEvent } from "../actions";

export const metadata = { title: "Edit event" };

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = db.select().from(events).where(eq(events.id, id)).get();
  if (!row) notFound();

  const albumOpts = db
    .select({ id: albums.id, title: albums.title })
    .from(albums)
    .orderBy(desc(albums.createdAt))
    .all();
  const entryOpts = db
    .select({ id: entries.id, title: entries.title })
    .from(entries)
    .orderBy(desc(entries.updatedAt))
    .all();

  return (
    <div>
      <h1 className="font-display text-3xl text-moss-deep">Edit event</h1>
      <div className="mt-6">
        <EventForm
          mode="edit"
          id={id}
          albums={albumOpts}
          entries={entryOpts}
          initial={{
            title: row.title,
            titleDe: row.titleDe ?? "",
            description: row.description,
            descriptionDe: row.descriptionDe ?? "",
            startsAt: toLocalInput(row.startsAt),
            endsAt: row.endsAt ? toLocalInput(row.endsAt) : null,
            albumId: row.albumId,
            entryId: row.entryId,
          }}
          onUpdate={updateEvent}
          onDelete={deleteEvent}
        />
      </div>
    </div>
  );
}
