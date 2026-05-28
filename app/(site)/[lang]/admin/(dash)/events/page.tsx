import { desc } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db/client";
import { events } from "@/lib/db/schema";
import { format } from "date-fns";
import { Link } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";

export async function generateMetadata() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "admin.events.list" });
  return { title: t("metaTitle") };
}

export default async function AdminEventsList() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "admin.events.list" });

  const rows = db
    .select()
    .from(events)
    .orderBy(desc(events.startsAt))
    .all();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-moss-deep">{t("heading")}</h1>
        <Link href="/admin/events/new" className="btn">
          {t("newButton")}
        </Link>
      </div>

      <div className="paper mt-6 divide-y divide-sage/20">
        {rows.length === 0 ? (
          <p className="p-6 text-ink-soft">{t("empty")}</p>
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
