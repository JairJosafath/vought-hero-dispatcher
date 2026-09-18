# C2 — Management System containers

Status: **draft for review**, extending the [foundations](00-foundations.md).
[View SVG](../../diagrams/dist/c2-management-system.svg).
Source: `diagrams/src/c2-management-system.mjs`.

## Ownership and containers

The Management System turns redacted operational events into dashboards and
pre-generated reports for Vought management. It owns analytical projections and
metric definitions, not requests, entitlements, assignments or hero availability.
Management reads dashboards, never the live dispatch queue. This system has no
operational database credentials or operational state write path.

| Container | Responsibility |
| --- | --- |
| Management dashboard — TypeScript | Authorized aggregate views, report requests and downloads, with visible freshness and completeness |
| Analytics and reports API — Go, Zone 1 | Enforces query scope, serves aggregates, schedules reports and authorizes each download |
| Report catalog — Postgres, Zone 1 | Opaque principal/scope references, schedules, durable report jobs and versioned report manifests |
| Analytics intake API — Go, Zone 1 | Authenticates producers, validates allowlisted redacted events and coordinates replay requests |
| Event inbox — Postgres, Zone 1 | Validated redacted events, deduplication IDs, source checkpoints and durable replay intents |
| ETL worker — Go, Zone 1 | Applies idempotent versioned transforms, reconciles corrections and publishes consistent aggregates |
| Analytics database — Postgres, Zone 1 | Curated metrics, lineage, aggregate versions and source freshness/checkpoints; no raw incident bodies |
| Report worker — Go, Zone 1 | Claims durable jobs and generates reports from pinned aggregate and metric-definition versions |
| Report store — object storage, Zone 1 | Pre-generated redacted reports with controlled access and versioned manifests |

The dashboard is an authenticated management interface, not a public data feed.
Identity and notification providers appear in one grey external-services box;
their integration design remains deferred under D5. Staff contact details remain
with the identity service; report schedules store opaque authorized references.
Zone 3 is not a Management data source and grants it no access.

## Independent delivery and replay

VHD, Agent and Hero Systems publish through their own durable analytics outboxes.
Delivery scheduling and capacity are independent from dispatch and audit work.
Analytics outages may make dashboards stale; ingestion, ETL and report backlogs
must not consume reserved dispatch capacity or synchronously gate operational
intake and dispatch. Deployment work must establish resource limits, backlog
budgets and recovery capacity; drawing separate containers does not prove that
isolation.

Intake validates producer identity, schema version and the redaction contract
before acknowledging a committed inbox entry. Stable producer/event IDs
deduplicate retries. The same ID with a different payload is a contract failure,
not an overwrite. Events carry source stream/sequence, entity version, occurrence
time and receipt time. An agreed scoped sequence/checkpoint contract lets the
consumer detect missing ranges without inventing a global order across producers.

The ETL worker persists replay intents in the inbox. Intake claims those intents
and requests retained ranges through producer APIs; it never queries operational
databases. Producers retain replayable records for an agreed window, including
after receipt where needed for recovery. Exhausted replay windows leave a visible
completeness gap. A durable acknowledgement means receipt, not successful
transformation or inclusion in a published metric.

ETL processes late and out-of-order events using source versions and corrective
events. It records applied event/transform identities with the resulting changes
in an analytics database transaction, then advances the inbox work cursor.
A crash between stores can cause another attempt, which must be safe to repeat.
This is at-least-once delivery with idempotent processing, not an exactly-once
claim across databases. Correction and replay jobs cannot count the same event
twice or overwrite a newer source version.

Transforms build a versioned aggregate snapshot and publish its ready marker
only when the required tables and lineage are consistent. Queries and reports
pin that published version. Each result exposes metric-definition version,
source checkpoints, known gaps and freshness. Event occurrence time determines
the proposed reporting period; late arrivals may revise earlier periods, whose
new version and correction status must remain visible.

## Data and access boundaries

The ingestion allowlist admits only approved analytical fields: opaque event and
entity references, approved categories, coarse time/geography where permitted,
and redacted measurements. It rejects user PII, raw location, incident or decision
evidence bodies, payment references, hero true identities and weaknesses, and
adverse incident bodies. Rejected content must not be copied to a dead-letter
store, diagnostics or logs; retain only safe failure metadata and request a
corrected producer event. Producers remain responsible for redaction before
delivery, and consumer validation provides another boundary.

