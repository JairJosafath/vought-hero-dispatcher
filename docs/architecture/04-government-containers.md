# C2 — Government System containers

Status: **draft for review**, extending the [foundations](00-foundations.md).
[View SVG](../../diagrams/dist/c2-government-system.svg).
Source: `diagrams/src/c2-government-system.mjs`.

## Ownership and containers

The Government System preserves a reconstructable audit trail, produces
compliance reports and handles disclosure requests. It consumes durable events
from VHD, Agent and Hero Systems; it does not own dispatch, incident detail or
confidential data. Government audit records remain outside Zone 3.

| Container | Responsibility |
| --- | --- |
| Regulator portal — TypeScript | Authorized audit search, reports, disclosure requests and package access |
| Compliance and disclosure API — Go, Zone 2 | Enforces access policy, records approvals and schedules package jobs |
| Disclosure database — Postgres, Zone 2 | Cases, requester details, approvals, access receipts and durable package jobs |
| Audit intake API — Go, Zone 1 | Authenticates producers and durably accepts validated, redacted events |
| Audit ledger — Postgres, Zone 1 | Append-only audit metadata, evidence references, archival outbox and replay work |
| Integrity and archive worker — Go, Zone 1 | Reconciles source gaps, seals batches and verifies archived checkpoints |
| Package worker — Go, Zone 2 | Builds redacted reports and authorized Zone 2 packages; records controlled-view references for Zone 3 |
| Report and package store — object storage, Zone 2 | Authorized reports and Zone 2 evidence exports with scoped access and retention |
| Audit archive — object storage, Zone 1 | Retention-protected sealed batches and integrity checkpoints containing redacted metadata |

The portal is an authorized user interface, not a public audit feed. Restricted
content must not persist in browser caches. VHD and Agent evidence APIs remain
external Zone 2 sources. Confidential services remain behind their explicit
Zone 3 API; this diagram does not assign their ownership to Government.

## Durable intake and completeness

Each producer commits its event and delivery intent locally, then retries its
independent audit outbox. Audit intake validates producer identity, schema and
redaction, rejecting incident bodies and confidential content. One ledger
transaction records the event and archival intent before acknowledging durable
receipt. Stable producer/event IDs deduplicate retries; a conflicting payload
under an existing ID is an integrity failure, not an update.

Events retain source stream, sequence, aggregate version, occurrence time and
receipt time. Completeness requires a scoped sequence/checkpoint contract with
each producer: aggregate versions alone do not prove that every audit event
arrived. The integrity worker detects gaps, requests replay and records unresolved
gaps. It persists replay requests in the ledger's work tables; audit intake
claims these requests and asks the producer for the missing range. Mutable work
cursors are separate from append-only event records. It does not invent a
global order across independent streams. Reports show
the covered source checkpoints and known gaps instead of silently claiming a
complete audit period.

Producers retain replayable records until durable receipt and the agreed replay
window permit cleanup. Government ingestion, archiving and report backlogs never
synchronously gate intake or dispatch. Agent's local durable decision evidence
still precedes confirmation, as defined in [Agent C2](02-agent-containers.md).
Evidence references distinguish an attempted decision from a committed dispatch.

## Integrity and retention

The ledger accepts new records and corrective events; ordinary application roles
cannot rewrite prior entries. Append-only permissions alone do not make a
database tamper-evident. The archive worker seals ordered batches with content
digests and signed checkpoints, verifies continuity and records verification
failures. Its outbox makes archival retryable after ledger commit.

Sealed batches and checkpoint history require independently enforced retention
and a verification trust boundary that a ledger writer cannot silently replace.
Archive administration, signing authority and verification access must be
separated appropriately. A hash chain kept only beside the editable source
cannot establish that protection. Concrete key custody, storage enforcement and
independent verification mechanisms belong in the deployment/security design;
provider topology and integrations remain deferred under D3 and D5.

Retention, legal holds and verified recovery apply to audit history and
disclosure receipts as well as evidence references. Duration and disposal policy
are review decisions; the diagram does not claim a particular regulatory period.

## Default access and controlled disclosure

Regulators see authorized redacted events, incident-existence summaries, evidence
references, promotion history and disclosure status by default. This preserves
the audit chain from request through the recorded human decision, assignment,
outcome and subsequent disclosure without copying sensitive evidence into the
ledger. Detailed context stays at its authoritative source until an approved
disclosure requires it.

The proposed policy records requester, purpose, scope, expiry and an authorized
compliance approver, with no self-approval. Confidential disclosure additionally
requires a separate confidential-data custodian's approval, enforced by the
source API. These roles and the two-approval policy are proposals for review,
not adopted organizational policy. Government cannot authorize a confidential
read merely by generating a package job.

The package worker claims durable jobs and rechecks current classification,
approval scope and expiry before requesting a source export and publishing its
result. It may persist an authorized Zone 2 export. For Zone 3 it receives only a
controlled-view reference and disclosure receipt; confidential bodies remain in
the source-controlled delivery path and never enter Government package storage,
logs or caches. The portal opens the issued reference at the source-controlled
view, where the source rechecks the recipient's authorization and approvals.
Every sensitive source read records actor, case, scope and time
durably at that source, then forwards its receipt through the audit delivery
contract. An unavailable Government consumer does not erase that local record.

Downloads and controlled views require authorization at access time. Expiry or
revocation invalidates outstanding grants, references and pending jobs, while
their audit history remains. Previously delivered copies require an explicit
retention and recipient-handling policy; revoking a link cannot recall them.

## Promotion and review points

Adverse classification must promote all sensitive incident copies, including
Agent decision snapshots and previously generated Zone 2 packages. The workflow
must first prevent new unauthorized reads or exports, coordinate source copying
and verification, then leave redacted summaries and durable pointers. Audit
metadata records each transition and failure. A package job must not race
promotion using an earlier classification or authorization decision.

Preserving immutable evidence history while removing sensitive Zone 2 copies
requires an explicit relocation and retention contract, including backups,
legal holds, stale grants and recovery after partial failure. Government keeps
the fact and history of the incident; the confidential source controls its
detail. This remains a coordinated cross-system design, not an atomic database
transaction asserted by this container diagram.

- Confirm compliance-approver and confidential-custodian ownership and policy.
- Define producer stream sequences, replay windows and completeness reporting.
- Select retention durations, legal-hold rules and independent integrity checks.
- Specify promotion coordination, package invalidation and backup treatment.
- Define source-controlled confidential delivery, expiry and disclosure receipts.
- Validate recovery, ingestion capacity and reconciliation under outages; this
  diagram does not establish availability or latency targets.

Technology icons are embedded in the editable scene and SVG. AWS deployment
choices remain separate under D3; third-party integrations use one grey box
under D5. Zone 3 keeps its Rust API and portable Kubernetes/Postgres boundary.

## Regenerate

```sh
node diagrams/src/c2-government-system.mjs
node .claude/skills/architecture-diagrams/scripts/lint-scene.mjs diagrams/dist/c2-government-system.excalidraw
npm run diagram:export -- diagrams/dist/c2-government-system.excalidraw diagrams/dist/c2-government-system.svg
```
