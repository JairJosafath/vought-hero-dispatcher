---
name: architecture-diagrams
description: Generate editable Excalidraw architecture diagrams with real vendor icons (AWS, Azure, GCP, Kubernetes, languages, frameworks) pulled from theSVG registry. Use for C4 diagrams (context/container/component/code), cloud architecture, network/VPC layouts, data flows, deployment topologies, or any request to "draw", "diagram", "visualize the architecture", or produce a .excalidraw file.
---

# Architecture diagrams as code

Diagrams are written as a **build script**, not drawn. Each script declares its
nodes and flows as data, pulls icons from [theSVG](https://thesvg.org) at build
time, and emits one self-contained `.excalidraw` file with every icon base64-embedded.

Why this shape: the output opens offline in any Excalidraw, stays fully editable
by hand, diffs as text, and regenerates from the same script when the architecture
changes. Iterate on the script; never hand-edit the generated JSON.

## Workflow

**1 — Find the slugs.** Never guess them; a wrong slug fails the build.

```bash
node .claude/skills/architecture-diagrams/scripts/find-icons.mjs dynamodb lambda golang postgres
```

`--prefix=aws-` / `--category=Database` / `--limit=N` narrow it. ~6,500 icons: all
AWS, Azure, GCP, Kubernetes, plus languages, frameworks, and databases.

**2 — Write the script** in `diagrams/src/<name>.mjs`. Start from
`examples/three-layer-web.mjs` — it is a complete, working diagram. Structure:

```js
import { loadIconsStrict } from "<skill>/lib/thesvg.mjs";
import { createDiagram, C, MID, NODE_BOTTOM, columns } from "<skill>/lib/diagram.mjs";

const NODES = { app: [["aws-aws-lambda", "Dispatch API\nGo"]] };   // content as data
const { icons, files } = await loadIconsStrict(Object.values(NODES).flat().map(([s]) => s));

const d = createDiagram({ name: "…", icons, files });
d.title("…", { cx: 1040, subtitle: "…" });
d.container({ x, y, width, height, stroke: C.vpc, title: "VPC · 10.0.0.0/16", dashed: false });
d.icons(NODES.app, columns(3, 500, 1300), 900);
d.flow([[x1, y1], [x1, y2], [x2, y2]]);        // elbowed, orthogonal
d.note("gRPC", cx, y);
d.write("diagrams/dist/<name>.excalidraw");
```

**3 — Build, lint, and look at it.**

```bash
node diagrams/src/<name>.mjs && node .claude/skills/architecture-diagrams/scripts/lint-scene.mjs diagrams/dist/<name>.excalidraw
```

The linter catches what the eye skims past: text on text, captions escaping their
box, arrows piercing labels, text landing on an icon. It exits non-zero on errors.

Then start the preview and *actually look* — the linter finds collisions, not bad
composition. Crowding, muddled flow, and a diagram that simply doesn't read are
only visible on the canvas.

```bash
node .claude/skills/architecture-diagrams/preview/server.mjs
```

It serves `http://localhost:4173`, lists every scene in `diagrams/dist/`, and sets
`window.__preview = { ok, elements, images }` once a scene renders. Prefer starting
it via `preview_start` so the Browser pane is available.

**4 — Iterate on the script.** Adjust coordinates, rebuild, re-look.

## API

`lib/diagram.mjs` — the layer to write against.

| Call | Draws |
| --- | --- |
| `createDiagram({ name, icons, files })` | a scene; `.els` is the raw element list |
| `.title(t, { cx, y, subtitle, size })` | centred heading |
| `.container({ x, y, width, height, stroke, fill, title, subtitle, dashed })` | labelled boundary box |
| `.box({ x, y, width, height, lines, stroke, fill })` | plain box with centred text — actors, external systems |
| `.icon({ slug, caption, cx, y, size })` | one icon + caption; returns its bounding box |
| `.icons([[slug, caption]…], xs, y)` | a row of them on column centres `xs` |
| `.flow([[x,y]…], { color, style, width })` | multi-segment arrow with crisp elbows |
| `.link([x,y], [x,y], opts)` | straight arrow |
| `.note(t, cx, y, color, size)` | small centred caption |
| `.person({ cx, y, name, role })` | C4 actor — head, shoulders, name, role |
| `.system({ x, y, width, height, title, type, desc, external })` | C4 system/container box with wrapped description |
| `.write(path)` | serialise; logs element/icon count and size |

Helpers: `C` (palette), `ICON`, `MID(y)`, `NODE_BOTTOM(y, {lines})`,
`columns(n, left, right)`, `columnsIn(n, x, width, pad)`, `wrap(text, max)`.

theSVG is a **brand** registry — it has no generic person, document, or globe
glyph (`k8s-user` is Kubernetes-branded and reads as one). Draw actors with
`.person()`; save the icons for C2/C3/deployment, where real technology appears.

`lib/excalidraw.mjs` (`rectangle`, `ellipse`, `diamond`, `text`, `label`, `image`,
`arrow`, `arrowPath`, `iconNode`, `scene`, `FONT`) is the raw element layer — drop
to it only for shapes `diagram.mjs` doesn't cover.

**Read `reference/layout.md` before choosing coordinates.** It has the spacing
table, the nesting and z-order rules, arrow routing conventions, the palette, and
the failure modes worth avoiding.

## Conventions

- Diagrams live in `diagrams/src/*.mjs`, output in `diagrams/dist/*.excalidraw`.
- One script per diagram, named for its C4 level: `c1-context.mjs`,
  `c2-containers.mjs`, `c3-<system>-components.mjs`.
- Content as data at the top of the file; drawing code below. A reader should be
  able to update the architecture without touching a coordinate.
- Icon cache lands in `.cache/thesvg/` (override with `THESVG_CACHE`). Worth
  gitignoring — it re-fetches on demand.
- Node 18+. No dependencies, no install step.

## Stencil sheets

A grid of every icon in a family, to copy/paste from while editing by hand:

```bash
node .claude/skills/architecture-diagrams/scripts/build-stencils.mjs --prefix=aws- --exclude=aws-res- --title="AWS" --out=diagrams/dist/aws-stencils.excalidraw
```

Excalidraw's clipboard carries the `files` entry with the element, so a pasted
icon arrives fully self-contained. Note a full AWS sheet is ~2 MB.
