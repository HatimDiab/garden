"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { albums, images } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { randomId, slugify } from "@/lib/util/id";
import { deleteImageFiles } from "@/lib/images/pipeline";
import { revalidatePath } from "next/cache";

type AlbumInput = {
  title: string;
  titleDe: string;
  description: string;
  descriptionDe: string;
  occurredOn: string | null;
  slug: string;
  slugDe: string;
};

function nullable(s: string | null | undefined): string | null {
  const v = (s ?? "").trim();
  return v.length ? v : null;
}

function ensureAlbumSlug(candidate: string, fallbackFromTitle: string): string {
  const base = slugify(candidate || fallbackFromTitle) || "album";
  let s = base;
  let i = 2;
  while (db.select().from(albums).where(eq(albums.slug, s)).get()) {
    s = `${base}-${i++}`;
  }
  return s;
}

function ensureAlbumSlugDe(
  candidate: string | null,
  excludeId: string | null,
): string | null {
  const raw = nullable(candidate);
  if (!raw) return null;
  const base = slugify(raw) || "album";
  let s = base;
  let i = 2;
  while (
    db
      .select()
      .from(albums)
      .where(
        excludeId
          ? and(eq(albums.slugDe, s), ne(albums.id, excludeId))
          : eq(albums.slugDe, s),
      )
      .get()
  ) {
    s = `${base}-${i++}`;
  }
  return s;
}

export async function createAlbum(data: AlbumInput) {
  await requireAdmin();
  const titleEn = data.title.trim();
  const titleDe = data.titleDe.trim();
  if (!titleEn && !titleDe) throw new Error("Title is required");
  const effectiveEnTitle = titleEn || titleDe;
  const id = randomId();
  const slug = ensureAlbumSlug(data.slug || data.slugDe, effectiveEnTitle);
  const slugDe = ensureAlbumSlugDe(data.slugDe || data.titleDe, null);
  db.insert(albums)
    .values({
      id,
      title: effectiveEnTitle,
      titleDe: nullable(data.titleDe),
      description: data.description.trim(),
      descriptionDe: nullable(data.descriptionDe),
      slug,
      slugDe,
      occurredOn: data.occurredOn ? new Date(data.occurredOn) : null,
    })
    .run();
  revalidatePath("/", "layout");
  return { id, slug };
}

export async function updateAlbum(
  id: string,
  data: AlbumInput & { coverImageId: string | null },
) {
  await requireAdmin();
  const current = db.select().from(albums).where(eq(albums.id, id)).get();
  if (!current) throw new Error("Album not found");
  const titleEn = data.title.trim();
  const titleDe = data.titleDe.trim();
  if (!titleEn && !titleDe) throw new Error("Title is required");
  const effectiveEnTitle = titleEn || titleDe;
  let slug = current.slug;
  if (data.slug && data.slug !== current.slug) {
    slug = ensureAlbumSlug(data.slug, effectiveEnTitle);
  }
  const newSlugDe = nullable(data.slugDe);
  const slugDe =
    newSlugDe && newSlugDe !== current.slugDe
      ? ensureAlbumSlugDe(newSlugDe, id)
      : newSlugDe;
  db.update(albums)
    .set({
      title: effectiveEnTitle,
      titleDe: nullable(data.titleDe),
      description: data.description.trim(),
      descriptionDe: nullable(data.descriptionDe),
      slug,
      slugDe,
      occurredOn: data.occurredOn ? new Date(data.occurredOn) : null,
      coverImageId: data.coverImageId ?? current.coverImageId,
    })
    .where(eq(albums.id, id))
    .run();
  revalidatePath("/", "layout");
  return { slug };
}

export async function deleteAlbum(id: string) {
  await requireAdmin();
  const imgs = db.select().from(images).where(eq(images.albumId, id)).all();
  for (const img of imgs) await deleteImageFiles(img.filename);
  db.delete(images).where(eq(images.albumId, id)).run();
  db.delete(albums).where(eq(albums.id, id)).run();
  revalidatePath("/", "layout");
}

export async function deleteImage(imageId: string) {
  await requireAdmin();
  const img = db.select().from(images).where(eq(images.id, imageId)).get();
  if (!img) return;
  await deleteImageFiles(img.filename);
  db.delete(images).where(eq(images.id, imageId)).run();
  revalidatePath("/", "layout");
}

export async function deleteImages(imageIds: string[]) {
  await requireAdmin();
  if (imageIds.length === 0) return;
  const rows = db.select().from(images).where(inArray(images.id, imageIds)).all();
  for (const row of rows) await deleteImageFiles(row.filename);
  db.delete(images).where(inArray(images.id, imageIds)).run();
  revalidatePath("/", "layout");
}

export async function setCoverImage(albumId: string, imageId: string) {
  await requireAdmin();
  db.update(albums)
    .set({ coverImageId: imageId })
    .where(eq(albums.id, albumId))
    .run();
  revalidatePath("/", "layout");
}

export async function updateImageCaption(
  imageId: string,
  caption: string,
  captionDe: string,
) {
  await requireAdmin();
  db.update(images)
    .set({ caption, captionDe: nullable(captionDe) })
    .where(eq(images.id, imageId))
    .run();
  revalidatePath("/", "layout");
}
