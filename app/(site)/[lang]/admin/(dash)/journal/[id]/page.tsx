import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db/client";
import { entries, entryTags, tags } from "@/lib/db/schema";
import { EntryForm } from "@/components/editor/EntryForm";
import { deleteEntry, saveEntry } from "../actions";
import type { Locale } from "@/lib/i18n/routing";

export async function generateMetadata() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "admin.journal.edit" });
  return { title: t("metaTitle") };
}

export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "admin.journal.edit" });

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
      <h1 className="font-display text-3xl text-moss-deep">{t("heading")}</h1>
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
