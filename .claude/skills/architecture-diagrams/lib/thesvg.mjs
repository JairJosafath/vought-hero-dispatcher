/**
 * Fetches icons from theSVG (https://thesvg.org) and turns them into the
 * `files` payload that an .excalidraw scene needs.
 *
 * Everything is cached on disk so a rebuild is offline and the CDN is hit
 * exactly once per icon. The cache lives in the *consuming project* (not in the
 * skill directory) so it can be gitignored or committed per project's taste.
 * Override with THESVG_CACHE.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const CACHE = process.env.THESVG_CACHE ?? join(process.cwd(), ".cache", "thesvg");
const SVG_CACHE = join(CACHE, "svg");
const REGISTRY = join(CACHE, "registry.json");

const BASE = "https://thesvg.org";

/** Icon URL for a given slug/variant. Documented at https://thesvg.org/llms.txt */
export const iconUrl = (slug, variant = "default") =>
  `${BASE}/icons/${slug}/${variant}.svg`;

/** The full manifest: slug, title, aliases, categories, hex, license, variants. */
export async function getRegistry({ refresh = false } = {}) {
  mkdirSync(CACHE, { recursive: true });
  if (!refresh && existsSync(REGISTRY)) {
    return JSON.parse(readFileSync(REGISTRY, "utf8"));
  }
  const res = await fetch(`${BASE}/api/registry.json`);
  if (!res.ok) throw new Error(`registry fetch failed: ${res.status}`);
  const json = await res.json();
  writeFileSync(REGISTRY, JSON.stringify(json));
  return json;
}

/** Raw SVG source for a slug, disk-cached. */
export async function getSvg(slug, variant = "default") {
  mkdirSync(SVG_CACHE, { recursive: true });
  const cached = join(SVG_CACHE, `${slug}.${variant}.svg`);
  if (existsSync(cached)) return readFileSync(cached, "utf8");

  const res = await fetch(iconUrl(slug, variant));
  if (!res.ok) throw new Error(`icon "${slug}/${variant}" -> HTTP ${res.status}`);
  const svg = await res.text();
  writeFileSync(cached, svg, "utf8");
  return svg;
}

/** Intrinsic size, so non-square icons keep their aspect ratio on the canvas. */
export function svgAspect(svg) {
  const viewBox = svg.match(/viewBox\s*=\s*["']\s*[\d.-]+[ ,]+[\d.-]+[ ,]+([\d.]+)[ ,]+([\d.]+)/i);
  if (viewBox) return { w: parseFloat(viewBox[1]), h: parseFloat(viewBox[2]) };

  const w = svg.match(/\swidth\s*=\s*["']([\d.]+)/i);
  const h = svg.match(/\sheight\s*=\s*["']([\d.]+)/i);
  if (w && h) return { w: parseFloat(w[1]), h: parseFloat(h[1]) };

  return { w: 1, h: 1 };
}

/**
 * Excalidraw keys `files` by a content hash. Hashing the bytes (rather than
 * using a random id) means the same icon placed twice is stored once.
 */
export const fileIdFor = (svg) => createHash("sha1").update(svg).digest("hex");

/**
 * Resolve a list of slugs into { icons, files, missing }.
 *   icons: slug -> { fileId, aspect, title }
 *   files: the BinaryFiles map that goes straight into the .excalidraw scene
 */
export async function loadIcons(slugs, { variant = "default", registry } = {}) {
  const reg = registry ?? (await getRegistry());
  const bySlug = new Map(reg.icons.map((i) => [i.slug, i]));

  const icons = {};
  const files = {};
  const missing = [];

  for (const slug of slugs) {
    const meta = bySlug.get(slug);
    if (!meta) {
      missing.push(slug);
      continue;
    }
    // Not every icon ships every variant; fall back to `default`, which the
    // registry guarantees is always present.
    const v = meta.variants.includes(variant) ? variant : "default";

    let svg;
    try {
      svg = await getSvg(slug, v);
    } catch (err) {
      missing.push(`${slug} (${err.message})`);
      continue;
    }

    const fileId = fileIdFor(svg);
    icons[slug] = { fileId, aspect: svgAspect(svg), title: meta.title };
    files[fileId] = {
      mimeType: "image/svg+xml",
      id: fileId,
      dataURL: `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`,
      created: Date.now(),
      lastRetrieved: Date.now(),
    };
  }

  return { icons, files, missing };
}

/**
 * Load icons and fail loudly on anything unresolved. Use this in build scripts --
 * a diagram with a silently missing icon is worse than one that refuses to build.
 */
export async function loadIconsStrict(slugs, opts) {
  const result = await loadIcons([...new Set(slugs)], opts);
  if (result.missing.length) {
    console.error("Could not resolve these slugs:");
    result.missing.forEach((m) => console.error(`  - ${m}`));
    console.error("\nSearch for the right slug:  node .claude/skills/architecture-diagrams/scripts/find-icons.mjs <term>");
    process.exit(1);
  }
  return result;
}
