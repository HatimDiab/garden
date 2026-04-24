"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { de, enUS } from "date-fns/locale";

type Ev = { id: string; title: string; startsAt: number };

const dfLocales = { en: enUS, de } as const;

export function CalendarMonth({
  events,
  locale = "en",
}: {
  events: Ev[];
  locale?: "en" | "de";
}) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const df = dfLocales[locale];

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, Ev[]>();
    for (const e of events) {
      const key = format(new Date(e.startsAt), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [events]);

  const weekdayLabels = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) =>
      format(
        new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
        "EEE",
        { locale: df },
      ),
    );
  }, [df]);

  return (
    <div className="paper p-4">
      <header className="flex items-center justify-between px-2 py-1">
        <button
          className="btn-ghost btn text-sm"
          onClick={() => setCursor(subMonths(cursor, 1))}
        >
          ←
        </button>
        <h2 className="font-display text-2xl text-moss-deep">
          {format(cursor, "MMMM yyyy", { locale: df })}
        </h2>
        <button
          className="btn-ghost btn text-sm"
          onClick={() => setCursor(addMonths(cursor, 1))}
        >
          →
        </button>
      </header>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs uppercase tracking-widest text-ink-soft">
        {weekdayLabels.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const dayEvents = byDay.get(key) ?? [];
          const inMonth = isSameMonth(d, cursor);
          const isToday = isSameDay(d, new Date());
          return (
            <div
              key={key}
              className={`min-h-20 rounded-md border p-1.5 text-left text-xs ${
                inMonth ? "border-sage/30 bg-cream/40" : "border-transparent text-ink-soft/60"
              } ${isToday ? "ring-2 ring-rose/60" : ""}`}
            >
              <div className="text-[11px] font-medium">{format(d, "d")}</div>
              <ul className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 2).map((e) => (
                  <li
                    key={e.id}
                    className="truncate rounded bg-petal/40 px-1 text-[11px] text-moss-deep"
                    title={e.title}
                  >
                    ✿ {e.title}
                  </li>
                ))}
                {dayEvents.length > 2 && (
                  <li className="text-[10px] text-ink-soft">
                    +{dayEvents.length - 2}
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
