import { createDiagram, C } from '../../.claude/skills/architecture-diagrams/lib/diagram.mjs';
import { loadIconsStrict } from '../../.claude/skills/architecture-diagrams/lib/thesvg.mjs';
import { image } from '../../.claude/skills/architecture-diagrams/lib/excalidraw.mjs';

const nodes = [
  [400, 350, 'Hero mobile app', 'TypeScript · Zone 1', 'Receives assignment briefs, accepts or rejects work, and sends location + status updates.', 'typescript', C.neutral],
  [900, 350, 'Assignment and status API', 'Go · Zone 1', 'Accepts dispatch intents, validates the assignment ID, and writes versioned status changes.', 'go', C.app],
  [1400, 350, 'Assignment database', 'Postgres · Zone 1', 'Assignments, hero availability, ETA, event IDs and durable outbox for delivery retries.', 'postgresql', C.data],
  [400, 750, 'Availability and location service', 'Go · Zone 1', 'Owns location, work status, route constraints and vendor-side availability windows.', 'go', C.app],
  [900, 750, 'Presence and ETA engine', 'Go · Zone 1', 'Computes ETA, filters unsafe or unsuitable assignments, and emits status deltas.', 'go', C.app],
  [400, 1150, 'Hero profile service', 'Go · Zone 2', 'Stores contact preferences, consented notifications, private routes and policy constraints.', 'go', C.app],
  [900, 1150, 'Event relay', 'Go · Zone 1', 'Pushes assignment, availability and status events to Agent System with retry semantics.', 'go', C.app],
];

const { icons, files } = await loadIconsStrict(nodes.map(n => n[5]), { variant: 'light' });
const d = createDiagram({ name: 'VHD — C2 Hero System', icons, files });
d.title('Hero System — Containers', { cx: 1100, y: 35, subtitle: 'C4 Level 2 · draft for review · assignments, status, availability and location' });
d.container({ x: 350, y: 280, width: 1400, height: 1090, title: 'Hero System', stroke: C.ink });

for (const [x, y, title, type, desc, slug, palette] of nodes) {
  d.system({ x, y, width: 300, height: 170, title, type, desc, ...palette });
  const icon = icons[slug];
  const scale = 48 / Math.max(icon.aspect.w, icon.aspect.h);
  const width = icon.aspect.w * scale, height = icon.aspect.h * scale;
  d.add(image({ fileId: icon.fileId, x: x + (300 - width) / 2, y: y + 110 + (48 - height) / 2, width, height }));
}

d.person({ cx: 550, y: 130, name: 'Hero', role: 'field responder' });

const externals = [
  [10, 750, 'Agent System', 'Receives assignment intents and sends back availability, acceptance and status updates.'],
  [1900, 750, 'VHD System', 'Gets a redacted status summary only when needed; it does not own live hero state.'],
  [1900, 1150, 'Government / Management', 'Consume audit events and redacted analytics that are safe for non-field readers.'],
];
for (const [x, y, title, desc] of externals) d.system({ x, y, width: 300, height: 170, title, type: 'Software System', desc });

d.system({ x: 1900, y: 350, width: 300, height: 170, title: 'External services', type: 'Out of scope · D5', desc: 'Push notifications, geo, identity and alerting remain deferred until vendor contracts are defined.', external: true });

const aux = { color: C.aux, style: 'dashed' };
function flow(points, label, cx, y, opts) { d.flow(points, opts); d.note(label, cx, y, opts?.color ?? C.flow); }

flow([[550, 264], [550, 344]], 'reviews assignment', 650, 305);
flow([[550, 526], [550, 744]], 'HTTPS · accept / reject / ETA', 440, 640);
flow([[706, 410], [894, 410]], 'assignment brief', 800, 382);
flow([[894, 475], [706, 475]], 'status / event ack', 800, 490);
flow([[1206, 435], [1394, 435]], 'SQL · durable assignment', 1300, 408);
flow([[706, 805], [894, 805]], 'availability snapshot', 800, 778, aux);
flow([[894, 870], [706, 870]], 'route / ETA / constraints', 800, 890, aux);
flow([[550, 926], [550, 1144]], 'policy / preferences', 640, 1030, aux);
flow([[894, 1220], [706, 1220]], 'status + availability events', 800, 1193);
flow([[306, 805], [394, 805]], 'location + status', 420, 845);
flow([[1050, 1144], [1050, 1030], [1800, 1030], [1800, 805], [1894, 805]], 'retry event delivery', 1520, 1000, aux);
flow([[1894, 880], [1830, 880], [1830, 1070], [1120, 1070], [1120, 1144]], 'availability / status', 1520, 1085, aux);
flow([[1206, 1240], [1894, 1240]], 'audit IDs / redacted analytics', 1550, 1210, aux);
flow([[1050, 1326], [1050, 1420], [160, 1420], [160, 926]], 'assignment lifecycle events', 650, 1435, aux);
flow([[930, 344], [930, 110], [160, 110], [160, 744]], 'incident / assignment context', 310, 125, aux);
flow([[1000, 344], [1000, 185], [2050, 185], [2050, 344]], 'push / geo / identity integration detail deferred', 1500, 155, aux);
flow([[650, 744], [650, 600], [1050, 600], [1050, 526]], 'policy + route validation', 820, 570);

d.note('Blue: application calls · dashed grey: async / optional / egress · teal: AI is not in this boundary · magenta: data', 1100, 1500, C.ink, 14);
d.note('Hero state is mobile-first and versioned; the system stores only durable assignment and availability facts, not a shared control plane.', 1100, 1540, C.muted, 14);
d.write('diagrams/dist/c2-hero-system.excalidraw');
