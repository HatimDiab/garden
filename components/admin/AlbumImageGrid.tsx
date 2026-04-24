"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LocaleTabs, type FormLocale } from "@/components/admin/LocaleTabs";

type Img = {
  id: string;
  filename: string;
  caption: string | null;
  captionDe: string | null;
};

export function AlbumImageGrid({
  albumId,
  images,
  coverImageId,
  onSetCover,
  onDelete,
  onCaption,
}: {
  albumId: string;
  images: Img[];
  coverImageId: string | null;
  onSetCover: (albumId: string, imageId: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCaption: (id: string, caption: string, captionDe: string) => Promise<void>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [draftEn, setDraftEn] = useState("");
  const [draftDe, setDraftDe] = useState("");
  const [draftTab, setDraftTab] = useState<FormLocale>("en");

  const setCover = (id: string) => {
    startTransition(async () => {
      await onSetCover(albumId, id);
      router.refresh();
    });
  };
  const remove = (id: string) => {
    if (!window.confirm("Remove this photo?")) return;
    startTransition(async () => {
      await onDelete(id);
      router.refresh();
    });
  };
  const saveCaption = (id: string) => {
    startTransition(async () => {
      await onCaption(id, draftEn.trim(), draftDe.trim());
      setEditing(null);
      router.refresh();
    });
  };

  if (images.length === 0) {
    return (
      <p className="paper mt-4 p-6 text-ink-soft">
        No photos yet — drop some above.
      </p>
    );
  }

  return (
    <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {images.map((img) => {
        const isCover = img.id === coverImageId;
        const preview = img.caption || img.captionDe || "Add caption…";
        const draft = draftTab === "en" ? draftEn : draftDe;
        const setDraft = draftTab === "en" ? setDraftEn : setDraftDe;
        return (
          <li key={img.id} className="paper relative overflow-hidden">
            <img
              src={`/uploads/${img.filename}`}
              alt={img.caption ?? ""}
              className="h-44 w-full object-cover"
            />
            {isCover && (
              <span className="absolute left-2 top-2 chip bg-honey/40 text-moss-deep">
                ✿ cover
              </span>
            )}
            <div className="p-2">
              {editing === img.id ? (
                <div className="space-y-1">
                  <LocaleTabs
                    value={draftTab}
                    onChange={setDraftTab}
                    className="text-[10px]"
                  />
                  <div className="flex gap-1">
                    <input
                      className="field text-xs"
                      placeholder={`caption (${draftTab.toUpperCase()})`}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      autoFocus
                    />
                    <button
                      className="btn-ghost btn text-xs"
                      disabled={pending}
                      onClick={() => saveCaption(img.id)}
                    >
                      save
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="block w-full truncate text-left text-xs text-ink-soft hover:text-ink"
                  onClick={() => {
                    setEditing(img.id);
                    setDraftEn(img.caption ?? "");
                    setDraftDe(img.captionDe ?? "");
                    setDraftTab("en");
                  }}
                >
                  {preview}
                </button>
              )}
              <div className="mt-1 flex items-center justify-between text-xs">
                {!isCover ? (
                  <button
                    className="link-soft"
                    disabled={pending}
                    onClick={() => setCover(img.id)}
                  >
                    make cover
                  </button>
                ) : (
                  <span />
                )}
                <button
                  className="text-rose hover:underline"
                  disabled={pending}
                  onClick={() => remove(img.id)}
                >
                  remove
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
