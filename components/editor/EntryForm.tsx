"use client";

import { useState, useTransition } from "react";
import { useRouter as useIntlRouter } from "@/lib/i18n/navigation";
import type { JSONContent } from "@tiptap/react";
import { TiptapEditor } from "./TiptapEditor";
import { LocaleTabs, type FormLocale } from "@/components/admin/LocaleTabs";

type Entry = {
  id: string;
  title: string;
  titleDe: string | null;
  slug: string;
  slugDe: string | null;
  excerpt: string;
  excerptDe: string | null;
  bodyJson: string;
  bodyJsonDe: string | null;
  status: "draft" | "published";
  tags: string;
  publishedAt: number | null;
};

export type SaveEntryPayload = {
  id?: string;
  title: string;
  titleDe: string;
  slug: string;
  slugDe: string;
  excerpt: string;
  excerptDe: string;
  bodyJson: string;
  bodyJsonDe: string;
  bodyHtml: string;
  bodyHtmlDe: string;
  status: "draft" | "published";
  tags: string;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function EntryForm({
  entry,
  saveAction,
  deleteAction,
}: {
  entry?: Entry;
  saveAction: (data: SaveEntryPayload) => Promise<{ id: string; slug: string }>;
  deleteAction?: (id: string) => Promise<void>;
}) {
  const router = useIntlRouter();
  const [title, setTitle] = useState(entry?.title ?? "");
  const [titleDe, setTitleDe] = useState(entry?.titleDe ?? "");
  const [slug, setSlug] = useState(entry?.slug ?? "");
  const [slugDe, setSlugDe] = useState(entry?.slugDe ?? "");
  const [excerpt, setExcerpt] = useState(entry?.excerpt ?? "");
  const [excerptDe, setExcerptDe] = useState(entry?.excerptDe ?? "");
  const [tags, setTags] = useState(entry?.tags ?? "");
  const [status, setStatus] = useState<"draft" | "published">(
    entry?.status ?? "draft",
  );
  const [bodyJson, setBodyJson] = useState<JSONContent | null>(
    entry?.bodyJson ? (JSON.parse(entry.bodyJson) as JSONContent) : null,
  );
  const [bodyJsonDe, setBodyJsonDe] = useState<JSONContent | null>(
    entry?.bodyJsonDe ? (JSON.parse(entry.bodyJsonDe) as JSONContent) : null,
  );
  const [bodyHtml, setBodyHtml] = useState("");
  const [bodyHtmlDe, setBodyHtmlDe] = useState("");
  const [tab, setTab] = useState<FormLocale>("en");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const save = (nextStatus: "draft" | "published") => {
    setError(null);
    startTransition(async () => {
      try {
        const { id } = await saveAction({
          id: entry?.id,
          title: title.trim(),
          titleDe: titleDe.trim(),
          slug: slug.trim(),
          slugDe: slugDe.trim(),
          excerpt: excerpt.trim(),
          excerptDe: excerptDe.trim(),
          bodyJson: JSON.stringify(bodyJson ?? {}),
          bodyJsonDe: bodyJsonDe
            ? JSON.stringify(bodyJsonDe)
            : JSON.stringify({}),
          bodyHtml,
          bodyHtmlDe,
          status: nextStatus,
          tags: tags.trim(),
        });
        setStatus(nextStatus);
        if (!entry) router.push(`/admin/journal/${id}`);
        else router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  const remove = () => {
    if (!entry || !deleteAction) return;
    if (!window.confirm("Delete this entry? This cannot be undone.")) return;
    startTransition(async () => {
      await deleteAction(entry.id);
      router.push("/admin/journal");
    });
  };

  const tTitle = tab === "en" ? title : titleDe;
  const tSlug = tab === "en" ? slug : slugDe;
  const tExcerpt = tab === "en" ? excerpt : excerptDe;
  const tBodyJson = tab === "en" ? bodyJson : bodyJsonDe;

  const setTTitle = (v: string) => {
    if (tab === "en") {
      setTitle(v);
      if (!entry) setSlug(slugify(v));
    } else {
      setTitleDe(v);
      if (!entry) setSlugDe(slugify(v));
    }
  };
  const setTSlug = tab === "en" ? setSlug : setSlugDe;
  const setTExcerpt = tab === "en" ? setExcerpt : setExcerptDe;

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-ink-soft">
            Bilingual content
          </span>
          <LocaleTabs value={tab} onChange={setTab} />
        </div>
        <input
          className="field text-3xl font-display"
          placeholder={
            tab === "en"
              ? "A title for this page…"
              : "Ein Titel für diese Seite…"
          }
          value={tTitle}
          onChange={(e) => setTTitle(e.target.value)}
        />
        <TiptapEditor
          key={tab}
          initial={tBodyJson}
          onChange={(json, html) => {
            if (tab === "en") {
              setBodyJson(json);
              setBodyHtml(html);
            } else {
              setBodyJsonDe(json);
              setBodyHtmlDe(html);
            }
          }}
          placeholder={
            tab === "en" ? "Today in the garden…" : "Heute im Garten…"
          }
        />
      </div>
      <aside className="space-y-4">
        <div className="paper p-4">
          <h4 className="font-display text-lg text-moss-deep">Publish</h4>
          <p className="mt-1 text-sm text-ink-soft">
            Current status:{" "}
            <span
              className={
                status === "published" ? "text-moss" : "text-honey"
              }
            >
              {status}
            </span>
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              className="btn"
              disabled={pending || !title.trim()}
              onClick={() => save("published")}
            >
              {pending ? "Saving…" : "Publish"}
            </button>
            <button
              type="button"
              className="btn-ghost btn"
              disabled={pending || !title.trim()}
              onClick={() => save("draft")}
            >
              Save draft
            </button>
            {entry && deleteAction && (
              <button
                type="button"
                className="mt-2 text-sm text-rose hover:underline"
                disabled={pending}
                onClick={remove}
              >
                Delete entry
              </button>
            )}
          </div>
          {error && <p className="mt-3 text-sm text-rose">{error}</p>}
        </div>

        <div className="paper p-4">
          <h4 className="font-display text-lg text-moss-deep">
            Details ({tab.toUpperCase()})
          </h4>
          <label className="mt-3 block text-sm">
            <span className="text-ink-soft">
              Slug
              {tab === "de" && (
                <span className="ml-2 text-xs text-ink-soft/70">
                  optional
                </span>
              )}
            </span>
            <input
              className="field mt-1"
              value={tSlug}
              onChange={(e) => setTSlug(e.target.value)}
            />
          </label>
          <label className="mt-3 block text-sm">
            <span className="text-ink-soft">Excerpt</span>
            <textarea
              className="field mt-1"
              rows={3}
              value={tExcerpt}
              onChange={(e) => setTExcerpt(e.target.value)}
            />
          </label>
          <label className="mt-3 block text-sm">
            <span className="text-ink-soft">Tags (comma-separated)</span>
            <input
              className="field mt-1"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tulips, spring, south bed"
            />
          </label>
        </div>
      </aside>
    </div>
  );
}
