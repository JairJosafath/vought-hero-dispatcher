/**
 * C4 Level 1 — System Context for Vought Hero Dispatcher.
 *
 * Scope decisions recorded in docs/architecture/00-foundations.md:
 *   - Third-party integrations are out of scope: one greyed box, not six.
 *   - Audit and analytics feeds are bundled onto one rail; ten thin arrows to
 *     Government and Management would drown everything else.
 *   - The premium phone path is drawn explicitly because it is the one thing
 *     visible at context level that premium subscribers actually buy.
 *
 * Every relationship is one arrow in one direction with its own label. No
 * double-headed arrows: a head at each end forces the reader to guess which of
 * the two labels belongs to which direction, and they guess wrong.
 */
import { createDiagram, C } from "../../.claude/skills/architecture-diagrams/lib/diagram.mjs";

// ------------------------------------------------------------------ palette
const CORE = { stroke: "#1971c2", fill: "#eaf3fb" }; // front-line systems
const READ = { stroke: "#0b7285", fill: "#e6f4f6" }; // read-side systems
const PREMIUM = "#E7157B"; // the priority path
const RESPONSE = "#5b8fc7"; // what comes back, lighter than the request path

// ------------------------------------------------------------------ layout
const ROW = 380; // front-line systems band
const ROW_H = 160;
const ROW_MID = ROW + ROW_H / 2; // 460
const PERSON_Y = ROW_MID - 49; // aligns a person's torso with the band's midline

const OUT_Y = ROW_MID - 24; // request, left to right
const BACK_Y = ROW_MID + 24; // response, right to left

const VHD = { x: 290, w: 290 };
const AGENT = { x: 730, w: 290 };
const HEROSYS = { x: 1170, w: 290 };

const cxOf = (b) => b.x + b.w / 2;
const BUS = 625; // audit / analytics rail
const SUPPORT = 720;
const SUPPORT_H = 160;
const ACTOR_ROW = 970;

const d = createDiagram({ name: "VHD — C1 System Context" });

d.title("Vought Hero Dispatcher — System Context", {
  cx: 892,
  y: 44,
  subtitle: "C4 Level 1  ·  who uses VHD, and what VHD depends on",
});

/**
 * One relationship in each direction across a gap: request above, response
 * below, each label hugging its own arrow on the outside so it can only be read
 * one way.
 */
function exchange(x1, x2, requestLabel, responseLabel) {
  const cx = (x1 + x2) / 2;
  d.flow([[x1, OUT_Y], [x2, OUT_Y]]);
  d.note(requestLabel, cx, OUT_Y - 6 - requestLabel.split("\n").length * 15);
  d.flow([[x2, BACK_Y], [x1, BACK_Y]], { color: RESPONSE, width: 1.5 });
  d.note(responseLabel, cx, BACK_Y + 6, RESPONSE);
}

// ------------------------------------------------------------------ people
d.person({ cx: 110, y: PERSON_Y, name: "User", role: "free · basic · premium" });
d.person({ cx: cxOf(AGENT), y: 170, name: "Hero assistant", role: "dispatches heroes · makes the call" });
// Sits further out than the other actors: this gap carries the longest label
// pair in the diagram and the hero's role text needs room to clear it.
d.person({ cx: 1680, y: PERSON_Y, name: "Hero", role: "works assignments in the field" });
d.person({ cx: 540, y: ACTOR_ROW, name: "Government", role: "audits VHD for compliance" });
d.person({ cx: 1040, y: ACTOR_ROW, name: "Vought management", role: "runs the business" });

// ------------------------------------------------- systems: the request path
d.system({
  x: VHD.x, y: ROW, width: VHD.w, height: ROW_H,
  title: "VHD System", type: "Software System",
  desc: "Accounts, subscriptions, request intake and scheduling. The public way in.",
  ...CORE,
});
d.system({
  x: AGENT.x, y: ROW, width: AGENT.w, height: ROW_H,
  title: "Agent System", type: "Software System",
  desc: "Dispatch console, matching engine, AI recommendations, priority queues.",
  ...CORE,
});
d.system({
  x: HEROSYS.x, y: ROW, width: HEROSYS.w, height: ROW_H,
  title: "Hero System", type: "Software System",
  desc: "Assignments, status, availability and location for heroes in the field.",
  ...CORE,
});

