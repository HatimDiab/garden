import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storeImage } from "@/lib/images/pipeline";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const albumId = form.get("albumId");
  const entryId = form.get("entryId");
  const caption = form.get("caption");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }

  // Both checks must pass. An `||` here let `image/svg+xml` through the MIME
  // half and on into sharp/librsvg, which is the one decoder in the pipeline
  // that parses untrusted markup rather than a bitmap.
  const RASTER_MIME = /^image\/(jpeg|png|webp|gif|avif|heic|heif|tiff)$/i;
  const RASTER_EXT = /\.(jpe?g|png|webp|gif|avif|heic|heif|tiff?)$/i;
  if (!RASTER_MIME.test(file.type) || !RASTER_EXT.test(file.name)) {
    return NextResponse.json(
      { error: "unsupported image type" },
      { status: 415 },
    );
  }
  if (file.size === 0 || file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "too large" }, { status: 413 });
  }

  const stored = await storeImage(file, {
    albumId: typeof albumId === "string" && albumId ? albumId : undefined,
    entryId: typeof entryId === "string" && entryId ? entryId : undefined,
    caption: typeof caption === "string" && caption ? caption : undefined,
  });

  return NextResponse.json({ image: stored });
}
