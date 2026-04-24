import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { encode as encodeBlurhash } from "blurhash";
import { randomId } from "@/lib/util/id";
import { db } from "@/lib/db/client";
import { images } from "@/lib/db/schema";

const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const uploadsDir = path.join(dataDir, "uploads");

async function ensureDir() {
  await fs.mkdir(uploadsDir, { recursive: true });
}

const WIDTHS = [320, 768, 1600];

async function makeBlurhash(buf: Buffer): Promise<string | null> {
  try {
    const { data, info } = await sharp(buf)
      .raw()
      .ensureAlpha()
      .resize(32, 32, { fit: "inside" })
      .toBuffer({ resolveWithObject: true });
    return encodeBlurhash(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      4,
      4,
    );
  } catch {
    return null;
  }
}

export type StoredImage = {
  id: string;
  filename: string;
  width: number;
  height: number;
  blurhash: string | null;
};

export async function storeImage(
  file: { arrayBuffer(): Promise<ArrayBuffer>; name?: string; type?: string },
  opts: { albumId?: string; entryId?: string; caption?: string; order?: number } = {},
): Promise<StoredImage> {
  await ensureDir();
  const buf = Buffer.from(await file.arrayBuffer());

  const pipeline = sharp(buf, { failOn: "none" }).rotate();
  const meta = await pipeline.metadata();
  if (!meta.width || !meta.height) throw new Error("invalid image");

  const id = randomId();
  const baseName = id;

  await Promise.all([
    sharp(buf)
      .rotate()
      .webp({ quality: 86 })
      .toFile(path.join(uploadsDir, `${baseName}.webp`)),
    ...WIDTHS.filter((w) => w < meta.width!).map((w) =>
      sharp(buf)
        .rotate()
        .resize({ width: w })
        .webp({ quality: 82 })
        .toFile(path.join(uploadsDir, `${baseName}-${w}.webp`)),
    ),
  ]);

  const blurhash = await makeBlurhash(buf);
  const filename = `${baseName}.webp`;

  db.insert(images)
    .values({
      id,
      filename,
      width: meta.width,
      height: meta.height,
      blurhash,
      caption: opts.caption,
      albumId: opts.albumId,
      entryId: opts.entryId,
      order: opts.order ?? 0,
    })
    .run();

  return { id, filename, width: meta.width, height: meta.height, blurhash };
}

export async function deleteImageFiles(filename: string) {
  const base = filename.replace(/\.webp$/, "");
  const candidates = [
    `${base}.webp`,
    ...WIDTHS.map((w) => `${base}-${w}.webp`),
  ];
  await Promise.all(
    candidates.map((f) => fs.unlink(path.join(uploadsDir, f)).catch(() => {})),
  );
}

export { uploadsDir };
