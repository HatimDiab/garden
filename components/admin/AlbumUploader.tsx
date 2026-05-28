"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter as useIntlRouter } from "@/lib/i18n/navigation";

type Uploaded = { id: string; filename: string };

export function AlbumUploader({ albumId }: { albumId: string }) {
  const router = useIntlRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [queue, setQueue] = useState<{ name: string; done: boolean }[]>([]);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (accepted.length === 0) return;
      setBusy(true);
      setErrors([]);
      const next = accepted.map((f) => ({ name: f.name, done: false }));
      setQueue(next);

      const results: Uploaded[] = [];
      const errs: string[] = [];
      for (let i = 0; i < accepted.length; i++) {
        const file = accepted[i];
        try {
          const form = new FormData();
          form.append("file", file);
          form.append("albumId", albumId);
          const res = await fetch("/api/upload", { method: "POST", body: form });
          if (!res.ok) throw new Error(`${file.name}: ${res.status}`);
          const json = (await res.json()) as { image: Uploaded };
          results.push(json.image);
        } catch (err) {
          errs.push((err as Error).message);
        }
        setQueue((q) => q.map((x, idx) => (idx === i ? { ...x, done: true } : x)));
      }
      setErrors(errs);
      setBusy(false);
      setQueue([]);
      router.refresh();
    },
    [albumId, router],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      if (target && target.isContentEditable) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of items) {
        if (item.kind !== "file") continue;
        const f = item.getAsFile();
        if (!f) continue;
        const isImage =
          f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name);
        if (isImage) files.push(f);
      }
      if (files.length > 0) {
        e.preventDefault();
        void onDrop(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onDrop]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".heic", ".heif"],
    },
    disabled: busy,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`paper cursor-pointer border-2 border-dashed p-8 text-center transition ${
          isDragActive ? "border-moss bg-sage/10" : "border-sage/40"
        }`}
      >
        <input {...getInputProps()} />
        <p className="font-display text-xl text-moss-deep">
          {isDragActive ? "Drop to plant…" : "Drop photos here, click to choose, or paste"}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          JPG, PNG, HEIC, WebP — paste with ⌘V / Ctrl+V too.
        </p>
      </div>
      {queue.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {queue.map((q, i) => (
            <li key={i} className={q.done ? "text-moss" : "text-ink-soft"}>
              {q.done ? "✓" : "…"} {q.name}
            </li>
          ))}
        </ul>
      )}
      {errors.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-rose">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
