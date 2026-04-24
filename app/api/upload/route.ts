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
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "not an image" }, { status: 400 });
  }
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "too large" }, { status: 413 });
  }

  const stored = await storeImage(file, {
    albumId: typeof albumId === "string" && albumId ? albumId : undefined,
    entryId: typeof entryId === "string" && entryId ? entryId : undefined,
    caption: typeof caption === "string" && caption ? caption : undefined,
  });

  return NextResponse.json({ image: stored });
}
