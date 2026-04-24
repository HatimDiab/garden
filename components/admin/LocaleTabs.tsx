"use client";

import clsx from "clsx";

export type FormLocale = "en" | "de";

export function LocaleTabs({
  value,
  onChange,
  className,
}: {
  value: FormLocale;
  onChange: (l: FormLocale) => void;
  className?: string;
}) {
  const locales: FormLocale[] = ["en", "de"];
  return (
    <div
      className={clsx(
        "inline-flex rounded-full bg-cream/60 p-1 text-xs uppercase tracking-widest",
        className,
      )}
    >
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={clsx(
            "rounded-full px-3 py-1 transition",
            l === value
              ? "bg-moss text-cream"
              : "text-ink-soft hover:text-moss-deep",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
