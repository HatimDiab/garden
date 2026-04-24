import { encodeBase32LowerCaseNoPadding } from "@oslojs/encoding";
import crypto from "node:crypto";

export function randomId(bytes = 15): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return encodeBase32LowerCaseNoPadding(buf);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
