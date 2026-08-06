/**
 * Minimal element factories for the Excalidraw scene format (v2).
 *
 * Only the fields Excalidraw's `restore()` does not reliably default are set
 * explicitly. `index` (the fractional index used for z-ordering) is left off on
 * purpose -- restore() calls syncInvalidIndices() and assigns valid ones from
 * array order, which is exactly what we want. So: push elements in the order you
 * want them stacked, background first.
 */
import { randomBytes } from "node:crypto";

const rand = () => randomBytes(4).readUInt32BE(0);
let counter = 0;
export const uid = (prefix = "el") =>
  `${prefix}_${Date.now().toString(36)}_${(counter++).toString(36)}_${randomBytes(4).toString("hex")}`;

const base = (o) => ({
  id: o.id ?? uid(o.type),
  type: o.type,
  x: o.x,
  y: o.y,
  width: o.width,
  height: o.height,
  angle: 0,
  strokeColor: o.strokeColor ?? "#1e1e1e",
  backgroundColor: o.backgroundColor ?? "transparent",
  fillStyle: o.fillStyle ?? "solid",
  strokeWidth: o.strokeWidth ?? 2,
  strokeStyle: o.strokeStyle ?? "solid",
  roughness: o.roughness ?? 1,
  opacity: o.opacity ?? 100,
  groupIds: o.groupIds ?? [],
  frameId: null,
  roundness: o.roundness ?? null,
  seed: rand(),
  version: 1,
  versionNonce: rand(),
  isDeleted: false,
  boundElements: null,
  updated: Date.now(),
  link: o.link ?? null,
  locked: o.locked ?? false,
});

export const rectangle = (o) => ({
  ...base({ ...o, type: "rectangle" }),
  roundness: o.roundness === null ? null : o.roundness ?? { type: 3 },
});

export const ellipse = (o) => ({ ...base({ ...o, type: "ellipse" }) });

export const diamond = (o) => ({ ...base({ ...o, type: "diamond" }) });

/** Excalifont (the hand-drawn default). See FONT_FAMILY in @excalidraw/common. */
export const FONT = { hand: 5, normal: 6, code: 3 };

// Excalifont is roughly 0.50x its font size per character at these sizes. Close
// enough for centring; Excalidraw recomputes exact metrics when the text is edited.
const CHAR_W = 0.5;
const LINE_HEIGHT = 1.25;

/** Estimated on-canvas width of a string -- useful for sizing boxes around text. */
export const textWidth = (s, fontSize = 16) =>
  Math.max(...String(s).split("\n").map((l) => l.length)) * fontSize * CHAR_W;

export function text(o) {
  const lines = String(o.text).split("\n");
  const fontSize = o.fontSize ?? 16;
  const width = o.width ?? textWidth(o.text, fontSize);
  const height = o.height ?? lines.length * fontSize * LINE_HEIGHT;
  return {
    ...base({ ...o, type: "text", width, height }),
    text: o.text,
    fontSize,
    fontFamily: o.fontFamily ?? FONT.hand,
    textAlign: o.textAlign ?? "center",
    verticalAlign: o.verticalAlign ?? "top",
    containerId: null,
    originalText: o.text,
    autoResize: true,
    lineHeight: LINE_HEIGHT,
  };
}

/** Text centred horizontally on `cx`, top edge at `y`. */
export const label = (o) => {
  const t = text({ ...o, x: 0, y: o.y });
  return { ...t, x: o.cx - t.width / 2 };
};

export const image = (o) => ({
  ...base({ ...o, type: "image", strokeColor: "transparent", backgroundColor: "transparent" }),
  fileId: o.fileId,
  status: "saved",
  scale: [1, 1],
  crop: null,
});

/** Straight arrow from [x1,y1] to [x2,y2]. */
export function arrow(o) {
  const [x1, y1] = o.from;
  const [x2, y2] = o.to;
  return {
    ...base({
      ...o,
      type: "arrow",
      x: x1,
      y: y1,
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
      strokeColor: o.strokeColor ?? "#1971c2",
      roundness: o.roundness ?? { type: 2 },
    }),
    points: [
      [0, 0],
      [x2 - x1, y2 - y1],
    ],
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: o.startArrowhead ?? null,
    endArrowhead: o.endArrowhead ?? "arrow",
    elbowed: false,
  };
}

/**
 * Orthogonal / multi-segment arrow through a list of absolute points.
 * Excalidraw stores points relative to the element origin, so the first point
 * becomes [0,0] and the rest are offsets from it.
 */
export function arrowPath(o) {
  const pts = o.points;
  const [ox, oy] = pts[0];
  const rel = pts.map(([x, y]) => [x - ox, y - oy]);
  const xs = rel.map((p) => p[0]);
  const ys = rel.map((p) => p[1]);
  return {
    ...base({
      ...o,
      type: "arrow",
      x: ox,
      y: oy,
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
      strokeColor: o.strokeColor ?? "#1971c2",
      roundness: o.roundness ?? { type: 2 },
    }),
    points: rel,
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: o.startArrowhead ?? null,
    endArrowhead: o.endArrowhead ?? "arrow",
    elbowed: false,
  };
}

/** Serialise a complete scene. `files` comes from lib/thesvg.mjs. */
export const scene = ({ elements, files = {}, background = "#ffffff", name }) => ({
  type: "excalidraw",
  version: 2,
  source: "https://github.com/JairJosafath/thesvg",
  elements,
  appState: {
    gridSize: 20,
    gridStep: 5,
    gridModeEnabled: false,
    viewBackgroundColor: background,
    ...(name ? { name } : {}),
  },
  files,
});

/**
 * One reusable "icon + caption" unit, centred on `cx` with the icon's top at `y`.
 * Returns elements already tied together with a shared groupId so a single click
 * in Excalidraw selects the icon and its label.
 */
export function iconNode({ icon, caption, cx, y, size = 64, fontSize = 14, groupIds = [] }) {
  const g = [...groupIds, uid("grp")];
  const { w, h } = icon.aspect;
  const width = w >= h ? size : (size * w) / h;
  const height = h >= w ? size : (size * h) / w;

  const img = image({
    fileId: icon.fileId,
    x: cx - width / 2,
    y,
    width,
    height,
    groupIds: g,
  });

  const cap = label({
    text: caption,
    cx,
    y: y + height + 8,
    fontSize,
    groupIds: g,
    strokeColor: "#1e1e1e",
  });

  return {
    elements: [img, cap],
    groupId: g[g.length - 1],
    box: { cx, top: y, bottom: cap.y + cap.height, left: cx - width / 2, right: cx + width / 2 },
  };
}
