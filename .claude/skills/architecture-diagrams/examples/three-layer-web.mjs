/**
 * Reference implementation: a 3-layer web application on AWS.
 *
 * Copy this file as the starting point for a new diagram. It shows the whole
 * pattern -- the diagram is described as data (bands + nodes + arrows), icons are
 * pulled from theSVG at build time, and the result is one self-contained
 * .excalidraw file that still opens and edits like anything drawn by hand.
 *
 *   node .claude/skills/architecture-diagrams/examples/three-layer-web.mjs
 */
import { loadIconsStrict } from "../lib/thesvg.mjs";
import { createDiagram, C, ICON, MID, NODE_BOTTOM } from "../lib/diagram.mjs";

// ---------------------------------------------------------------- content
// Everything the diagram shows, as data. Edit here, not in the drawing code.
const NODES = {
  edge: [
    ["aws-amazon-route-53", "Route 53\nDNS"],
    ["aws-amazon-cloudfront", "CloudFront\nCDN"],
    ["aws-aws-waf", "AWS WAF"],
    ["aws-amazon-simple-storage-service", "S3\nstatic assets"],
    ["aws-amazon-cognito", "Cognito\nuser pool"],
    ["aws-aws-certificate-manager", "ACM\nTLS cert"],
  ],
  publicSubnet: [
    ["aws-res-amazon-vpc-internet-gateway", "Internet\nGateway"],
    ["aws-res-elastic-load-balancing-application-load-balancer", "Application\nLoad Balancer"],
    ["aws-res-amazon-vpc-nat-gateway", "NAT Gateway\negress"],
  ],
  app: [
    ["aws-aws-fargate", "Fargate tasks\nAZ-a"],
    ["aws-amazon-elastic-container-service", "ECS cluster\nservice + ASG"],
    ["aws-aws-fargate", "Fargate tasks\nAZ-b"],
  ],
  data: [
    ["aws-amazon-aurora", "Aurora writer\nAZ-a"],
    ["aws-amazon-aurora", "Aurora replica\nAZ-b"],
    ["aws-amazon-elasticache", "ElastiCache\nRedis"],
  ],
  shared: [
    ["aws-amazon-cloudwatch", "CloudWatch"],
    ["aws-aws-secrets-manager", "Secrets\nManager"],
    ["aws-aws-identity-and-access-management", "IAM roles"],
  ],
};

const { icons, files } = await loadIconsStrict(Object.values(NODES).flat().map(([s]) => s));

// ---------------------------------------------------------------- layout
const L1_Y = 372; // edge / presentation icons
const PUB_Y = 692; // public subnet icons
const L2_Y = 912; // application icons
const L3_Y = 1152; // data icons

const EDGE_X = [457, 692, 927, 1162, 1397, 1632];
const TIER_X = [563, 930, 1297]; // three columns inside the VPC
const SHARED_X = 1655;

const d = createDiagram({ name: "3-Layer Web Application on AWS", icons, files });

d.title("3-Layer Web Application on AWS", {
  cx: 1040,
  y: 50,
  subtitle: "Presentation · Application · Data  —  multi-AZ, private data tier",
});

// ---------------------------------------------------------------- users
d.box({
  x: 60, y: 630, width: 160, height: 130,
  lines: [["Users", 22, C.ink], ["browser / mobile", 13], ["HTTPS", 13]],
});

// ---------------------------------------------------------------- nesting
// Outermost first: array order is z-order, so a container pushed after its
// contents would paint over them.
d.container({ x: 260, y: 170, width: 1560, height: 1240, stroke: C.cloud, title: "AWS Cloud", dashed: false });
d.container({ x: 300, y: 240, width: 1490, height: 1140, stroke: C.region, title: "Region  ·  us-east-1" });
d.container({
  x: 340, y: 310, width: 1410, height: 240,
  stroke: C.edge.stroke, fill: C.edge.fill,
  title: "Layer 1 · Presentation / Edge",
  subtitle: "global, managed, outside the VPC",
});
d.container({ x: 340, y: 580, width: 1180, height: 770, stroke: C.vpc, title: "VPC  ·  10.0.0.0/16", dashed: false });
d.container({
  x: 380, y: 630, width: 1100, height: 190,
  stroke: C.public.stroke, fill: C.public.fill,
  title: "Public subnets  ·  10.0.0.0/24  +  10.0.1.0/24  (AZ-a / AZ-b)",
});
d.container({
  x: 380, y: 850, width: 1100, height: 210,
  stroke: C.app.stroke, fill: C.app.fill,
  title: "Layer 2 · Application  —  private app subnets",
  subtitle: "10.0.10.0/24  +  10.0.11.0/24   ·   no route to the internet gateway",
});
d.container({
  x: 380, y: 1090, width: 1100, height: 210,
  stroke: C.data.stroke, fill: C.data.fill,
  title: "Layer 3 · Data  —  private data subnets",
  subtitle: "10.0.20.0/24  +  10.0.21.0/24   ·   reachable only from the app security group",
});
d.container({ x: 1560, y: 580, width: 190, height: 770, stroke: C.shared.stroke, fill: C.shared.fill, title: "Shared" });

