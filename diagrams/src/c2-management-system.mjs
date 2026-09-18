import { createDiagram, C } from '../../.claude/skills/architecture-diagrams/lib/diagram.mjs';
import { loadIconsStrict } from '../../.claude/skills/architecture-diagrams/lib/thesvg.mjs';
import { image } from '../../.claude/skills/architecture-diagrams/lib/excalidraw.mjs';

// Deployment choices stay separate (D3). Object storage is a technology
// category, so it has no vendor-specific icon at container level.
const nodes = [
  { x: 420, y: 350, title: 'Management dashboard', type: 'TypeScript · authorized UI', desc: 'Shows utilisation, revenue and SLA metrics with freshness, gaps and report versions.', slug: 'typescript', palette: C.neutral },
  { x: 970, y: 350, title: 'Analytics and reports API', type: 'Go · Zone 1', desc: 'Authorizes scoped metrics, schedules reports and checks access on each download.', slug: 'go', palette: C.app },
  { x: 1520, y: 350, title: 'Report catalog', type: 'Postgres · Zone 1', desc: 'Scope references, schedules, durable jobs and versioned report manifests. No user PII.', slug: 'postgresql', palette: C.data },
  { x: 420, y: 800, title: 'Analytics intake API', type: 'Go · Zone 1', desc: 'Validates allowlisted redacted events; deduplicates IDs. Acknowledges durable receipt.', slug: 'go', palette: C.app },
  { x: 970, y: 800, title: 'Event inbox', type: 'Postgres · Zone 1', desc: 'Redacted events, source checkpoints, processing cursors and durable replay requests.', slug: 'postgresql', palette: C.data },
  { x: 1520, y: 800, title: 'ETL worker', type: 'Go · Zone 1', desc: 'Applies versioned transforms and corrections; detects gaps and publishes aggregates.', slug: 'go', palette: C.app },
  { x: 420, y: 1250, title: 'Analytics database', type: 'Postgres · Zone 1', desc: 'Curated metrics, lineage, definition versions and freshness. No operational queue.', slug: 'postgresql', palette: C.data },
  { x: 970, y: 1250, title: 'Report worker', type: 'Go · Zone 1', desc: 'Claims jobs, pins metric versions, generates reports and retires invalidated exports.', slug: 'go', palette: C.app },
  { x: 1520, y: 1250, title: 'Report store', type: 'Object storage · Zone 1', desc: 'Pre-generated redacted reports. Private artifacts; downloads go through the API.', palette: C.data },
];

const { icons, files } = await loadIconsStrict(nodes.flatMap(n => n.slug ? [n.slug] : []), { variant: 'light' });
const d = createDiagram({ name: 'VHD — C2 Management System', icons, files });
d.title('Management System — Containers', { cx: 1150, y: 35, subtitle: 'C4 Level 2 · draft for review · asynchronous analytics and versioned reports' });
d.container({ x: 350, y: 280, width: 1520, height: 1210, title: 'Management System', stroke: C.ink });

for (const { x, y, title, type, desc, slug, palette } of nodes) {
  d.system({ x, y, width: 300, height: 190, title, type, desc, ...palette });
  if (!slug) continue;
  const icon = icons[slug];
  const scale = 44 / Math.max(icon.aspect.w, icon.aspect.h);
  const width = icon.aspect.w * scale, height = icon.aspect.h * scale;
  d.add(image({ fileId: icon.fileId, x: x + (300 - width) / 2, y: y + 132 + (44 - height) / 2, width, height }));
}

d.person({ cx: 570, y: 130, name: 'Vought management', role: 'reviews business performance' });
d.system({ x: 20, y: 800, width: 300, height: 190, title: 'VHD / Agent / Hero', type: 'Software systems · producers', desc: 'Independent analytics outboxes. Redacted lifecycle and revenue events, corrections and checkpoints.' });
d.system({ x: 1990, y: 350, width: 300, height: 190, title: 'External services', type: 'Out of scope · D5', desc: 'Staff identity and notifications. Vendor integration details deferred.', external: true });

const aux = { color: C.aux, style: 'dashed' };
function flow(points, label, cx, y, opts) {
  d.flow(points, opts);
  d.note(label, cx, y, opts?.color ?? C.flow);
}

// Management reads curated data. The API never queries operational stores.
flow([[570, 264], [570, 344]], 'review metrics', 665, 305);
flow([[726, 445], [964, 445]], 'HTTPS · metrics / reports', 845, 416);
flow([[1276, 445], [1514, 445]], 'SQL · schedules / manifests', 1395, 416);
flow([[1000, 546], [1000, 600], [745, 600], [745, 1190], [480, 1190], [480, 1244]], 'SQL · scoped metrics', 670, 1160);
flow([[1230, 546], [1230, 580], [1930, 580], [1930, 1370], [1826, 1370]], 'authorized download', 2030, 1110);
flow([[1230, 344], [1230, 195], [2140, 195], [2140, 344]], 'identity / notifications · integration detail deferred', 1700, 165, aux);

// Independent ingestion and ETL let analytics lag without gating dispatch.
flow([[326, 860], [414, 860]], 'events', 370, 831, aux);
flow([[414, 940], [326, 940]], 'ack /\nreplay', 370, 962, aux);
flow([[726, 895], [964, 895]], 'SQL · append / claim replay', 845, 866);
flow([[1514, 895], [1276, 895]], 'claim batches / replay', 1410, 866, aux);
flow([[1670, 996], [1670, 1070], [600, 1070], [600, 1244]], 'publish versioned metrics', 1450, 1037, aux);
flow([[1760, 794], [1760, 546]], 'invalidate reports\non reclassification', 1640, 710, aux);

// A pinned metric generation and durable catalog job make retries reviewable.
flow([[1120, 1244], [1120, 1130], [1310, 1130], [1310, 650], [1670, 650], [1670, 546]], 'claim jobs / publish manifest', 1460, 675, aux);
flow([[964, 1345], [726, 1345]], 'SQL · pinned metrics', 845, 1316);
flow([[1276, 1345], [1514, 1345]], 'versioned report artifact', 1395, 1316, aux);

d.note('Blue: application calls · dashed grey: async / secondary · orange: compute · magenta: storage', 1150, 1540, C.ink, 14);
d.note('Analytics may lag. Show source checkpoints and metric definitions; management never reads or changes the live dispatch queue.', 1150, 1575, C.muted, 14);
d.note('Only allowlisted redacted data enters Zone 1. No incident bodies, raw location, billing references or confidential-tier access.', 1150, 1605, C.muted, 14);
d.write('diagrams/dist/c2-management-system.excalidraw');
