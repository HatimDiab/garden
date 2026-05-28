"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter as useIntlRouter } from "@/lib/i18n/navigation";
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
  onDeleteMany,
  onCaption,
}: {
  albumId: string;
  images: Img[];
  coverImageId: string | null;
  onSetCover: (albumId: string, imageId: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDeleteMany: (ids: string[]) => Promise<void>;
  onCaption: (id: string, caption: string, captionDe: string) => Promise<void>;
}) {
  const t = useTranslations("admin.forms.albumGrid");
  const router = useIntlRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [draftEn, setDraftEn] = useState("");
  const [draftDe, setDraftDe] = useState("");
  const [draftTab, setDraftTab] = useState<FormLocale>("en");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const setCover = (id: string) => {
    startTransition(async () => {
      await onSetCover(albumId, id);
      router.refresh();
    });
  };
  const remove = (id: string) => {
    if (!window.confirm(t("removeConfirm"))) return;
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

  const toggleSelected = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());
  const selectAll = () => setSelected(new Set(images.map((i) => i.id)));
  const removeSelected = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!window.confirm(t("removeManyConfirm", { count: ids.length }))) return;
    startTransition(async () => {
      await onDeleteMany(ids);
      clearSelection();
      router.refresh();
    });
  };

  if (images.length === 0) {
    return (
      <p className="paper mt-4 p-6 text-ink-soft">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-soft">
        <span>
          {selected.size > 0
            ? t("selectedCount", { count: selected.size })
            : t("clickHint")}
        </span>
        {selected.size > 0 ? (
          <>
            <button
              type="button"
              className="link-soft"
              onClick={clearSelection}
              disabled={pending}
            >
              {t("clear")}
            </button>
            <button
              type="button"
              className="text-rose hover:underline"
              onClick={removeSelected}
              disabled={pending}
            >
              {t("deleteSelected")}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="link-soft"
            onClick={selectAll}
            disabled={pending}
          >
            {t("selectAll")}
          </button>
        )}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {images.map((img) => {
        const isCover = img.id === coverImageId;
        const isSelected = selected.has(img.id);
        const preview = img.caption || img.captionDe || "Add caption…";
        const draft = draftTab === "en" ? draftEn : draftDe;
        const setDraft = draftTab === "en" ? setDraftEn : setDraftDe;
        return (
          <li
            key={img.id}
            className={`paper relative overflow-hidden ${
              isSelected ? "ring-2 ring-moss-deep" : ""
            }`}
          >
            <img
              src={`/uploads/${img.filename}`}
              alt={img.caption ?? ""}
              className="h-44 w-full object-cover"
            />
            <button
              type="button"
              aria-label={isSelected ? t("deselectAria") : t("selectAria")}
              onClick={() => toggleSelected(img.id)}
              className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-xs ${
                isSelected
                  ? "bg-moss-deep text-cream"
                  : "bg-white/85 text-ink-soft hover:bg-white"
              }`}
            >
              {isSelected ? "✓" : "☐"}
            </button>
            {isCover && (
              <span className="absolute left-2 top-2 chip bg-honey/40 text-moss-deep">
                {t("cover")}
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
                      placeholder={t("captionPlaceholder", { tab: draftTab.toUpperCase() })}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      autoFocus
                    />
                    <button
                      className="btn-ghost btn text-xs"
                      disabled={pending}
                      onClick={() => saveCaption(img.id)}
                    >
                      {t("save")}
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
                    {t("makeCover")}
                  </button>
                ) : (
                  <span />
                )}
                <button
                  className="text-rose hover:underline"
                  disabled={pending}
                  onClick={() => remove(img.id)}
                >
                  {t("remove")}
                </button>
              </div>
            </div>
          </li>
        );
      })}
      </ul>
    </div>
  );
}
