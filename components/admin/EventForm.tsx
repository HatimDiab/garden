"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LocaleTabs, type FormLocale } from "@/components/admin/LocaleTabs";

export type EventData = {
  title: string;
  titleDe: string;
  description: string;
  descriptionDe: string;
  startsAt: string;
  endsAt: string | null;
  albumId: string | null;
  entryId: string | null;
};

type AlbumOpt = { id: string; title: string };
type EntryOpt = { id: string; title: string };

type Props =
  | {
      mode: "create";
      albums: AlbumOpt[];
      entries: EntryOpt[];
      onCreate: (data: EventData) => Promise<{ id: string }>;
    }
  | {
      mode: "edit";
      id: string;
      initial: EventData;
      albums: AlbumOpt[];
      entries: EntryOpt[];
      onUpdate: (id: string, data: EventData) => Promise<void>;
      onDelete: (id: string) => Promise<void>;
    };

export function EventForm(props: Props) {
  const router = useRouter();
  const initial: EventData =
    props.mode === "edit"
      ? props.initial
      : {
          title: "",
          titleDe: "",
          description: "",
          descriptionDe: "",
          startsAt: "",
          endsAt: null,
          albumId: null,
          entryId: null,
        };
  const [title, setTitle] = useState(initial.title);
  const [titleDe, setTitleDe] = useState(initial.titleDe);
  const [description, setDescription] = useState(initial.description);
  const [descriptionDe, setDescriptionDe] = useState(initial.descriptionDe);
  const [startsAt, setStartsAt] = useState(initial.startsAt);
  const [endsAt, setEndsAt] = useState(initial.endsAt ?? "");
  const [albumId, setAlbumId] = useState(initial.albumId ?? "");
  const [entryId, setEntryId] = useState(initial.entryId ?? "");
  const [tab, setTab] = useState<FormLocale>("en");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        const payload: EventData = {
          title,
          titleDe,
          description,
          descriptionDe,
          startsAt,
          endsAt: endsAt || null,
          albumId: albumId || null,
          entryId: entryId || null,
        };
        if (props.mode === "create") {
          await props.onCreate(payload);
          router.push("/admin/events");
        } else {
          await props.onUpdate(props.id, payload);
          router.refresh();
        }
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  const remove = () => {
    if (props.mode !== "edit") return;
    if (!window.confirm("Delete this event?")) return;
    startTransition(async () => {
      await props.onDelete(props.id);
      router.push("/admin/events");
    });
  };

  const tTitle = tab === "en" ? title : titleDe;
  const tDesc = tab === "en" ? description : descriptionDe;
  const setTTitle = tab === "en" ? setTitle : setTitleDe;
  const setTDesc = tab === "en" ? setDescription : setDescriptionDe;

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
          Description ({tab.toUpperCase()})
        </span>
        <textarea
          className="field mt-1"
          rows={4}
          value={tDesc}
          onChange={(e) => setTDesc(e.target.value)}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-ink-soft">Starts</span>
          <input
            type="datetime-local"
            className="field mt-1"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-sm text-ink-soft">Ends (optional)</span>
          <input
            type="datetime-local"
            className="field mt-1"
            value={endsAt ?? ""}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-ink-soft">Link to album (optional)</span>
          <select
            className="field mt-1"
            value={albumId}
            onChange={(e) => setAlbumId(e.target.value)}
          >
            <option value="">—</option>
            {props.albums.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-ink-soft">Link to entry (optional)</span>
          <select
            className="field mt-1"
            value={entryId}
            onChange={(e) => setEntryId(e.target.value)}
          >
            <option value="">—</option>
            {props.entries.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="text-sm text-rose">{error}</p>}
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="btn"
          disabled={pending || !title.trim() || !startsAt}
          onClick={save}
        >
          {pending
            ? "Saving…"
            : props.mode === "create"
              ? "Create event"
              : "Save changes"}
        </button>
        {props.mode === "edit" && (
          <button
            type="button"
            className="text-sm text-rose hover:underline"
            disabled={pending}
            onClick={remove}
          >
            Delete event
          </button>
        )}
      </div>
    </div>
  );
}
