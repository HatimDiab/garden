import type { Locale } from "@/lib/i18n/routing";

export type Localized<T> = { value: T; fellBack: boolean };

function deKey<K extends string>(base: K): `${K}De` {
  return (base + "De") as `${K}De`;
}

export function pickText<
  Row extends Record<string, unknown>,
  Field extends Extract<keyof Row, string>,
>(row: Row, field: Field, locale: Locale): Localized<string> {
  const en = (row[field] as string | null | undefined) ?? "";
  if (locale === "en") return { value: en, fellBack: false };
  const deField = deKey(field) as keyof Row;
  const de = row[deField] as string | null | undefined;
  if (de && de.trim().length > 0) return { value: de, fellBack: false };
  return { value: en, fellBack: true };
}

export function pickLocaleSlug<
  Row extends { slug: string; slugDe?: string | null },
>(row: Row, locale: Locale): string {
  if (locale === "de" && row.slugDe) return row.slugDe;
  return row.slug;
}
