import { getLocale, getTranslations } from "next-intl/server";
import { AlbumForm } from "@/components/admin/AlbumForm";
import { createAlbum } from "../actions";
import type { Locale } from "@/lib/i18n/routing";

export async function generateMetadata() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "admin.gallery.new" });
  return { title: t("metaTitle") };
}

export default async function NewAlbumPage() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "admin.gallery.new" });

  return (
    <div>
      <h1 className="font-display text-3xl text-moss-deep">{t("heading")}</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {t("subhead")}
      </p>
      <div className="mt-6">
        <AlbumForm mode="create" onCreate={createAlbum} />
      </div>
    </div>
  );
}
