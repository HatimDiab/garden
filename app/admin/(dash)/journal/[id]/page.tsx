import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { entries, entryTags, tags } from "@/lib/db/schema";
import { EntryForm } from "@/components/editor/EntryForm";
import { deleteEntry, saveEntry } from "../actions";

export const metadata = { title: "Edit entry" };

export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = db.select().from(entries).where(eq(entries.id, id)).get();
  if (!row) notFound();

  const tagRows = db
    .select({ name: tags.name })
    .from(entryTags)
    .innerJoin(tags, eq(tags.id, entryTags.tagId))
    .where(eq(entryTags.entryId, id))
    .all();
  const tagString = tagRows.map((t) => t.name).join(", ");

  return (
    <div>
      <h1 className="font-display text-3xl text-moss-deep">Edit entry</h1>
      <div className="mt-6">
        <EntryForm
          entry={{
            id: row.id,
            title: row.title,
            titleDe: row.titleDe,
            slug: row.slug,
            slugDe: row.slugDe,
            excerpt: row.excerpt,
            excerptDe: row.excerptDe,
            bodyJson: row.bodyJson,
            bodyJsonDe: row.bodyJsonDe,
            status: row.status,
            tags: tagString,
            publishedAt: row.publishedAt ? row.publishedAt.getTime() : null,
          }}
          saveAction={saveEntry}
          deleteAction={deleteEntry}
        />
      </div>
    </div>
  );
}
