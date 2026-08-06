# Layout, palette, and the things that bite

Everything here was learned by generating diagrams that came out wrong. Read the
relevant section before inventing your own numbers.

## The canvas

Excalidraw's coordinate space is unbounded and y grows downward. There is no
"page". Pick an origin around `(0, 0)` and let the diagram grow right and down;
`scrollToContent` in the preview fits whatever you produce.

A comfortable full-architecture canvas is roughly **1800 × 1500**. Wider than
~2400 and the text gets small relative to the whole when someone fits it to
screen. If a diagram wants to be bigger than that, it wants to be two diagrams —
which is exactly what C4 levels are for.

## Vertical rhythm

Bands stack top to bottom, each band holding one row of icons.

| Thing | Value |
| --- | --- |
| Icon size | `64` (`48`–`56` for secondary/shared columns) |
| Icon → caption gap | `8` |
| Caption line height | `fontSize × 1.25` (so a 2-line 13px caption is ~33px) |
| Band height, 1 icon row | `210` |
| Gap between bands | `40` |
| Container title inset | `+16 x`, `+12 y` from the box corner |
| Container subtitle | `+36 y` from the box corner |

Two helpers do the arithmetic that actually matters:

```js
MID(y)         // vertical centre of an icon row → where horizontal arrows sit
NODE_BOTTOM(y) // bottom of icon + caption      → where downward arrows start
```

`NODE_BOTTOM` defaults to a 2-line caption. Pass `{ lines: 1 }` when the caption
is one line, or arrows will start with a visible gap under the text.

**Keep every caption in a row the same line count.** Mixed 1- and 2-line captions
make a row look ragged and break the shared `NODE_BOTTOM` for that row. Pad the
short one with a second line rather than fixing it with per-node offsets.

## Horizontal rhythm

Column centres, not left edges. `columns(n, left, right)` spreads `n` centres
evenly; `columnsIn(n, x, width, pad)` does the same inside a container.

Six icons across a 1410-wide band want ~235px spacing. Below ~180px, two-line
captions start colliding — either drop a column or shorten the captions.

## Containers

Nesting order for AWS, outermost first:

```
AWS Cloud  →  Region  →  VPC  →  Subnet  →  (band)
```

- **Solid stroke** = a real boundary: AWS Cloud, Region, VPC, an account.
- **Dashed stroke** = a logical grouping: a layer, a tier, a pair of subnets.
- Tint bands with a soft `fill` and colour the stroke to match; leave structural
  boundaries (Cloud, Region, VPC) unfilled so the tints stay readable.
- Push containers before their contents. Array order is z-order, so a container
  added after its icons paints over them.

Give a container ~40px of padding on each side beyond the band it holds, and
~70px at the top when it has both a title and a subtitle.

## Arrows

```js
d.flow([[x1, y1], [x2, y2], [x3, y3]]);       // elbows, orthogonal
d.link([x1, y1], [x2, y2]);                    // straight/curved, loose links
```

- `flow` sets `roundness: null`. **Do not remove that.** With roundness on,
  Excalidraw draws a spline through the waypoints and orthogonal routing turns
  into spaghetti.
- Route with 90° turns and pick a clear "channel" y (or x) between bands to run
  along. Two arrows sharing a channel should be ~10–16px apart.
- Leave a `6`px gap between an arrowhead and the icon it points at: end at
  `y - 6` above a row, start at `NODE_BOTTOM(y) + 4` below one.
- **No double-headed arrows.** A head at each end with two labels stacked above
  it makes the reader guess which label belongs to which direction, and it reads
  as confusion rather than as a relationship. Draw two arrows instead — request
  above, response below, each label hugging its own arrow on the *outside* (the
  request's above it, the response's below it) so each can only be read one way.
  Give the response a lighter stroke so the primary path still leads the eye.
  Budget ~150px of gap for a labelled pair; 120px is where it starts to hurt.
- Style carries meaning, and the diagram should say which is which in a legend:
  - solid `C.flow` blue — the request path
  - dashed `C.aux` grey — secondary / async / egress
  - dashed in a band's own colour — replication, sync between peers
- Label anything non-obvious with `note()` at ~26px above a horizontal arrow, or
  just past the elbow on a vertical one.

## Palette

`C` in `lib/diagram.mjs` is AWS's own diagram palette. Using it is what makes the
output read as an AWS diagram rather than a generic box drawing.

| Token | Colour | Use |
| --- | --- | --- |
| `C.cloud` | `#232F3E` | AWS Cloud boundary (squid ink) |
| `C.region` | `#00A4A6` | Region boundary |
| `C.vpc` | `#8C4FFF` | VPC boundary |
| `C.edge` | purple | edge / presentation band |
| `C.public` | green | public subnets |
| `C.app` | orange | compute / application band |
| `C.data` | magenta | database band |
| `C.shared` | red | shared services (IAM, secrets, observability) |
| `C.ai` | teal | ML / AI band |
| `C.ink` / `C.muted` / `C.aux` | greys | text, subtitles, secondary arrows |

For non-AWS diagrams (C4 context/container levels), `C.neutral` plus one accent
per actor type reads better than the full AWS palette.

## Icons

- **Never guess a slug.** Run `scripts/find-icons.mjs <term>` first. `loadIconsStrict`
  will refuse to build on an unknown slug, which is the intended failure mode.
- `aws-res-*` are the small "resource" icons (an ALB, a NAT gateway, an internet
  gateway). They're the right choice inside a VPC; the plain service icons are
  right at the service level. Exclude `aws-res-` when building a stencil sheet or
  you get near-duplicates.
- `aws-group-*` are the boundary/frame graphics. This skill draws boundaries with
  real rectangles instead, which stay editable — so those are rarely needed.
- Icons keep their aspect ratio: `size` is the longer edge, not the width.
- Every icon is base64-embedded in the `.excalidraw` file. It opens offline and
  with no CDN. That also means file size scales with icon count — a full 740-icon
  AWS stencil sheet is ~2.2 MB, while a normal architecture diagram is ~150 KB.
- AWS icons are CC-BY-ND-2.0. Fine for architecture docs; don't redraw them.

## Fonts

`FONT.hand` (Excalifont, the default) suits sketch-style architecture. `FONT.normal`
is Nunito, `FONT.code` is Comic Shanns. Width is estimated at `0.5 × fontSize` per
character — good enough to centre text, and Excalidraw recomputes exact metrics the
moment anyone edits the text.

Sizes that work: title `36`, container title `18`, container subtitle `13`,
icon caption `13`, arrow note `12`.