// ------------------------------------------------- systems: the read side
d.system({
  x: 390, y: SUPPORT, width: 300, height: SUPPORT_H,
  title: "Government System", type: "Software System",
  desc: "Audit trail, compliance reporting, evidence packages, disclosure handling.",
  ...READ,
});
d.system({
  x: 890, y: SUPPORT, width: 300, height: SUPPORT_H,
  title: "Management System", type: "Software System",
  desc: "ETL, analytics, dashboards and pre-generated reports.",
  ...READ,
});

// ------------------------------------------------- out of scope
d.system({
  x: 1390, y: 160, width: 300, height: 145,
  title: "External services", type: "Out of scope",
  desc: "Payments (Stripe), notifications, telephony, geo, identity. All three front-line systems call out; integration design deferred.",
  external: true,
});

// ------------------------------------------------------------------ flows
// The round trip: a request travels right, its status travels back left.
exchange(145, VHD.x - 6, "requests help\nscheduled or ASAP", "live status · ETA");
exchange(VHD.x + VHD.w + 6, AGENT.x - 6, "queues request\npriority by tier", "match · status");
exchange(AGENT.x + AGENT.w + 6, HEROSYS.x - 6, "dispatch\nhuman confirms", "acceptance · ETA");
exchange(HEROSYS.x + HEROSYS.w + 6, 1647, "assignment\nbrief · route", "status · location\noutcome report");

// The premium line skips the web intake entirely — this is what premium buys.
d.flow([[110, PERSON_Y - 8], [110, 340], [810, 340], [810, ROW - 6]], { color: PREMIUM });
d.note("premium  ·  calls a human agent", 430, 316, PREMIUM);

// The assistant drives the Agent System; the AI only recommends (D1).
d.flow([[cxOf(AGENT), 302], [cxOf(AGENT), ROW - 6]]);
d.note("reviews and confirms", cxOf(AGENT) + 118, 330);

// Outbound integrations, deliberately understated.
d.flow([[1390, ROW - 6], [1390, 311]], { style: "dashed", color: C.aux });
d.note("outbound", 1328, 330, C.aux);

// Audit + analytics rail: every front-line system feeds both read-side systems.
const rail = { color: C.aux, width: 1.5, endArrowhead: null };
[cxOf(VHD), cxOf(AGENT), cxOf(HEROSYS)].forEach((x) => d.flow([[x, ROW + ROW_H + 5], [x, BUS]], rail));
d.flow([[cxOf(VHD), BUS], [cxOf(HEROSYS), BUS]], rail);
d.flow([[540, BUS], [540, SUPPORT - 6]], { color: C.aux, width: 1.5 });
d.note("audit events", 615, 655, C.aux);
d.flow([[1040, BUS], [1040, SUPPORT - 6]], { color: C.aux, width: 1.5 });
d.note("ETL feed", 1104, 655, C.aux);

// Read-side systems out to their audiences.
d.flow([[540, SUPPORT + SUPPORT_H + 6], [540, ACTOR_ROW - 8]]);
d.note("reports · disclosure", 648, 915);
d.flow([[1040, SUPPORT + SUPPORT_H + 6], [1040, ACTOR_ROW - 8]]);
d.note("dashboards", 1118, 915);

// ------------------------------------------------------------------ legend
const LEG = 1105;
d.note("request path", 180, LEG, C.flow, 13);
d.note("response path", 340, LEG, RESPONSE, 13);
d.note("premium priority path", 520, LEG, PREMIUM, 13);
d.note("audit & analytics feeds", 740, LEG, C.aux, 13);
d.note("out of scope", 920, LEG, C.aux, 13);

d.write("diagrams/dist/c1-context.excalidraw");