// ---------------------------------------------------------------- nodes
d.icons(NODES.edge, EDGE_X, L1_Y);
d.icons(NODES.publicSubnet, TIER_X, PUB_Y);
d.icons(NODES.app, TIER_X, L2_Y);
d.icons(NODES.data, TIER_X, L3_Y);
NODES.shared.forEach(([slug, caption], i) =>
  d.icon({ slug, caption, cx: SHARED_X, y: 660 + i * 230, size: 56 }),
);

// ---------------------------------------------------------------- flows
const l1 = MID(L1_Y);
const pub = MID(PUB_Y);
const l2 = MID(L2_Y);
const l3 = MID(L3_Y);

// Users -> Route 53 -> CloudFront
d.flow([[228, 695], [292, 695], [292, l1], [EDGE_X[0] - 40, l1]]);
d.flow([[EDGE_X[0] + 36, l1], [EDGE_X[1] - 36, l1]]);

// CloudFront -> WAF (inspection), and CloudFront -> S3 (static) routed under the row
d.flow([[EDGE_X[1] + 36, l1], [EDGE_X[2] - 36, l1]], { style: "dashed", color: C.aux });
d.note("inspect", (EDGE_X[1] + EDGE_X[2]) / 2, l1 - 26, C.aux);
d.flow([
  [EDGE_X[1], NODE_BOTTOM(L1_Y) + 4],
  [EDGE_X[1], 514],
  [EDGE_X[3], 514],
  [EDGE_X[3], NODE_BOTTOM(L1_Y) + 4],
]);
d.note("static", (EDGE_X[1] + EDGE_X[3]) / 2, 492, C.flow);

// CloudFront -> Internet Gateway -> ALB
d.flow([[EDGE_X[1], NODE_BOTTOM(L1_Y) + 4], [EDGE_X[1], 606], [TIER_X[0], 606], [TIER_X[0], PUB_Y - 6]]);
d.note("dynamic  ·  origin", 800, 556, C.flow);
d.flow([[TIER_X[0] + 36, pub], [TIER_X[1] - 46, pub]]);

// ALB -> Fargate tasks in both AZs
d.flow([[TIER_X[1], NODE_BOTTOM(PUB_Y) + 4], [TIER_X[1], 832], [TIER_X[0], 832], [TIER_X[0], L2_Y - 6]]);
d.flow([[TIER_X[1], NODE_BOTTOM(PUB_Y) + 4], [TIER_X[1], 832], [TIER_X[2], 832], [TIER_X[2], L2_Y - 6]]);
d.note("HTTP  ·  target group", 1120, 806, C.flow);

// App -> data
d.flow([[TIER_X[0], NODE_BOTTOM(L2_Y) + 4], [TIER_X[0], L3_Y - 6]]);
d.note("SQL", TIER_X[0] + 32, 1064, C.flow);
d.flow([[TIER_X[2], NODE_BOTTOM(L2_Y) + 4], [TIER_X[2], L3_Y - 6]]);
d.note("cache", TIER_X[2] + 40, 1064, C.flow);
d.flow([[TIER_X[2], NODE_BOTTOM(L2_Y) + 4], [TIER_X[2], 1072], [TIER_X[1], 1072], [TIER_X[1], L3_Y - 6]]);

// Aurora replication
d.flow([[TIER_X[0] + 36, l3], [TIER_X[1] - 36, l3]], { style: "dashed", color: C.data.stroke });
d.note("replication", (TIER_X[0] + TIER_X[1]) / 2, l3 - 26, C.data.stroke);

// Fargate egress via NAT
d.flow([[TIER_X[2] + 40, l2], [1425, l2], [1425, pub], [TIER_X[2] + 40, pub]], { style: "dashed", color: C.aux });

d.note("Each icon is embedded in this file — no network needed to open it.", 1040, 1435, C.muted, 14);

d.write("diagrams/dist/example-three-layer-web.excalidraw");
