import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { albums, images } from "@/lib/db/schema";
import { AlbumForm } from "@/components/admin/AlbumForm";
import { AlbumUploader } from "@/components/admin/AlbumUploader";
import { AlbumImageGrid } from "@/components/admin/AlbumImageGrid";
import {
  deleteAlbum,
  deleteImage,
  setCoverImage,
  updateAlbum,
  updateImageCaption,
} from "../actions";

export const metadata = { title: "Edit album" };

export default async function EditAlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const album = db.select().from(albums).where(eq(albums.id, id)).get();
  if (!album) notFound();

  const pics = db
    .select({
      id: images.id,
      filename: images.filename,
      caption: images.caption,
      captionDe: images.captionDe,
    })
    .from(images)
    .where(eq(images.albumId, id))
    .orderBy(asc(images.order), asc(images.createdAt))
    .all();

  return (
    <div>
      <h1 className="font-display text-3xl text-moss-deep">{album.title}</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[20rem_1fr]">
        <AlbumForm
          mode="edit"
          album={{
            id: album.id,
            title: album.title,
            titleDe: album.titleDe ?? "",
            description: album.description,
            descriptionDe: album.descriptionDe ?? "",
            slug: album.slug,
            slugDe: album.slugDe ?? "",
            occurredOn: album.occurredOn
              ? album.occurredOn.toISOString().slice(0, 10)
              : null,
            coverImageId: album.coverImageId,
          }}
          onUpdate={updateAlbum}
          onDelete={deleteAlbum}
        />
        <div>
          <AlbumUploader albumId={id} />
          <AlbumImageGrid
            albumId={id}
            images={pics}
            coverImageId={album.coverImageId}
            onSetCover={setCoverImage}
            onDelete={deleteImage}
            onCaption={updateImageCaption}
          />
        </div>
      </div>
    </div>
  );
}
