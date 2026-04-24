"use client";

import { useState, useTransition } from "react";
import { LocaleTabs, type FormLocale } from "@/components/admin/LocaleTabs";

export type SiteData = {
  siteTitle: string;
  siteTitleDe: string;
  siteTagline: string;
  siteTaglineDe: string;
  activeSeason: string;
  aboutText: string;
  aboutTextDe: string;
};

export function SettingsForm({
  initial,
  onSaveSite,
  onChangePassword,
}: {
  initial: SiteData;
  onSaveSite: (data: SiteData) => Promise<void>;
  onChangePassword: (data: { current: string; next: string }) => Promise<void>;
}) {
  const [data, setData] = useState<SiteData>(initial);
  const [siteMsg, setSiteMsg] = useState<string | null>(null);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<FormLocale>("en");

  const saveSite = () => {
    setSiteMsg(null);
    startTransition(async () => {
      try {
        await onSaveSite(data);
        setSiteMsg("Saved.");
      } catch (err) {
        setSiteMsg((err as Error).message);
      }
    });
  };

  const savePassword = () => {
    setPwMsg(null);
    if (pw.next !== pw.confirm) {
      setPwMsg("New passwords don't match.");
      return;
    }
    startTransition(async () => {
      try {
        await onChangePassword({ current: pw.current, next: pw.next });
        setPw({ current: "", next: "", confirm: "" });
        setPwMsg("Password changed. Please sign in again.");
        setTimeout(() => {
          window.location.href = "/admin/login";
        }, 1000);
      } catch (err) {
        setPwMsg((err as Error).message);
      }
    });
  };

  const title = tab === "en" ? data.siteTitle : data.siteTitleDe;
  const tagline = tab === "en" ? data.siteTagline : data.siteTaglineDe;
  const about = tab === "en" ? data.aboutText : data.aboutTextDe;

  const setField = (key: keyof SiteData, v: string) =>
    setData((d) => ({ ...d, [key]: v }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="paper space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-moss-deep">Site</h2>
          <LocaleTabs value={tab} onChange={setTab} />
        </div>
        <label className="block text-sm">
          <span className="text-ink-soft">Site title ({tab.toUpperCase()})</span>
          <input
            className="field mt-1"
            value={title}
            onChange={(e) =>
              setField(tab === "en" ? "siteTitle" : "siteTitleDe", e.target.value)
            }
          />
        </label>
        <label className="block text-sm">
          <span className="text-ink-soft">Tagline ({tab.toUpperCase()})</span>
          <input
            className="field mt-1"
            value={tagline}
            onChange={(e) =>
              setField(
                tab === "en" ? "siteTagline" : "siteTaglineDe",
                e.target.value,
              )
            }
          />
        </label>
        <label className="block text-sm">
          <span className="text-ink-soft">Active season label</span>
          <input
            className="field mt-1"
            value={data.activeSeason}
            onChange={(e) => setField("activeSeason", e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-ink-soft">
            About page text ({tab.toUpperCase()})
          </span>
          <textarea
            className="field mt-1"
            rows={6}
            value={about}
            onChange={(e) =>
              setField(
                tab === "en" ? "aboutText" : "aboutTextDe",
                e.target.value,
              )
            }
          />
        </label>
        <button className="btn" onClick={saveSite} disabled={pending}>
          Save site
        </button>
        {siteMsg && <p className="text-sm text-moss-deep">{siteMsg}</p>}
      </section>

      <section className="paper space-y-4 p-6">
        <h2 className="font-display text-xl text-moss-deep">Password</h2>
        <label className="block text-sm">
          <span className="text-ink-soft">Current password</span>
          <input
            type="password"
            className="field mt-1"
            value={pw.current}
            onChange={(e) => setPw({ ...pw, current: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="text-ink-soft">New password</span>
          <input
            type="password"
            className="field mt-1"
            value={pw.next}
            onChange={(e) => setPw({ ...pw, next: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="text-ink-soft">Confirm new password</span>
          <input
            type="password"
            className="field mt-1"
            value={pw.confirm}
            onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
          />
        </label>
        <button
          className="btn"
          onClick={savePassword}
          disabled={pending || !pw.current || !pw.next || !pw.confirm}
        >
          Change password
        </button>
        {pwMsg && <p className="text-sm text-moss-deep">{pwMsg}</p>}
      </section>
    </div>
  );
}
