import { loadIconsStrict } from "../../.claude/skills/architecture-diagrams/lib/thesvg.mjs";
import { image } from "../../.claude/skills/architecture-diagrams/lib/excalidraw.mjs";
import { createDiagram, C } from "../../.claude/skills/architecture-diagrams/lib/diagram.mjs";

// Proposed container decomposition; AWS topology belongs in deployment views.
const nodes = [
  [300, 230, "User web application", "TypeScript · Zone 0/1", "Accounts, subscriptions, scheduled and ASAP requests; displays status and ETA.", C.neutral],
  [300, 510, "Public application API", "Go · Zone 1", "Authenticates users, checks subscription entitlements and returns redacted status.", C.app],
  [820, 510, "Intake and scheduling", "Go · Zone 1", "Owns request lifecycle and due times. Hands eligible requests to Agent System.", C.app],
  [300, 820, "Account and incident service", "Go · Zone 2", "Owns PII, incident detail and billing references. Authorizes detail access.", C.app],
  [820, 820, "Operational database", "Postgres · Zone 1", "Opaque IDs, tiers, requests, schedules, status and transactional outbox.", C.data],
  [300, 1130, "Restricted database", "Postgres · Zone 2", "User PII, incident detail and payment tokens; no card data or Zone 3 records.", C.data],
  [820, 1130, "Delivery worker", "Go · Zone 1", "Retries due dispatch handoffs and durable audit and analytics delivery.", C.app],
  [30, 510, "Session store", "DynamoDB · Zone 1", "Sessions and preferences; no incident detail.", C.data, 200],
];
const technologyIcons = { TypeScript: "typescript", Go: "go", Postgres: "postgresql", DynamoDB: "dynamodb" };
const { icons, files } = await loadIconsStrict(Object.values(technologyIcons), { variant: "light" });
const d = createDiagram({ name: "VHD — C2 VHD System", icons, files });
d.title("VHD System — Containers", { cx: 850, y: 30, subtitle: "C4 Level 2 · draft for review · public intake, accounts and scheduling" });
d.container({ x: 10, y: 150, width: 1160, height: 1170, title: "VHD System", stroke: C.ink });
for (const [x, y, title, type, desc, palette, width = 300] of nodes) {
  d.system({ x, y, width, height: 150, title, type, desc, ...palette });
  const icon = icons[technologyIcons[type.split(" · ")[0]]];
  const scale = 36 / Math.max(icon.aspect.w, icon.aspect.h);
  const iconWidth = icon.aspect.w * scale;
  const iconHeight = icon.aspect.h * scale;
  d.add(image({ fileId: icon.fileId, x: x + (width - iconWidth) / 2,
    y: y + 106 + (36 - iconHeight) / 2, width: iconWidth, height: iconHeight }));
}
d.person({ cx: 100, y: 240, name: "User", role: "free · basic · premium" });
d.system({ x: 1300, y: 510, width: 300, height: 150, title: "Agent System", type: "Software System", desc: "Owns priority queues and human dispatch decisions; provides match and status updates." });
d.system({ x: 1300, y: 820, width: 300, height: 150, title: "External services", type: "Out of scope · D5", desc: "Payments, notifications, telephony, geo and identity. Integration design deferred.", external: true });
d.system({ x: 1300, y: 1130, width: 300, height: 150, title: "Government / Management", type: "Separate software systems", desc: "Consume audit events and redacted analytics respectively. Do not gate intake or dispatch." });
const secondary = { color: C.aux, style: "dashed" };
function line(points, text, cx, y, opts) { d.flow(points, opts); d.note(text, cx, y, opts?.color ?? C.flow); }
line([[134, 285], [294, 285]], "uses HTTPS", 213, 260);
line([[450, 386], [450, 504]], "HTTPS / JSON", 510, 440);
line([[294, 585], [236, 585]], "session", 265, 554);
line([[606, 560], [814, 560]], "validate tier / submit", 710, 532);
line([[814, 615], [606, 615]], "request status", 710, 631);
line([[450, 666], [450, 814]], "detail access", 520, 735);
line([[970, 666], [970, 814]], "SQL + outbox", 1030, 735);
line([[450, 976], [450, 1124]], "SQL", 480, 1040);
line([[970, 1124], [970, 976]], "claim due / outbox", 1050, 1040);
line([[1126, 1180], [1220, 1180], [1220, 560], [1294, 560]], "dispatch handoff", 1390, 475, secondary);
line([[1294, 630], [1126, 630]], "match / status", 1300, 685, secondary);
line([[606, 900], [700, 900], [700, 1010], [1450, 1010], [1450, 976]], "provider calls · detail omitted", 1080, 985, secondary);
line([[1126, 1230], [1294, 1230]], "audit / analytics", 1250, 1290, secondary);
d.note("Blue: application calls · dashed grey: async or egress · orange: compute · magenta: data", 850, 1360, C.ink, 14);
d.note("Premium phone intake enters Agent System directly. Zone 3 services are outside this system.", 850, 1400, C.muted, 14);
d.write("diagrams/dist/c2-vhd-system.excalidraw");