Pseudonymous identifiers still support linkage; they are not anonymization.
Opaque hero or request references needed for deduplication and lineage stay in
restricted analytical internals rather than unrestricted exports. Dashboard
queries use approved dimensions and current principal/scope authorization.
Aggregate access also needs a reviewed policy for small cohorts, repeated-query
differencing, precise time/geography combinations and hero performance views.
Suppression thresholds and permitted dimensions remain proposals for review;
this draft does not claim that aggregation alone prevents reidentification.

Source classification corrections and adverse promotion can invalidate existing
events, aggregates and reports, even if each originally passed validation.
Lineage must locate affected derived data. The proposed flow blocks access to
affected versions and pending jobs, applies an approved redacted correction,
rebuilds aggregates and revokes or regenerates affected reports. Incomplete
invalidation remains visible and access stays blocked where scope is uncertain.
Management receives correction metadata, never the confidential replacement
body. A source must not treat sending a notification as proof that copies have
been handled; acknowledgement, retention, backup recovery and previously
downloaded reports need a coordinated cross-system contract.

## Reports and proposed metrics

The API creates scheduled or on-demand jobs in the catalog with authorized scope,
requester reference and versioned metric definitions. The worker claims jobs
with retryable leases and pins a published aggregate version and its source
checkpoints. It writes a report under a stable job/version identity and commits
its manifest before exposing a completed result. Unpublished objects after a
partial failure remain inaccessible and are cleaned up by retention work.
Catalog metadata and the object manifest bind the report to the same versions,
scope and freshness information.

Scope, classification and report validity must be rechecked before publication
and at access time. A pinned version is not permission to publish data since
invalidated by correction or promotion. The API authorizes every download through
a controlled delivery path; the store does not expose public objects or grants
that bypass current authorization. Revocation blocks outstanding access and
pending jobs; it cannot recall a previously downloaded copy. Expiry, retention
and recipient handling remain policy decisions.

The initial metric definitions are proposals for review:

- **ASAP dispatch latency:** elapsed time from durable request acceptance to a
  committed human dispatch decision, separated by verified subscription tier.
  Hero acceptance is a separate measure. Cancellation, unresolved requests,
  missing events and clock assumptions must be explicit; p95 over completed
  dispatches alone would hide unassigned requests. The foundations' latency
  targets need agreement on this endpoint and independent load validation.
- **Hero acceptance:** accepted offers divided by eligible delivered offers in
  a defined cohort/window, distinguishing refusals, expired offers and pending
  responses. A delivery acknowledgement is not acceptance.
- **Utilization:** time in agreed assignment states divided by eligible available
  time for the same hero cohort and reporting window. Offline, unavailable,
  overlapping scheduled work and missing state transitions need explicit rules.
- **Subscription revenue:** currency-separated totals from redacted, verified
  subscription charge and refund events published by VHD, with stable business
  event references for deduplication and correction. Payment tokens and provider
  references stay outside Management. Recognized revenue, taxes, settlement,
  allocation and exchange-rate policies require separate agreement; these
  operational analytics are not an authoritative financial ledger.

Missing events, timestamp disagreement and late refunds change confidence and
completeness as well as values. Every metric needs a named owner, a versioned
definition and a revision policy before management uses it to judge performance.

## Review points

- Agree on producer event allowlists, source checkpoints and replay windows.
- Assign metric owners and define denominators, event-time windows and revisions.
- Define management scopes, small-cohort controls and permitted export detail.
- Set freshness objectives, retention and source/report recovery procedures.
- Specify classification correction, promotion invalidation and backup treatment.
- Validate failure isolation, replay convergence and consistent report publication
  under retries and outages. This diagram does not establish latency or
  availability targets.

Technology icons are embedded in the editable scene and SVG. AWS deployment
choices remain separate under D3; third-party integrations use one grey box
under D5.

## Regenerate

```sh
node diagrams/src/c2-management-system.mjs
node .claude/skills/architecture-diagrams/scripts/lint-scene.mjs diagrams/dist/c2-management-system.excalidraw
npm run diagram:export -- diagrams/dist/c2-management-system.excalidraw diagrams/dist/c2-management-system.svg
```
