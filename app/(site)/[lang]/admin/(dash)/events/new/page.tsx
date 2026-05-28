import { desc } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db/client";
import { albums, entries } from "@/lib/db/schema";
import { EventForm } from "@/components/admin/EventForm";
import { createEvent } from "../actions";
import type { Locale } from "@/lib/i18n/routing";

export async function generateMetadata() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "admin.events.new" });
  return { title: t("metaTitle") };
}

export default async function NewEventPage() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "admin.events.new" });

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
      <h1 className="font-display text-3xl text-moss-deep">{t("heading")}</h1>
      <div className="mt-6">
        <EventForm
          mode="create"
          albums={albumOpts}
          entries={entryOpts}
          onCreate={createEvent}
        />
      </div>
    </div>
  );
}
