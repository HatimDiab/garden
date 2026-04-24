"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";

type Uploaded = { id: string; filename: string };

export function AlbumUploader({ albumId }: { albumId: string }) {
  const router = useRouter();
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
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
          {isDragActive ? "Drop to plant…" : "Drop photos here, or click to choose"}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          JPG, PNG, HEIC, WebP — we&apos;ll resize everything.
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
