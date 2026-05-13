// Renders an image with one or more bounding-box annotations drawn on top
// in SVG. Used inside Live Tutor chat messages when the AI is in "point"
// mode (returns spatial coordinates for UI elements).
//
// Props:
//   src   — image data URL or HTTP URL (the captured screenshot)
//   boxes — array of { label, bbox: [x, y, w, h] } where each coord is a
//           PERCENTAGE of the image dimensions (0-100)
//   alt   — optional alt text for the image
//
// Implementation notes:
//   • The SVG sits over the image with viewBox="0 0 100 100" and
//     preserveAspectRatio="none" so percentage coords map cleanly.
//   • A subtle blue rectangle stroke (no fill) is drawn for each box.
//   • A label tab is anchored to the top-left of each box. It's offset
//     INSIDE the box if the box is too close to the top edge to fit it
//     above — keeps labels from clipping out of frame.
//   • Box hover bumps stroke width + fills the label tab — pure CSS hover,
//     no React state needed.

import { useState, useRef, useEffect } from "react";

export default function AnnotationOverlay({ src, boxes, alt = "Captured screen" }) {
  const wrapRef = useRef(null);
  const [hovered, setHovered] = useState(null);

  // Track wrap size so we can position the label-tab divs in pixel space
  // (better text rendering than positioning labels inside the SVG, where
  // font scaling is fiddly with non-square preserveAspectRatio).
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!src) return null;

  return (
    <div
      ref={wrapRef}
      className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/40"
    >
      <img src={src} alt={alt} className="block w-full h-auto" />

      {boxes && boxes.length > 0 && (
        <>
          {/* SVG box layer — covers full image; percentage coords */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden="true"
          >
            {boxes.map((b, i) => {
              const [x, y, w, h] = b.bbox;
              const isHover = hovered === i;
              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill="rgba(56, 189, 248, 0.12)"
                  stroke="#38BDF8"
                  strokeWidth={isHover ? 0.55 : 0.35}
                  vectorEffect="non-scaling-stroke"
                  rx="0.5"
                  className="transition-all duration-150"
                  style={{ filter: isHover ? "drop-shadow(0 0 6px rgba(56,189,248,0.7))" : "drop-shadow(0 0 3px rgba(56,189,248,0.4))" }}
                />
              );
            })}
          </svg>

          {/* Label tabs — positioned in pixel space, separate from the SVG.
              Each tab is anchored to its box's top-left. Tab sits ABOVE the
              box, or INSIDE if the box hugs the top edge. */}
          {size.w > 0 && boxes.map((b, i) => {
            const [x, y, w] = b.bbox;
            const isHover = hovered === i;

            // pixel position of the box's top-left
            const px = (x / 100) * size.w;
            const py = (y / 100) * size.h;
            const pw = (w / 100) * size.w;

            // tab "wants" to sit above the box; if there isn't enough room
            // (box top < 24px from image top), put it inside the box instead.
            const above = py >= 28;
            const top = above ? py - 24 : py + 4;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: px,
                  top,
                  maxWidth: Math.max(80, pw),
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                className={`text-[11px] font-bold rounded-md px-2 py-0.5 truncate cursor-default transition-colors duration-150
                  ${isHover
                    ? "bg-sky-500 text-white shadow-md"
                    : "bg-sky-400 text-white shadow-sm"}`}
              >
                {b.label}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
