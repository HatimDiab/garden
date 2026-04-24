"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { events } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { randomId } from "@/lib/util/id";
import { revalidatePath } from "next/cache";

type EventInput = {
  title: string;
  titleDe: string;
  description: string;
  descriptionDe: string;
  startsAt: string;
  endsAt: string | null;
  albumId: string | null;
  entryId: string | null;
};

function nullable(s: string | null | undefined): string | null {
  const v = (s ?? "").trim();
  return v.length ? v : null;
}

export async function createEvent(data: EventInput) {
  await requireAdmin();
  if (!data.title.trim()) throw new Error("Title is required");
  if (!data.startsAt) throw new Error("Start date is required");
  const id = randomId();
  db.insert(events)
    .values({
      id,
      title: data.title.trim(),
      titleDe: nullable(data.titleDe),
      description: data.description.trim(),
      descriptionDe: nullable(data.descriptionDe),
      startsAt: new Date(data.startsAt),
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      albumId: data.albumId,
      entryId: data.entryId,
    })
    .run();
  revalidatePath("/", "layout");
  return { id };
}

export async function updateEvent(id: string, data: EventInput) {
  await requireAdmin();
  db.update(events)
    .set({
      title: data.title.trim(),
      titleDe: nullable(data.titleDe),
      description: data.description.trim(),
      descriptionDe: nullable(data.descriptionDe),
      startsAt: new Date(data.startsAt),
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      albumId: data.albumId,
      entryId: data.entryId,
    })
    .where(eq(events.id, id))
    .run();
  revalidatePath("/", "layout");
}

export async function deleteEvent(id: string) {
  await requireAdmin();
  db.delete(events).where(eq(events.id, id)).run();
  revalidatePath("/", "layout");
}
