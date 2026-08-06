#!/usr/bin/env node
/**
 * Builds a stencil sheet: one .excalidraw scene laying out every icon in a set
 * on a labelled grid. Open it in a second Excalidraw tab and copy/paste icons
 * into a hand-drawn diagram -- Excalidraw's clipboard carries the `files` entry
 * along with the element, so a pasted icon lands fully self-contained.
 *
 *   node build-stencils.mjs --prefix=aws- --exclude=aws-res- --out=diagrams/dist/aws-stencils.excalidraw
 *   node build-stencils.mjs --prefix=k8s- --title="Kubernetes"
 *   node build-stencils.mjs --slugs=go,rust,typescript,python,postgresql --title="Tech stack"
 */
import { getRegistry, loadIcons } from "../lib/thesvg.mjs";
import { scene, rectangle, label, iconNode } from "../lib/excalidraw.mjs";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const hit = argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};

const prefix = arg("prefix");
const excludes = (arg("exclude") ?? "").split(",").filter(Boolean);
const slugList = (arg("slugs") ?? "").split(",").filter(Boolean);
const title = arg("title", prefix ? `${prefix}* icons` : "Stencils");
const out = resolve(arg("out", "diagrams/dist/stencils.excalidraw"));

if (!prefix && !slugList.length) {
  console.error("need --prefix=<slug-prefix> or --slugs=a,b,c");
  process.exit(1);
}

const COLS = 8;
const CELL_W = 165;
const CELL_H = 145;
const PAD = 60;
const GROUP_GAP = 54;

/** "Amazon Elastic Container Service" -> "Elastic Container Service" */
const cleanTitle = (t) => t.replace(/^(Amazon|AWS)\s+/i, "").replace(/\s*\(.*?\)\s*$/, "").trim() || t;

const { icons: registry } = await getRegistry();

let groups;
if (slugList.length) {
  const bySlug = new Map(registry.map((i) => [i.slug, i]));
  groups = [{ name: title, icons: slugList.map((s) => [s, cleanTitle(bySlug.get(s)?.title ?? s)]) }];
} else {
  const pool = registry.filter(
    (i) => i.slug.startsWith(prefix) && !excludes.some((p) => i.slug.startsWith(p)),
  );
  const byCat = new Map();
  for (const icon of pool) {
    const cat = icon.categories?.[0] ?? "Other";
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push([icon.slug, cleanTitle(icon.title)]);
  }
  groups = [...byCat.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, icons]) => ({ name, icons }));
}

const allSlugs = [...new Set(groups.flatMap((g) => g.icons.map(([s]) => s)))];
console.log(`${groups.length} group(s), ${allSlugs.length} icons`);

const { icons, files, missing } = await loadIcons(allSlugs);
if (missing.length) {
  console.warn(`  skipped ${missing.length} unresolved slug(s):`);
  missing.forEach((m) => console.warn(`    - ${m}`));
}

const elements = [];
let y = PAD;

elements.push(label({ text: title, cx: PAD + (COLS * CELL_W) / 2, y, fontSize: 36, strokeColor: "#1e1e1e" }));
y += 52;
elements.push(
  label({
    text: "Copy any icon and paste it into your diagram — the image travels with it.",
    cx: PAD + (COLS * CELL_W) / 2,
    y,
    fontSize: 16,
    strokeColor: "#868e96",
  }),
);
y += 60;

for (const group of groups) {
  const present = group.icons.filter(([slug]) => icons[slug]);
  if (!present.length) continue;

  const bandH = Math.ceil(present.length / COLS) * CELL_H + 46;

  elements.push(
    rectangle({
      x: PAD - 24,
      y: y - 12,
      width: COLS * CELL_W + 48,
      height: bandH,
      strokeColor: "#adb5bd",
      backgroundColor: "#f8f9fa",
      fillStyle: "solid",
      strokeStyle: "dashed",
      strokeWidth: 1,
      roughness: 0,
      locked: true, // so dragging an icon out never drags the band with it
    }),
  );
  elements.push({
    ...label({ text: group.name, cx: 0, y: y + 4, fontSize: 20, strokeColor: "#495057" }),
    x: PAD - 8,
    textAlign: "left",
  });

  present.forEach(([slug, caption], i) => {
    const node = iconNode({
      icon: icons[slug],
      caption,
      cx: PAD + (i % COLS) * CELL_W + CELL_W / 2,
      y: y + 40 + Math.floor(i / COLS) * CELL_H,
      size: 64,
      fontSize: 13,
    });
    elements.push(...node.elements);
  });

  y += bandH + GROUP_GAP;
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(scene({ elements, files, name: title }), null, 2), "utf8");
const kb = (Buffer.byteLength(readFileSync(out)) / 1024).toFixed(0);
console.log(`  wrote ${out}  (${elements.length} elements, ${Object.keys(files).length} images, ${kb} KB)`);
