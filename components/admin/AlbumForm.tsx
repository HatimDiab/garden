"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LocaleTabs, type FormLocale } from "@/components/admin/LocaleTabs";

type AlbumInput = {
  title: string;
  titleDe: string;
  description: string;
  descriptionDe: string;
  occurredOn: string | null;
  slug: string;
  slugDe: string;
};

type Props =
  | {
      mode: "create";
      onCreate: (data: AlbumInput) => Promise<{ id: string; slug: string }>;
    }
  | {
      mode: "edit";
      album: AlbumInput & { id: string; coverImageId: string | null };
      onUpdate: (
        id: string,
        data: AlbumInput & { coverImageId: string | null },
      ) => Promise<{ slug: string }>;
      onDelete: (id: string) => Promise<void>;
    };

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function AlbumForm(props: Props) {
  const router = useRouter();
  const initial: AlbumInput =
    props.mode === "edit"
      ? props.album
      : {
          title: "",
          titleDe: "",
          description: "",
          descriptionDe: "",
          slug: "",
          slugDe: "",
          occurredOn: null,
        };

  const [title, setTitle] = useState(initial.title);
  const [titleDe, setTitleDe] = useState(initial.titleDe);
  const [description, setDescription] = useState(initial.description);
  const [descriptionDe, setDescriptionDe] = useState(initial.descriptionDe);
  const [slug, setSlug] = useState(initial.slug);
  const [slugDe, setSlugDe] = useState(initial.slugDe);
  const [occurredOn, setOccurredOn] = useState(initial.occurredOn ?? "");
  const [tab, setTab] = useState<FormLocale>("en");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        const payload: AlbumInput = {
          title,
          titleDe,
          description,
          descriptionDe,
          slug,
          slugDe,
          occurredOn: occurredOn || null,
        };
        if (props.mode === "create") {
          const { id } = await props.onCreate(payload);
          router.push(`/admin/gallery/${id}`);
        } else {
          await props.onUpdate(props.album.id, {
            ...payload,
            coverImageId: props.album.coverImageId,
          });
          router.refresh();
        }
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  const remove = () => {
    if (props.mode !== "edit") return;
    if (
      !window.confirm(
        "Delete this album and every photo inside it? This cannot be undone.",
      )
    )
      return;
    startTransition(async () => {
      await props.onDelete(props.album.id);
      router.push("/admin/gallery");
    });
  };

  const tTitle = tab === "en" ? title : titleDe;
  const tDesc = tab === "en" ? description : descriptionDe;
  const tSlug = tab === "en" ? slug : slugDe;
  const setTTitle = (v: string) => {
    if (tab === "en") {
      setTitle(v);
      if (props.mode === "create") setSlug(slugify(v));
    } else {
      setTitleDe(v);
      if (props.mode === "create") setSlugDe(slugify(v));
    }
  };
  const setTDesc = tab === "en" ? setDescription : setDescriptionDe;
  const setTSlug = tab === "en" ? setSlug : setSlugDe;

  return (
    <div className="paper space-y-4 p-6">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-ink-soft">
          Bilingual fields
        </span>
        <LocaleTabs value={tab} onChange={setTab} />
      </div>
      <label className="block">
        <span className="text-sm text-ink-soft">
          Title ({tab.toUpperCase()})
        </span>
        <input
          className="field mt-1"
          value={tTitle}
          onChange={(e) => setTTitle(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="text-sm text-ink-soft">
          Slug ({tab.toUpperCase()})
          {tab === "de" && (
            <span className="ml-2 text-xs text-ink-soft/70">
              optional — leave blank to share the EN slug
            </span>
          )}
        </span>
        <input
          className="field mt-1"
          value={tSlug}
          onChange={(e) => setTSlug(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="text-sm text-ink-soft">
          Description ({tab.toUpperCase()}, optional)
        </span>
        <textarea
          className="field mt-1"
          rows={3}
          value={tDesc}
          onChange={(e) => setTDesc(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="text-sm text-ink-soft">Date (optional)</span>
        <input
          type="date"
          className="field mt-1"
          value={occurredOn ? occurredOn.slice(0, 10) : ""}
          onChange={(e) => setOccurredOn(e.target.value)}
        />
      </label>
      {error && <p className="text-sm text-rose">{error}</p>}
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="btn"
          disabled={pending || !title.trim()}
          onClick={save}
        >
          {pending
            ? "Saving…"
            : props.mode === "create"
              ? "Create album"
              : "Save changes"}
        </button>
        {props.mode === "edit" && (
          <button
            type="button"
            className="text-sm text-rose hover:underline"
            disabled={pending}
            onClick={remove}
          >
            Delete album
          </button>
        )}
      </div>
    </div>
  );
}
