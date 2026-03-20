"use client";
// app/marketplace/[id]/components/ImageGallery.tsx
// Product-style image gallery — thumbnail rail + large main image.
// Supports keyboard navigation and click-to-zoom lightbox.

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, ImageIcon } from "lucide-react";

interface Props {
  images: string[];
  title:  string;
}

export default function ImageGallery({ images, title }: Props) {
  const [active,    setActive]    = useState(0);
  const [lightbox,  setLightbox]  = useState(false);

  const prev = useCallback(() => setActive(i => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setActive(i => (i + 1) % images.length), [images.length]);

  // Keyboard navigation in lightbox
  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape")     setLightbox(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, prev, next]);

  // Lock scroll when lightbox open
  useEffect(() => {
    document.body.style.overflow = lightbox ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [lightbox]);

  if (!images.length) {
    return (
      <div className="w-full aspect-video bg-gray-800 rounded-2xl flex items-center justify-center border border-gray-700">
        <ImageIcon className="w-12 h-12 text-gray-600" />
      </div>
    );
  }

  return (
    <>
      {/* ── Main image ── */}
      <div className="flex flex-col gap-3">
        <div
          className="relative w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 group cursor-zoom-in"
          onClick={() => setLightbox(true)}
        >
          <img
            src={images[active]}
            alt={`${title} — image ${active + 1}`}
            className="w-full h-full object-cover transition-opacity duration-300"
          />

          {/* Zoom hint */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1 text-white text-xs">
            <ZoomIn className="w-3.5 h-3.5" /> Click to zoom
          </div>

          {/* Nav arrows — only show when multiple images */}
          {images.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); prev(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition hover:bg-black/80"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); next(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition hover:bg-black/80"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
              {active + 1} / {images.length}
            </div>
          )}
        </div>

        {/* ── Thumbnail rail ── */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {images.map((url, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition ${
                  i === active
                    ? "border-purple-500 opacity-100"
                    : "border-gray-700 opacity-60 hover:opacity-90 hover:border-gray-500"
                }`}
              >
                <img src={url} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightbox(false)}
        >
          {/* Close */}
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            {active + 1} / {images.length}
          </div>

          {/* Main lightbox image */}
          <div
            className="relative max-w-5xl w-full mx-4 flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={images[active]}
              alt={`${title} — image ${active + 1}`}
              className="max-h-[85vh] max-w-full object-contain rounded-xl"
            />

            {images.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Lightbox thumbnails */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 px-4">
              {images.map((url, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setActive(i); }}
                  className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition ${
                    i === active ? "border-purple-400 opacity-100" : "border-white/20 opacity-50 hover:opacity-80"
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}