import { AlbumForm } from "@/components/admin/AlbumForm";
import { createAlbum } from "../actions";

export const metadata = { title: "New album" };

export default function NewAlbumPage() {
  return (
    <div>
      <h1 className="font-display text-3xl text-moss-deep">New album</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Pick a name and a date. You can add photos after.
      </p>
      <div className="mt-6">
        <AlbumForm mode="create" onCreate={createAlbum} />
      </div>
    </div>
  );
}
