import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import type { Locale } from "./routing";

const locales = { en: enUS, de } as const;

export function formatDate(
  date: Date | number,
  pattern: string,
  locale: Locale,
): string {
  return format(date, pattern, { locale: locales[locale] });
}
