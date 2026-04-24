"use server";

import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { entries, entryTags, tags } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { randomId, slugify } from "@/lib/util/id";
import { revalidatePath } from "next/cache";

type SaveInput = {
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

function nullable(s: string | null | undefined): string | null {
  const v = (s ?? "").trim();
  return v.length ? v : null;
}

function ensureSlug(candidate: string, fallbackFromTitle: string): string {
  const base = slugify(candidate || fallbackFromTitle) || "entry";
  let s = base;
  let i = 2;
  while (db.select().from(entries).where(eq(entries.slug, s)).get()) {
    s = `${base}-${i++}`;
  }
  return s;
}

function ensureSlugDe(
  candidate: string | null,
  excludeId: string | null,
): string | null {
  const raw = nullable(candidate);
  if (!raw) return null;
  const base = slugify(raw) || "entry";
  let s = base;
  let i = 2;
  while (
    db
      .select()
      .from(entries)
      .where(
        excludeId
          ? and(eq(entries.slugDe, s), ne(entries.id, excludeId))
          : eq(entries.slugDe, s),
      )
      .get()
  ) {
    s = `${base}-${i++}`;
  }
  return s;
}

function upsertTags(raw: string): string[] {
  const names = raw
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  const ids: string[] = [];
  for (const name of names) {
    const s = slugify(name);
    if (!s) continue;
    const existing = db.select().from(tags).where(eq(tags.slug, s)).get();
    if (existing) {
      ids.push(existing.id);
    } else {
      const id = randomId();
      db.insert(tags).values({ id, name, slug: s, kind: "flower" }).run();
      ids.push(id);
    }
  }
  return ids;
}

export async function saveEntry(data: SaveInput) {
  await requireAdmin();
  if (!data.title.trim()) throw new Error("Title is required");

  const tagIds = upsertTags(data.tags);

  if (data.id) {
    const current = db.select().from(entries).where(eq(entries.id, data.id)).get();
    if (!current) throw new Error("Entry not found");
    let slug = current.slug;
    if (data.slug && data.slug !== current.slug) {
      slug = ensureSlug(data.slug, data.title);
    }
    const incomingDeSlug = nullable(data.slugDe);
    const slugDe =
      incomingDeSlug && incomingDeSlug !== current.slugDe
        ? ensureSlugDe(incomingDeSlug, data.id)
        : incomingDeSlug;

    const wasPublished = current.status === "published";
    const publishedAt =
      data.status === "published"
        ? (wasPublished ? current.publishedAt : new Date())
        : null;

    db.update(entries)
      .set({
        title: data.title,
        titleDe: nullable(data.titleDe),
        slug,
        slugDe,
        excerpt: data.excerpt,
        excerptDe: nullable(data.excerptDe),
        bodyJson: data.bodyJson,
        bodyJsonDe: nullable(data.bodyJsonDe) ?? null,
        bodyHtml: data.bodyHtml,
        bodyHtmlDe: nullable(data.bodyHtmlDe),
        status: data.status,
        publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(entries.id, data.id))
      .run();

    db.delete(entryTags).where(eq(entryTags.entryId, data.id)).run();
    for (const tagId of tagIds) {
      db.insert(entryTags).values({ entryId: data.id, tagId }).run();
    }
    revalidatePath("/", "layout");
    return { id: data.id, slug };
  }

  const id = randomId();
  const slug = ensureSlug(data.slug, data.title);
  const slugDe = ensureSlugDe(data.slugDe || data.titleDe, null);
  db.insert(entries)
    .values({
      id,
      slug,
      slugDe,
      title: data.title,
      titleDe: nullable(data.titleDe),
      excerpt: data.excerpt,
      excerptDe: nullable(data.excerptDe),
      bodyJson: data.bodyJson,
      bodyJsonDe: nullable(data.bodyJsonDe) ?? null,
      bodyHtml: data.bodyHtml,
      bodyHtmlDe: nullable(data.bodyHtmlDe),
      status: data.status,
      publishedAt: data.status === "published" ? new Date() : null,
    })
    .run();
  for (const tagId of tagIds) {
    db.insert(entryTags).values({ entryId: id, tagId }).run();
  }
  revalidatePath("/", "layout");
  return { id, slug };
}

export async function deleteEntry(id: string) {
  await requireAdmin();
  db.delete(entryTags).where(eq(entryTags.entryId, id)).run();
  db.delete(entries).where(eq(entries.id, id)).run();
  revalidatePath("/", "layout");
}
