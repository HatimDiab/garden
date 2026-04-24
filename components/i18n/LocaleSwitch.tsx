"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { routing, type Locale } from "@/lib/i18n/routing";

export function LocaleSwitch({ current }: { current: Locale }) {
  const pathname = usePathname() || "/";
  const segments = pathname.split("/").filter(Boolean);
  const rest = routing.locales.includes(segments[0] as Locale)
    ? segments.slice(1)
    : segments;
  const basePath = rest.length ? `/${rest.join("/")}` : "";

  return (
    <div className="flex items-center gap-1 rounded-full bg-paper/70 px-1 py-0.5 text-xs uppercase tracking-widest backdrop-blur">
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={`/${l}${basePath}`}
          className={clsx(
            "rounded-full px-2 py-0.5 transition",
            l === current
              ? "bg-moss text-cream"
              : "text-ink-soft hover:text-moss-deep",
          )}
          aria-current={l === current ? "page" : undefined}
        >
          {l}
        </Link>
      ))}
    </div>
  );
}
