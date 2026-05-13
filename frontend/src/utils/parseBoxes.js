// Parses bounding-box annotations out of a Claude response in spatial mode.
//
// The model is prompted to emit ONE short prose sentence followed by a
// fenced JSON code block of the form:
//
//   ```json
//   [
//     {"label": "Buy button", "bbox": [72, 14, 18, 6]}
//   ]
//   ```
//
// Coords are PERCENTAGES of the image dimensions (0-100). We return:
//   {
//     prose: <string — everything before the ```json>,
//     boxes: [{ label, bbox: [x, y, w, h] }],
//     hadBlock: <bool — true if we found a JSON block at all>,
//     parseError: <Error | null>
//   }
//
// Defensive design:
//   - The model occasionally emits invalid JSON or coordinates outside 0-100.
//     We clamp coords and skip malformed entries; we don't throw.
//   - If no JSON block is present, prose === full text, boxes === [].
//   - If the JSON block is present but malformed, we keep prose and set
//     parseError so the UI can flag "couldn't parse boxes" if it wants.

const FENCE_RE = /```json\s*([\s\S]*?)```/i;

function clamp(v, lo, hi) {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.max(lo, Math.min(hi, v));
}

function normalizeBox(raw) {
  if (!raw || typeof raw !== "object") return null;
  const label = typeof raw.label === "string" ? raw.label.trim() : "";
  if (!Array.isArray(raw.bbox) || raw.bbox.length !== 4) return null;
  const [xRaw, yRaw, wRaw, hRaw] = raw.bbox.map((n) => Number(n));
  const x = clamp(xRaw, 0, 100);
  const y = clamp(yRaw, 0, 100);
  let w = clamp(wRaw, 0, 100);
  let h = clamp(hRaw, 0, 100);
  if (x === null || y === null || w === null || h === null) return null;
  // Trim box if it extends past the image edge — keep within frame
  if (x + w > 100) w = 100 - x;
  if (y + h > 100) h = 100 - y;
  // Reject zero-area boxes
  if (w <= 0 || h <= 0) return null;
  return { label: label || "Element", bbox: [x, y, w, h] };
}

export function parseBoxes(text) {
  if (!text || typeof text !== "string") {
    return { prose: text ?? "", boxes: [], hadBlock: false, parseError: null };
  }
  const match = text.match(FENCE_RE);
  if (!match) {
    return { prose: text.trim(), boxes: [], hadBlock: false, parseError: null };
  }
  const prose = text.slice(0, match.index).trim();
  const jsonText = match[1].trim();
  // Empty array — model intentionally returned no boxes
  if (jsonText === "" || jsonText === "[]") {
    return { prose, boxes: [], hadBlock: true, parseError: null };
  }
  try {
    const raw = JSON.parse(jsonText);
    if (!Array.isArray(raw)) {
      return { prose, boxes: [], hadBlock: true, parseError: new Error("JSON wasn't an array") };
    }
    const boxes = raw.map(normalizeBox).filter(Boolean);
    return { prose, boxes, hadBlock: true, parseError: null };
  } catch (e) {
    return { prose, boxes: [], hadBlock: true, parseError: e };
  }
}
