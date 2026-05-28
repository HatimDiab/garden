"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export type GalleryImage = {
  id: string;
  filename: string;
  caption: string | null;
  width: number;
  height: number;
};

export function LightboxGallery({ images }: { images: GalleryImage[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const close = useCallback(() => setIndex(null), []);
  const prev = useCallback(
    () => setIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length)),
    [images.length],
  );
  const next = useCallback(
    () => setIndex((i) => (i === null ? null : (i + 1) % images.length)),
    [images.length],
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, close, prev, next]);

  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const dx = e.changedTouches[0].clientX - touchStart;
    if (dx > 50) prev();
    else if (dx < -50) next();
    setTouchStart(null);
  };

  const active = index !== null ? images[index] : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setIndex(i)}
            className="group relative overflow-hidden rounded-xl"
            aria-label={img.caption ?? "photo"}
          >
            <img
              src={`/uploads/${img.filename}`}
              alt={img.caption ?? ""}
              className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
              loading={i < 6 ? "eager" : "lazy"}
            />
            <span
              className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/70 via-ink/0 to-transparent p-3 text-left opacity-0 transition duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 motion-safe:translate-y-1 motion-safe:group-hover:translate-y-0"
            >
              {img.caption && (
                <span className="line-clamp-2 text-sm text-cream">
                  {img.caption}
                </span>
              )}
              <span className="mt-1 text-[10px] uppercase tracking-[0.25em] text-cream/80">
                ↗ view
              </span>
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <button
              className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-cream hover:bg-white/20"
              onClick={close}
              aria-label="Close"
            >
              ✕
            </button>
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-cream hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Previous"
            >
              ‹
            </button>
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-cream hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Next"
            >
              ›
            </button>
            <motion.div
              key={active.id}
              className="flex max-h-[90vh] max-w-[92vw] flex-col items-center gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={`/uploads/${active.filename}`}
                alt={active.caption ?? ""}
                className="max-h-[80vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
              />
              {active.caption && (
                <p className="max-w-xl text-center text-sm text-cream/80">
                  {active.caption}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
