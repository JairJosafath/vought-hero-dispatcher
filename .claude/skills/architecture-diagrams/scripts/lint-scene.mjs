#!/usr/bin/env node
/**
 * Catch the layout faults you would otherwise only find by squinting at the
 * canvas: text sitting on top of other text, captions escaping their container,
 * arrows running through labels.
 *
 * Run it after every build. It is not a substitute for looking at the diagram,
 * but it finds the errors that looking tends to miss.
 *
 *   node lint-scene.mjs diagrams/dist/c1-context.excalidraw
 */
import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) {
  console.error("usage: lint-scene.mjs <scene.excalidraw>");
  process.exit(1);
}

const { elements } = JSON.parse(readFileSync(path, "utf8"));
const live = elements.filter((e) => !e.isDeleted);
const box = (e) => ({ l: e.x, r: e.x + e.width, t: e.y, b: e.y + e.height });
const overlap = (a, b, pad = 0) =>
  a.l < b.r - pad && b.l < a.r - pad && a.t < b.b - pad && b.t < a.b - pad;
const area = (a) => Math.max(0, a.r - a.l) * Math.max(0, a.b - a.t);
const intersection = (a, b) => ({
  l: Math.max(a.l, b.l), r: Math.min(a.r, b.r),
  t: Math.max(a.t, b.t), b: Math.min(a.b, b.b),
});

const texts = live.filter((e) => e.type === "text");
const arrows = live.filter((e) => e.type === "arrow");
const images = live.filter((e) => e.type === "image");
const shapes = live.filter((e) => e.type === "rectangle" || e.type === "ellipse" || e.type === "diamond");

const issues = [];
const short = (e) => (e.type === "text" ? JSON.stringify(e.text.split("\n")[0].slice(0, 34)) : e.type);

// -- text on text -----------------------------------------------------------
// The one that actually ruins a diagram. 2px of padding tolerates the width
// estimate being slightly off without hiding a real collision.
for (let i = 0; i < texts.length; i++) {
  for (let j = i + 1; j < texts.length; j++) {
    const a = box(texts[i]);
    const b = box(texts[j]);
    if (!overlap(a, b, 2)) continue;
    const frac = area(intersection(a, b)) / Math.min(area(a), area(b));
    issues.push({
      sev: frac > 0.25 ? "error" : "warn",
      msg: `text overlaps text (${Math.round(frac * 100)}%): ${short(texts[i])} × ${short(texts[j])}`,
      at: [Math.round(a.l), Math.round(a.t)],
    });
  }
}

// -- text on icon -----------------------------------------------------------
for (const t of texts) {
  for (const im of images) {
    if (overlap(box(t), box(im), 2)) {
      issues.push({ sev: "error", msg: `text sits on an icon: ${short(t)}`, at: [Math.round(t.x), Math.round(t.y)] });
    }
  }
}

// -- arrows through text ----------------------------------------------------
// Sampled along each segment rather than solved analytically: an arrow only has
// to miss labels, so point sampling at 6px is plenty and handles elbows for free.
for (const arrow of arrows) {
  const pts = arrow.points.map(([px, py]) => [arrow.x + px, arrow.y + py]);
  const hits = new Set();
  for (let s = 0; s < pts.length - 1; s++) {
    const [x1, y1] = pts[s];
    const [x2, y2] = pts[s + 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 6));
    for (let k = 0; k <= steps; k++) {
      const x = x1 + ((x2 - x1) * k) / steps;
      const y = y1 + ((y2 - y1) * k) / steps;
      for (const t of texts) {
        const b = box(t);
        // 3px inset: an arrow grazing a label's bounding box is fine, piercing it is not.
        if (x > b.l + 3 && x < b.r - 3 && y > b.t + 3 && y < b.b - 3) hits.add(t.id);
      }
    }
  }
  for (const id of hits) {
    const t = texts.find((e) => e.id === id);
    issues.push({ sev: "warn", msg: `arrow crosses text: ${short(t)}`, at: [Math.round(t.x), Math.round(t.y)] });
  }
}

// -- text escaping its container -------------------------------------------
// Only checked for text that clearly belongs to one shape (starts inside it).
for (const t of texts) {
  const tb = box(t);
  const host = shapes.find((s) => {
    const sb = box(s);
    return tb.l >= sb.l - 4 && tb.t >= sb.t - 4 && tb.l < sb.r && tb.t < sb.b;
  });
  if (host) {
    const hb = box(host);
    if (tb.r > hb.r + 4 || tb.b > hb.b + 4) {
      issues.push({
        sev: "error",
        msg: `text overflows its box (${Math.round(tb.r - hb.r)}px right, ${Math.round(tb.b - hb.b)}px down): ${short(t)}`,
        at: [Math.round(t.x), Math.round(t.y)],
      });
    }
  }
}

// -- report -----------------------------------------------------------------
const errs = issues.filter((i) => i.sev === "error");
const warns = issues.filter((i) => i.sev === "warn");
const bounds = live.reduce(
  (a, e) => ({
    l: Math.min(a.l, e.x), r: Math.max(a.r, e.x + e.width),
    t: Math.min(a.t, e.y), b: Math.max(a.b, e.y + e.height),
  }),
  { l: Infinity, r: -Infinity, t: Infinity, b: -Infinity },
);

console.log(`${path}`);
console.log(`  ${live.length} elements · canvas ${Math.round(bounds.r - bounds.l)}×${Math.round(bounds.b - bounds.t)} at (${Math.round(bounds.l)}, ${Math.round(bounds.t)})`);

const seen = new Set();
for (const i of [...errs, ...warns]) {
  const key = `${i.sev}${i.msg}`;
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(`  ${i.sev === "error" ? "ERROR" : "warn "}  (${i.at[0]}, ${i.at[1]})  ${i.msg}`);
}
console.log(`  ${errs.length} error(s), ${warns.length} warning(s)`);
process.exit(errs.length ? 1 : 0);
