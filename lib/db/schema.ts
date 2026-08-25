import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";

const id = () => text("id").primaryKey().notNull();
const now = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

export const users = sqliteTable("users", {
  id: id(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: now(),
});

export const sessions = sqliteTable("sessions", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

export const loginAttempts = sqliteTable("login_attempts", {
  // Scope key, e.g. "user:gardener" or "ip:203.0.113.7" — lets one table
  // throttle both a targeted account and a username-rotating attacker.
  key: text("key").primaryKey().notNull(),
  failures: integer("failures").notNull().default(0),
  lastFailureAt: integer("last_failure_at", { mode: "timestamp" }).notNull(),
  lockedUntil: integer("locked_until", { mode: "timestamp" }),
});

export const images = sqliteTable(
  "images",
  {
    id: id(),
    filename: text("filename").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    blurhash: text("blurhash"),
    caption: text("caption"),
    captionDe: text("caption_de"),
    albumId: text("album_id"),
    entryId: text("entry_id"),
    order: integer("order").notNull().default(0),
    createdAt: now(),
  },
  (t) => [
    index("images_album_idx").on(t.albumId),
    index("images_entry_idx").on(t.entryId),
  ]
);

export const entries = sqliteTable(
  "entries",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    slugDe: text("slug_de"),
    title: text("title").notNull(),
    titleDe: text("title_de"),
    bodyJson: text("body_json").notNull(),
    bodyJsonDe: text("body_json_de"),
    bodyHtml: text("body_html").notNull().default(""),
    bodyHtmlDe: text("body_html_de"),
    excerpt: text("excerpt").notNull().default(""),
    excerptDe: text("excerpt_de"),
    heroImageId: text("hero_image_id"),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("draft"),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    createdAt: now(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("entries_published_idx").on(t.publishedAt)]
);

export const tags = sqliteTable("tags", {
  id: id(),
  name: text("name").notNull(),
  nameDe: text("name_de"),
  slug: text("slug").notNull().unique(),
  slugDe: text("slug_de"),
  kind: text("kind", { enum: ["flower", "season", "area"] })
    .notNull()
    .default("flower"),
});

export const entryTags = sqliteTable(
  "entry_tags",
  {
    entryId: text("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.tagId] })]
);

export const albums = sqliteTable("albums", {
  id: id(),
  slug: text("slug").notNull().unique(),
  slugDe: text("slug_de"),
  title: text("title").notNull(),
  titleDe: text("title_de"),
  description: text("description").notNull().default(""),
  descriptionDe: text("description_de"),
  coverImageId: text("cover_image_id"),
  occurredOn: integer("occurred_on", { mode: "timestamp" }),
  createdAt: now(),
});

export const events = sqliteTable(
  "events",
  {
    id: id(),
    title: text("title").notNull(),
    titleDe: text("title_de"),
    description: text("description").notNull().default(""),
    descriptionDe: text("description_de"),
    startsAt: integer("starts_at", { mode: "timestamp" }).notNull(),
    endsAt: integer("ends_at", { mode: "timestamp" }),
    albumId: text("album_id"),
    entryId: text("entry_id"),
    createdAt: now(),
  },
  (t) => [index("events_starts_idx").on(t.startsAt)]
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey().notNull(),
  value: text("value").notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
export type Album = typeof albums.$inferSelect;
export type NewAlbum = typeof albums.$inferInsert;
export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Tag = typeof tags.$inferSelect;
