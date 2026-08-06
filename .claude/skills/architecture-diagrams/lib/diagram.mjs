/**
 * The layer you actually write diagrams against.
 *
 * `createDiagram()` hands back a small set of verbs -- container, icons, flow,
 * note, title -- bound to one element list, plus `write()`. Elements accumulate
 * in call order, and call order is z-order, so the usual shape of a build script
 * is: title, then containers outermost-first, then icons, then arrows.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { scene, rectangle, ellipse, text, label, iconNode, arrowPath, arrow } from "./excalidraw.mjs";

/**
 * Greedy word wrap to `max` characters per line. Excalidraw does not wrap text
 * elements itself -- a long description stays one very wide line and blows the
 * layout apart -- so descriptions have to be wrapped before they're drawn.
 */
export function wrap(s, max = 30) {
  const out = [];
  let line = "";
  for (const word of String(s).split(/\s+/)) {
    if (!line.length) line = word;
    else if (line.length + 1 + word.length <= max) line += ` ${word}`;
    else {
      out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  return out.join("\n");
}

/**
 * AWS's own architecture-diagram palette, plus neutrals. Using the vendor colours
 * for boundaries (VPC purple, region teal) is what makes a generated diagram read
 * as "an AWS diagram" at a glance.
 */
export const C = {
  ink: "#1e1e1e",
  muted: "#868e96",
  aux: "#adb5bd",
  flow: "#1971c2",

  cloud: "#232F3E", // AWS squid ink
  region: "#00A4A6",
  vpc: "#8C4FFF",

  // stroke/fill pairs for banded layers
  edge: { stroke: "#8C4FFF", fill: "#f6f2ff" },
  public: { stroke: "#7AA116", fill: "#f5faed" },
  app: { stroke: "#ED7100", fill: "#fff6ee" },
  data: { stroke: "#C925D1", fill: "#fdf1fe" },
  shared: { stroke: "#DD344C", fill: "#fff5f6" },
  ai: { stroke: "#01A88D", fill: "#eefaf8" },
  neutral: { stroke: "#adb5bd", fill: "#f8f9fa" },
};

/** AWS service-category colours, for tinting a band to match its contents. */
export const CATEGORY = {
  compute: "#ED7100",
  containers: "#ED7100",
  storage: "#7AA116",
  database: "#C925D1",
  networking: "#8C4FFF",
  security: "#DD344C",
  analytics: "#8C4FFF",
  integration: "#E7157B",
  ml: "#01A88D",
  management: "#E7157B",
};

export function createDiagram({ name, background = "#ffffff", icons = {}, files = {} } = {}) {
  const els = [];
  const add = (...e) => {
    els.push(...e);
    return e[0];
  };

  const api = {
    els,
    add,

    /** Big centred heading with an optional subtitle underneath. */
    title(t, { cx, y = 50, subtitle, size = 36 } = {}) {
      add(label({ text: t, cx, y, fontSize: size, strokeColor: C.ink }));
      if (subtitle) {
        add(label({ text: subtitle, cx, y: y + size + 14, fontSize: 16, strokeColor: C.muted }));
      }
      return api;
    },

    /**
     * A labelled boundary box: AWS Cloud, a Region, a VPC, a subnet, a band.
     * Solid stroke reads as a hard boundary (cloud, VPC); dashed as a logical
     * grouping (a layer, a subnet pair). Title sits inside the top-left corner.
     */
    container({
      x, y, width, height,
      stroke = C.aux,
      fill,
      title,
      subtitle,
      dashed = true,
      strokeWidth = 2,
      roughness = 1,
    }) {
      add(
        rectangle({
          x, y, width, height,
          strokeColor: stroke,
          backgroundColor: fill ?? "transparent",
          fillStyle: "solid",
          strokeStyle: dashed ? "dashed" : "solid",
          strokeWidth,
          roughness,
        }),
      );
      if (title) {
        add(text({ text: title, x: x + 16, y: y + 12, fontSize: 18, textAlign: "left", strokeColor: stroke }));
      }
      if (subtitle) {
        add(text({ text: subtitle, x: x + 16, y: y + 36, fontSize: 13, textAlign: "left", strokeColor: C.muted }));
      }
      return api;
    },

    /** A plain box with centred text -- people, external systems, anything icon-less. */
    box({ x, y, width, height, lines = [], stroke = C.ink, fill = "#f8f9fa", strokeWidth = 2 }) {
      add(
        rectangle({
          x, y, width, height,
          strokeColor: stroke,
          backgroundColor: fill,
          fillStyle: "solid",
          strokeWidth,
          roughness: 1,
        }),
      );
      let ly = y + 24;
      lines.forEach(([t, size = 14, color = C.muted]) => {
        add(label({ text: t, cx: x + width / 2, y: ly, fontSize: size, strokeColor: color }));
        ly += size + 10;
      });
      return api;
    },

    /**
     * A C4 actor: head + shoulders, name, role. theSVG is a *brand* registry and
     * has no generic person glyph, so people are drawn rather than pulled.
     * Returns the box, including labels, for anchoring arrows.
     */
    person({ cx, y, name, role, color = C.ink, fill = "#e7e9ed", headD = 28, bodyW = 54, bodyH = 34 }) {
      add(
        ellipse({
          x: cx - headD / 2, y, width: headD, height: headD,
          strokeColor: color, backgroundColor: fill, fillStyle: "solid", strokeWidth: 2,
        }),
      );
      add(
        rectangle({
          x: cx - bodyW / 2, y: y + headD + 4, width: bodyW, height: bodyH,
          strokeColor: color, backgroundColor: fill, fillStyle: "solid", strokeWidth: 2,
          roundness: { type: 3 },
        }),
      );
      let ly = y + headD + bodyH + 12;
      add(label({ text: name, cx, y: ly, fontSize: 14, strokeColor: color }));
      ly += 20;
      if (role) {
        const r = wrap(role, 22);
        add(label({ text: r, cx, y: ly, fontSize: 11, strokeColor: C.muted }));
        ly += r.split("\n").length * 14;
      }
      return { cx, top: y, bottom: ly, left: cx - bodyW / 2, right: cx + bodyW / 2 };
    },

    /**
     * A C4 software-system / container box: title, bracketed type line, wrapped
     * description. `external: true` greys it out, the usual C4 signal for
     * "someone else's problem".
     */
    system({ x, y, width, height, title, type, desc, stroke = C.flow, fill = "#eaf3fb", external = false, wrapAt }) {
      const s = external ? C.muted : stroke;
      const f = external ? "#f1f3f5" : fill;
      add(
        rectangle({
          x, y, width, height,
          strokeColor: s, backgroundColor: f, fillStyle: "solid", strokeWidth: 2,
          roundness: { type: 3 },
        }),
      );
      const cx = x + width / 2;
      let ly = y + 14;
      const t = wrap(title, wrapAt ?? Math.floor(width / 9));
      add(label({ text: t, cx, y: ly, fontSize: 16, strokeColor: external ? C.ink : s }));
      ly += t.split("\n").length * 20 + 2;
      if (type) {
        add(label({ text: `[${type}]`, cx, y: ly, fontSize: 11, strokeColor: C.muted }));
        ly += 18;
      }
      if (desc) {
        const d = wrap(desc, wrapAt ?? Math.floor(width / 6.2));
        add(label({ text: d, cx, y: ly, fontSize: 12, strokeColor: C.muted }));
      }
      return { cx, top: y, bottom: y + height, left: x, right: x + width, cy: y + height / 2 };
    },

    /** One icon+caption node. Returns its box so you can anchor arrows to it. */
    icon({ slug, caption, cx, y, size = 64, fontSize = 13 }) {
      const ic = icons[slug];
      if (!ic) throw new Error(`icon "${slug}" was not loaded -- add it to the slug list`);
      const node = iconNode({ icon: ic, caption, cx, y, size, fontSize });
      add(...node.elements);
      return node.box;
    },

    /** A horizontal run of icon nodes: [[slug, caption], ...] laid out on `xs`. */
    icons(list, xs, y, { size = 64, fontSize = 13 } = {}) {
      return list.map(([slug, caption], i) =>
        api.icon({ slug, caption, cx: xs[i], y, size, fontSize }),
      );
    },

    /**
     * A multi-segment arrow through absolute points.
     * roundness:null keeps elbows crisp -- Excalidraw otherwise draws a swooping
     * curve through the waypoints, which turns orthogonal routing into spaghetti.
     */
    flow(points, { color = C.flow, width = 2, style = "solid", endArrowhead = "arrow", startArrowhead = null } = {}) {
      add(
        arrowPath({
          points,
          strokeColor: color,
          strokeWidth: width,
          strokeStyle: style,
          roughness: 1,
          roundness: null,
          endArrowhead,
          startArrowhead,
        }),
      );
      return api;
    },

    /** Straight arrow, curve allowed. Good for loose "talks to" links. */
    link(from, to, { color = C.flow, width = 2, style = "solid", endArrowhead = "arrow", startArrowhead = null } = {}) {
      add(arrow({ from, to, strokeColor: color, strokeWidth: width, strokeStyle: style, endArrowhead, startArrowhead }));
      return api;
    },

    /** Small centred caption -- arrow labels, protocol names, footnotes. */
    note(t, cx, y, color = C.muted, size = 12) {
      add(label({ text: t, cx, y, fontSize: size, strokeColor: color }));
      return api;
    },

    /** Serialise to disk. Path is resolved against the current working directory. */
    write(outPath) {
      const out = resolve(outPath);
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, JSON.stringify(scene({ elements: els, files, background, name }), null, 2), "utf8");
      const kb = (Buffer.byteLength(readFileSync(out)) / 1024).toFixed(0);
      console.log(`wrote ${out}\n  ${els.length} elements, ${Object.keys(files).length} embedded icons, ${kb} KB`);
      return out;
    },
  };

  return api;
}

// --------------------------------------------------------------- layout math
export const ICON = 64;

/** Vertical centre of an icon row whose tops sit at `y`. Arrows enter here. */
export const MID = (y, size = ICON) => y + size / 2;

/**
 * Real bottom edge of an icon node, caption included -- the y an arrow leaving
 * downward should start from. `lines` is the caption's line count.
 */
export const NODE_BOTTOM = (y, { size = ICON, lines = 2, fontSize = 13 } = {}) =>
  y + size + 8 + Math.round(lines * fontSize * 1.25);

/** `n` evenly spaced column centres spanning [left, right]. */
export const columns = (n, left, right) => {
  if (n === 1) return [(left + right) / 2];
  const step = (right - left) / (n - 1);
  return Array.from({ length: n }, (_, i) => Math.round(left + i * step));
};

/** `n` column centres inside a container of `width` at `x`, with even gutters. */
export const columnsIn = (n, x, width, pad = 90) => columns(n, x + pad, x + width - pad);
