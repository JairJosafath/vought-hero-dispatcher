import { createDiagram, C } from '../../.claude/skills/architecture-diagrams/lib/diagram.mjs';
import { loadIconsStrict } from '../../.claude/skills/architecture-diagrams/lib/thesvg.mjs';
import { image } from '../../.claude/skills/architecture-diagrams/lib/excalidraw.mjs';

// Containers are independent of the AWS deployment (D3). Object storage is a
// technology category here, so it deliberately has no vendor-specific icon.
const nodes = [
  { x: 420, y: 350, title: 'Regulator portal', type: 'TypeScript · authorized UI', desc: 'Reviews redacted audit history, requests disclosure and retrieves approved reports.', slug: 'typescript', palette: C.neutral },
  { x: 970, y: 350, title: 'Compliance and disclosure API', type: 'Go · Zone 2', desc: 'Authorizes reports and case approvals. Records purpose, scope, expiry and access.', slug: 'go', palette: C.app },
  { x: 1520, y: 350, title: 'Disclosure database', type: 'Postgres · Zone 2', desc: 'Cases, approvals, durable package jobs and receipt outbox. No confidential bodies.', slug: 'postgresql', palette: C.data },
  { x: 420, y: 800, title: 'Audit intake API', type: 'Go · Zone 1', desc: 'Validates redacted events; deduplicates IDs. Acknowledges only durable receipt.', slug: 'go', palette: C.app },
  { x: 970, y: 800, title: 'Audit ledger', type: 'Postgres · Zone 1', desc: 'Append-only metadata, evidence IDs and source sequences; archive and replay work.', slug: 'postgresql', palette: C.data },
  { x: 1520, y: 800, title: 'Integrity and archive worker', type: 'Go · Zone 1', desc: 'Reconciles source gaps, seals batches and verifies independently held checkpoints.', slug: 'go', palette: C.app },
  { x: 420, y: 1250, title: 'Package worker', type: 'Go · Zone 2', desc: 'Builds redacted reports and scoped Zone 2 exports. Zone 3 returns references only.', slug: 'go', palette: C.app },
  { x: 970, y: 1250, title: 'Report and package store', type: 'Object storage · Zone 2', desc: 'Approved reports, manifests and Zone 2 exports. Expiring access; no Zone 3 bodies.', palette: C.data },
  { x: 1520, y: 1250, title: 'Audit archive', type: 'Object storage · Zone 1', desc: 'Sealed redacted batches and signed manifests. Independent retention and verification.', palette: C.data },
];

const { icons, files } = await loadIconsStrict(nodes.flatMap(n => n.slug ? [n.slug] : []), { variant: 'light' });
const d = createDiagram({ name: 'VHD — C2 Government System', icons, files });
d.title('Government System — Containers', { cx: 1150, y: 35, subtitle: 'C4 Level 2 · draft for review · complete audit history, scoped disclosure' });
d.container({ x: 350, y: 280, width: 1520, height: 1210, title: 'Government System', stroke: C.ink });

for (const { x, y, title, type, desc, slug, palette } of nodes) {
  d.system({ x, y, width: 300, height: 190, title, type, desc, ...palette });
  if (!slug) continue;
  const icon = icons[slug];
  const scale = 44 / Math.max(icon.aspect.w, icon.aspect.h);
  const width = icon.aspect.w * scale, height = icon.aspect.h * scale;
  d.add(image({ fileId: icon.fileId, x: x + (300 - width) / 2, y: y + 132 + (44 - height) / 2, width, height }));
}

d.person({ cx: 570, y: 130, name: 'Government / regulator', role: 'reviews and requests disclosure' });
d.person({ cx: 1120, y: 130, name: 'Disclosure approver', role: 'compliance role; no self-approval' });
d.system({ x: 20, y: 800, width: 300, height: 190, title: 'VHD / Agent / Hero', type: 'Software systems · producers', desc: 'Independent durable outboxes. Redacted audit events, evidence IDs and source checkpoints.' });
d.system({ x: 20, y: 1250, width: 300, height: 190, title: 'Source evidence APIs', type: 'Zone 2 / Zone 3 · outside Government', desc: 'VHD / Agent evidence; confidential custodian API. Zone 3 enforces separate approval and logs reads.' });
d.system({ x: 1990, y: 350, width: 300, height: 190, title: 'External services', type: 'Out of scope · D5', desc: 'Staff and regulator identity, notifications. Vendor integration details deferred.', external: true });

const aux = { color: C.aux, style: 'dashed' };
function flow(points, label, cx, y, opts) {
  d.flow(points, opts);
  d.note(label, cx, y, opts?.color ?? C.flow);
}

// Review and approval. Confidential approval is also enforced at the source API.
flow([[570, 264], [570, 344]], 'review / request', 665, 305);
flow([[1120, 264], [1120, 344]], 'approve scoped case', 1020, 305);
flow([[726, 445], [964, 445]], 'HTTPS · review / disclosure', 845, 416);
flow([[1276, 445], [1514, 445]], 'SQL · cases + jobs + outbox', 1395, 416);
flow([[1120, 546], [1120, 794]], 'read redacted audit\n+ completeness status', 1220, 695);
flow([[1230, 344], [1230, 195], [2140, 195], [2140, 344]], 'identity / notifications · integration detail deferred', 1700, 165, aux);
flow([[414, 400], [335, 400], [335, 1130], [170, 1130], [170, 1244]], 'Zone 3 view · source auth\n+ logged access', 260, 1160);

// Producer delivery never synchronously gates dispatch on Government uptime.
flow([[326, 860], [414, 860]], 'events', 370, 831, aux);
flow([[414, 940], [326, 940]], 'ack /\nreplay', 370, 962, aux);
flow([[726, 895], [964, 895]], 'SQL · append / claim replay', 845, 866);
flow([[1514, 895], [1276, 895]], 'reconcile / queue replay', 1395, 866, aux);
flow([[1670, 996], [1670, 1244]], 'sealed batches\n+ checkpoints', 1770, 1100, aux);

// The worker claims database jobs; a transient API call is not a work queue.
flow([[680, 1244], [680, 1150], [760, 1150], [760, 620], [1670, 620], [1670, 546]], 'claim approved jobs / write receipts', 1460, 645, aux);
flow([[570, 1244], [570, 996]], 'case / access receipts\nfrom durable outbox', 650, 1080, aux);
flow([[414, 1360], [326, 1360]], 'scoped API', 388, 1384);
flow([[726, 1280], [870, 1280], [870, 1050], [1030, 1050], [1030, 996]], 'read redacted audit', 930, 1020);
flow([[726, 1345], [964, 1345]], 'reports / Zone 2 packages', 845, 1316);
flow([[1276, 495], [1310, 495], [1310, 1100], [1120, 1100], [1120, 1244]], 'authorized download', 1210, 1122);

d.note('Blue: application calls · dashed grey: async / secondary · orange: compute · magenta: storage', 1150, 1540, C.ink, 14);
d.note('Audit metadata stays outside Zone 3. Confidential bodies stay at the source; Government records scoped references and receipts.', 1150, 1575, C.muted, 14);
d.note('Approvals, retention periods and confidential custodian ownership are proposals for review; AWS topology remains separate (D3).', 1150, 1605, C.muted, 14);
d.write('diagrams/dist/c2-government-system.excalidraw');
