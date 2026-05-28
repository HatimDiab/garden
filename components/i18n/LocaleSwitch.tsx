"use client";

import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { routing, type Locale } from "@/lib/i18n/routing";

export function LocaleSwitch({ current }: { current: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const href = qs ? `${pathname}?${qs}` : pathname;

  return (
    <div className="flex items-center gap-1 rounded-full bg-paper/70 px-1 py-0.5 text-xs uppercase tracking-widest backdrop-blur">
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={href}
          locale={l}
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
