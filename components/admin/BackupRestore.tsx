"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Msg = { kind: "ok" | "err"; text: string } | null;

export function BackupRestore() {
  const t = useTranslations("admin.forms.backup");
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"backup" | "restore" | null>(null);
  const [msg, setMsg] = useState<Msg>(null);

  const onBackup = async () => {
    setMsg(null);
    setBusy("backup");
    try {
      const res = await fetch("/api/admin/db/backup", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Backup failed (${res.status})`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "garden-backup.db";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg({ kind: "ok", text: `Downloaded ${filename}` });
    } catch (err) {
      setMsg({ kind: "err", text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const onRestore = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setMsg({ kind: "err", text: t("chooseFile") });
      return;
    }
    const confirmed = window.confirm(t("restoreConfirm"));
    if (!confirmed) return;

    setMsg(null);
    setBusy("restore");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/db/restore", {
        method: "POST",
        body: form,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `Restore failed (${res.status})`);
      }
      setMsg({
        kind: "ok",
        text:
          body.message ||
          "Restore applied. Reload in a few seconds once the app is back.",
      });
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setMsg({ kind: "err", text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="paper space-y-4 p-6">
      <h2 className="font-display text-xl text-moss-deep">{t("heading")}</h2>
      <p className="text-sm text-ink-soft">
        {t("description")}
      </p>

      <div className="space-y-2">
        <button
          className="btn"
          onClick={onBackup}
          disabled={busy !== null}
          type="button"
        >
          {busy === "backup" ? t("downloading") : t("download")}
        </button>
      </div>

      <div className="space-y-2 border-t border-sage/30 pt-4">
        <label className="block text-sm">
          <span className="text-ink-soft">{t("restoreLabel")}</span>
          <input
            ref={fileRef}
            type="file"
            accept=".db,application/vnd.sqlite3,application/octet-stream"
            className="mt-1 block w-full text-sm"
            disabled={busy !== null}
          />
        </label>
        <button
          className="btn-ghost btn"
          onClick={onRestore}
          disabled={busy !== null}
          type="button"
        >
          {busy === "restore" ? t("restoring") : t("restore")}
        </button>
      </div>

      {msg && (
        <p
          className={`text-sm ${
            msg.kind === "ok" ? "text-moss-deep" : "text-rose"
          }`}
        >
          {msg.text}
        </p>
      )}
    </section>
  );
}
