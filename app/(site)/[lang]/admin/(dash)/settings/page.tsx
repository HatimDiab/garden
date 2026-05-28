import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { BackupRestore } from "@/components/admin/BackupRestore";
import { changePassword, saveSiteSettings } from "./actions";

export const metadata = { title: "Settings" };

function getSetting(key: string, fallback: string): string {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? fallback;
}

export default function SettingsPage() {
  const initial = {
    siteTitle: getSetting("site_title", "The Garden Diary"),
    siteTitleDe: getSetting("site_title_de", ""),
    siteTagline: getSetting(
      "site_tagline",
      "Pages from our garden, petal by petal.",
    ),
    siteTaglineDe: getSetting("site_tagline_de", ""),
    activeSeason: getSetting("active_season", "Spring"),
    aboutText: getSetting("about_text", ""),
    aboutTextDe: getSetting("about_text_de", ""),
  };
  return (
    <div>
      <h1 className="font-display text-3xl text-moss-deep">Settings</h1>
      <div className="mt-6">
        <SettingsForm
          initial={initial}
          onSaveSite={saveSiteSettings}
          onChangePassword={changePassword}
        />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <BackupRestore />
      </div>
    </div>
  );
}
