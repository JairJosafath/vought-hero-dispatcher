import { createDiagram, C } from '../../.claude/skills/architecture-diagrams/lib/diagram.mjs';
import { loadIconsStrict } from '../../.claude/skills/architecture-diagrams/lib/thesvg.mjs';
import { image } from '../../.claude/skills/architecture-diagrams/lib/excalidraw.mjs';

const nodes = [
  [400, 350, 'Dispatch console', 'TypeScript · staff UI', 'Reviews requests and candidates. Human confirms or overrides recommendations.', 'typescript', C.neutral],
  [900, 350, 'Context and evidence API', 'Go · Zone 2', 'Authorizes incident reads. Saves the exact context reviewed and decision evidence.', 'go', C.app],
  [1400, 350, 'Decision evidence database', 'Postgres · Zone 2', 'Restricted context snapshots, AI output, human choice, actor and timestamps.', 'postgresql', C.data],
  [400, 750, 'Dispatch and matching API', 'Go · Zone 1', 'Owns tier queues, candidate matching, request claims and confirmed dispatch intents.', 'go', C.app],
  [900, 750, 'AI recommendation runtime', 'Python · Zone 1', 'Ranks redacted candidates with reasons. Optional, time-bounded; cannot dispatch.', 'python', C.ai],
  [400, 1150, 'Dispatch database', 'Postgres · Zone 1', 'Durable queues, claims, hero reservations, evidence IDs and transactional outbox.', 'postgresql', C.data],
  [900, 1150, 'Integration worker', 'Go · Zone 1', 'Retries assignments and events. Applies versioned hero status and availability.', 'go', C.app],
];
const { icons, files } = await loadIconsStrict(nodes.map(n => n[5]), { variant: 'light' });
const d = createDiagram({ name: 'VHD — C2 Agent System', icons, files });
d.title('Agent System — Containers', { cx: 1100, y: 35, subtitle: 'C4 Level 2 · draft for review · human decisions, durable delivery, optional AI' });
d.container({ x: 350, y: 280, width: 1400, height: 1090, title: 'Agent System', stroke: C.ink });
for (const [x, y, title, type, desc, slug, palette] of nodes) {
  d.system({ x, y, width: 300, height: 170, title, type, desc, ...palette });
  const icon = icons[slug];
  const scale = 48 / Math.max(icon.aspect.w, icon.aspect.h);
  const width = icon.aspect.w * scale, height = icon.aspect.h * scale;
  d.add(image({ fileId: icon.fileId, x: x + (300 - width) / 2, y: y + 110 + (48 - height) / 2, width, height }));
}
d.person({ cx: 550, y: 130, name: 'Hero assistant', role: 'human dispatch authority' });
const externals = [
  [10, 750, 'VHD System', 'Intake, subscription entitlement and restricted incident detail API.'],
  [1900, 750, 'Hero System', 'Receives assignments. Supplies availability, acceptance, status and ETA.'],
  [1900, 1150, 'Government / Management', 'Separate systems consume audit events and redacted analytics.'],
];
for (const [x, y, title, desc] of externals) d.system({ x, y, width: 300, height: 170, title, type: 'Software System', desc });
d.system({ x: 1900, y: 350, width: 300, height: 170, title: 'External services', type: 'Out of scope · D5', desc: 'Staff identity, premium telephony, notifications and geo. Integration design deferred.', external: true });
const aux = { color: C.aux, style: 'dashed' };
function flow(points, label, cx, y, opts) { d.flow(points, opts); d.note(label, cx, y, opts?.color ?? C.flow); }
flow([[550, 264], [550, 344]], 'reviews / confirms', 650, 305);
flow([[550, 526], [550, 744]], 'HTTPS · claim / confirm', 440, 640);
flow([[706, 410], [894, 410]], 'authorized context', 800, 383);
flow([[894, 475], [706, 475]], 'context / evidence ID', 800, 491);
flow([[1206, 435], [1394, 435]], 'SQL · durable evidence', 1300, 408);
flow([[706, 805], [894, 805]], 'redacted candidates', 800, 778, aux);
flow([[894, 870], [706, 870]], 'advisory ranking', 800, 890, aux);
flow([[550, 926], [550, 1144]], 'SQL · claim + outbox', 655, 1030);
flow([[894, 1220], [706, 1220]], 'claim outbox / apply events', 800, 1193);
flow([[306, 805], [394, 805]], 'handoff', 350, 777);
flow([[1050, 1144], [1050, 1030], [1800, 1030], [1800, 805], [1894, 805]], 'retry assignment', 1510, 1000, aux);
flow([[1894, 880], [1830, 880], [1830, 1070], [1120, 1070], [1120, 1144]], 'availability / status', 1520, 1085, aux);
flow([[1206, 1240], [1894, 1240]], 'audit IDs / redacted analytics', 1550, 1210, aux);
flow([[1050, 1326], [1050, 1420], [160, 1420], [160, 926]], 'match / status events', 650, 1435, aux);
flow([[930, 344], [930, 110], [160, 110], [160, 744]], 'authorized incident detail · HTTPS', 310, 125);
flow([[1000, 344], [1000, 185], [2050, 185], [2050, 344]], 'staff identity / premium phone · integration detail deferred', 1500, 155, aux);
flow([[650, 744], [650, 600], [1050, 600], [1050, 526]], 'validate decision evidence', 820, 570);
d.note('Blue: application calls · dashed grey: async / optional / egress · teal: AI · magenta: data', 1100, 1500, C.ink, 14);
d.note('Zone 1 carries references and redacted features. Zone 2 holds sensitive context. Zone 3 promotion is a separate design.', 1100, 1540, C.muted, 14);
d.write('diagrams/dist/c2-agent-system.excalidraw');
