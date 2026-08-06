# VHD Architecture — Foundations

The shared vocabulary for every diagram that follows. If a diagram contradicts
this page, one of the two is wrong.

> Vought International is fictional. This is a design exercise built on the
> setting of *The Boys*; nothing here describes a real company or real people.

## What VHD is

Vought Hero Dispatcher connects people who need a superhero to the hero best able
to help them — scheduled in advance, or ASAP for emergencies. Human *hero
assistants* (agents) make the dispatch call, supported by AI recommendations.
Premium subscribers get a phone line to a human agent and a priority queue.

## Actors

| Actor | Wants | Notes |
| --- | --- | --- |
| **User — free** | Scheduled help | Best-effort queue, no ASAP |
| **User — basic** | Scheduled + ASAP | Standard queue |
| **User — premium** | Scheduled + ASAP + a human on the phone | Priority queue. Funds everything else |
| **Hero assistant (agent)** | Match heroes to requests fast, with full context | Human. Makes the final dispatch decision |
| **Hero** | Know where to go, when, and what they're walking into | Mobile-first. Availability + location |
| **Vought management** | Utilisation, revenue, SLA, hero performance | Reads dashboards, never the live queue |
| **Government / regulator** | Proof VHD operates lawfully | Audit trail, compliance reports, disclosure requests |

The **AI assistant** is not an actor — it is a container inside the Agent System.
It recommends; a human confirms.

## Systems

| System | Responsibility |
| --- | --- |
| **VHD System** | Public entry point: accounts, subscriptions, request intake, scheduling |
| **Agent System** | Dispatch console, matching engine, AI recommendations, the queues |
| **Hero System** | Hero-facing assignments, status, availability, location |
| **Government System** | Audit trail, compliance reporting, evidence packages, disclosure handling |
| **Management System** | ETL, analytics, dashboards, pre-generated reports |

**Third-party integrations are out of scope** (D5). VHD calls out to a payment
provider (Stripe as the stand-in), notifications, telephony for the premium line,
geospatial + routing, and a staff identity provider — but their integration design
is deferred. They appear as a single greyed box in every diagram. Emergency
services interop was proposed and folded into the same box; pull it out into a
first-class system if it turns out to carry real requirements.

## Quality attributes

These are what the architecture is *for*. Ranked — when two conflict, the higher
one wins.

1. **Dispatch latency.** ASAP request → hero assigned. Target p95 < 30s for
   premium, < 2 min for basic. This is a life-safety system.
2. **Availability of intake + dispatch.** 99.99%. Analytics and dashboards may
   degrade freely; intake may not.
3. **Auditability.** Every dispatch decision reconstructable after the fact: what
   the agent saw, what the AI recommended, what the human chose, when.
4. **Confidentiality of the restricted tier.** Need-to-know access, every read
   logged.
5. **Portability of the restricted tier.** It must be liftable off AWS. This is a
   hard constraint on technology choice, not an aspiration.

## Trust zones

The zone a piece of data lives in decides its language, runtime, and blast radius.

| Zone | Contents | Runtime |
| --- | --- | --- |
| **0 — Public** | Marketing, static assets, public hero personas | CDN / object storage |
| **1 — Standard** | Accounts, requests, schedules, assignments, hero availability | Serverless (Go) |
| **2 — Restricted** | User PII, incident detail, billing references | VPC services (Go) |
| **3 — Confidential** | Hero true identities & weaknesses; adverse incident records | EKS confidential containers (Rust) |

**Zone 3 holds exactly two things**, both chosen deliberately:

- **Hero true identities and weaknesses.** A leak gets a hero killed.
- **Adverse incident records** — assignments that went very badly. Collateral
  damage, casualties, hero misconduct.

Payments are *not* in Zone 3: card data is delegated to the payment provider, so
VHD stores only tokens. Government audit records are *not* in Zone 3 either —
their requirement is tamper-evidence and availability to regulators, which is the
opposite of restricted access.

### Incident classification and promotion

An assignment record is born in Zone 2. When its outcome is classified adverse, a
promotion flow writes the sensitive detail into Zone 3 and leaves behind a
pointer plus a redacted summary. Zone 2 keeps the fact that the incident exists;
Zone 3 holds what happened.

This is the single most consequential flow in the system, and it raises a
question the design has to answer rather than dodge: **the Government System
needs audit completeness, and Zone 3 is deliberately restricted.** The interface
between them — what regulators see by default, what requires a logged disclosure
request, and who can approve one — is a Phase 2 design decision, not an
implementation detail. Flagged here so we decide it on purpose.

### What portability actually costs

Zone 3 must run on vanilla Kubernetes with self-hosted Postgres. No DynamoDB, no
Aurora, no Lambda, no AWS-proprietary anything inside that boundary — those are
fine everywhere else. Zone 3 talks to the rest of VHD through an explicit API, so
"lift it elsewhere" means repointing that API, not a rewrite.

## Technology

| Layer | Choice |
| --- | --- |
| Frontends | TypeScript + framework (users, agents, heroes) |
| Application services | Go |
| Confidential services (Zone 3) | Rust, in EKS confidential containers |
| AI / agent runtime | Python |
| Sessions, preferences, hot state | DynamoDB |
| Everything relational | Postgres |
| Reports, evidence packages, exports | Object storage |

## Decisions taken

| # | Decision | Rationale |
| --- | --- | --- |
| D1 | AI recommends, human confirms | Keeps the model out of the critical path — a model outage degrades to manual dispatch instead of stopping it |
| D2 | Zone 3 = hero identities + adverse incidents only | Narrow scope keeps the confidential tier small enough to actually be portable |
| D3 | AWS topology lives in separate deployment diagrams | Container diagrams stay platform-neutral, so they survive a move off AWS — which QA-5 requires |
| D4 | Payments delegated, never stored | Removes an entire compliance surface |
| D5 | Third-party integrations out of scope | One greyed box, not six. Keeps context-level diagrams about VHD rather than about vendors |

## Diagram inventory

| Phase | Diagram | Status |
| --- | --- | --- |
| 1 | C1 — System context | **approved** — `diagrams/dist/c1-context.excalidraw` |
| 2 | C2 — VHD System containers | in progress |
| 2 | C2 — Agent System containers | |
| 2 | C2 — Hero System containers | |
| 2 | C2 — Government System containers | |
| 2 | C2 — Management System containers | |
| 3 | C3 — Dispatch & matching engine (Go) | |
| 3 | C3 — Confidential data services (Rust) | |
| 3 | C3 — AI agent runtime (Python) | |
| 3 | C3 — Analytics pipeline | |
| 4 | Deployment — AWS account & network topology | |
| 4 | Deployment — trust zones and boundary crossings | |
| 4 | Deployment — the exit plan | |
| 5 | Data — DynamoDB / Postgres split | |
| 5 | Sequence — premium ASAP emergency | |
| 5 | Sequence — scheduled booking | |

## Conventions

Diagrams are generated by the `architecture-diagrams` skill: sources in
`diagrams/src/`, output in `diagrams/dist/`, one script per diagram named for its
level (`c1-context.mjs`, `c2-agent-system.mjs`, …).

Colour carries meaning and is consistent across every diagram:

| Colour | Means |
| --- | --- |
| Grey | Zone 0/1 — public and standard |
| Orange | Application / compute |
| Magenta | Data stores |
| Red | Zone 3 — confidential |
| Purple | Network boundaries (VPC, region) |
| Teal | AI / ML |
| Blue arrows | The request path |
| Dashed grey arrows | Async, secondary, or egress |
