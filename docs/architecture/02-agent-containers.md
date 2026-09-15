# C2 — Agent System containers

Status: **draft for review**. [View SVG](../../diagrams/dist/c2-agent-system.svg).
Source: `diagrams/src/c2-agent-system.mjs`.

## Dispatch ownership

The dispatch and matching API accepts request handoffs from VHD, verifies the
trusted entitlement and request version, and acknowledges only after persisting
an inbox entry and queue item. The request ID deduplicates retries. Premium,
standard and best-effort work are logical queues in Postgres; scheduling and
fairness policy remain configurable review decisions, not separate products.

Agents claim requests with expiring leases. Matching uses redacted requirements
and a versioned projection of hero availability from Hero System. The database
is authoritative for claims and reservations; no extra hot-state cache is needed
in this draft. A stale availability projection must be visible to the agent.

Only an authenticated human confirmation can create a dispatch intent. One
transaction checks the request version, claim ownership and hero reservation,
records a verified evidence ID, and writes the assignment outbox entry. A unique
active reservation prevents concurrent assignments to the same hero. Scheduled
reservation intervals and cancellation races need a precise follow-up contract.

The worker retries delivery with a stable assignment ID. Hero System must
deduplicate that ID and acknowledge durable receipt. Delivery acknowledgement,
hero acceptance and successful resolution are distinct states. Rejections and
expired offers return to human review; the worker cannot silently choose another
hero. Status and availability events use event IDs and monotonic versions.

## Context, evidence and human authority

The staff console retrieves incident detail through the Zone 2 context and
evidence API, which authorizes each read against VHD's incident service and logs
access. Sensitive content stays out of Zone 1 queues, application logs and
analytics. The console handles restricted content only in its authorized staff
session; browser caching and persistence must be disabled for that content.

Before confirmation, the evidence API stores an immutable decision snapshot:
request/context versions, candidate set, AI output or timeout, model/policy
versions, displayed information, human choice, override reason, actor and time.
The returned evidence ID binds that snapshot to the agent and request version.
The dispatch API validates the evidence reference without retrieving its body.
An evidence failure blocks confirmation: silently dispatching without a durable
record would violate auditability. An orphan snapshot after a failed confirmation
is retained as an attempted decision, not presented as an executed dispatch.

The AI runtime receives only allowlisted redacted features. It has no assignment
write credentials or confidential-tier access. Its deadline and circuit breaker
allow manual matching when unavailable. The actual ranking shown to the agent
must be bound to the evidence snapshot; never rerun the model to reconstruct it.
The Go service independently validates eligibility and the final human choice.

## Delivery and trust boundaries

Dispatch, audit and analytics work require independent scheduling and reserved
dispatch capacity even though they share a worker container in this view.
Government receives durable event IDs and evidence references; detailed evidence
requires authorized disclosure, not a broad event payload. Management receives
redacted analytical events. Neither consumer synchronously gates dispatch.

Premium calls enter the staff workflow through the single external-services
boundary. The console creates a request with verified premium entitlement and
an incident reference through the same APIs used by digital intake. Telephony,
staff identity and other vendor integration details stay deferred under D5.

Evidence starts in Zone 2. If an incident becomes adverse, its sensitive snapshots
must participate in Zone 3 promotion too; merely moving the original incident
would leave copies behind. Zone 3 ownership, atomic promotion/redaction behavior,
retention and regulator disclosure remain explicit Phase 2 review points.

## Review points

- Define fairness/aging between subscription queues and operational escalation.
- Specify reservation windows, lease expiry, cancellation and late acceptance.
- Agree on redaction rules and what incident detail an AI recommendation needs.
- Define evidence immutability, retention and promotion into Zone 3.
- Measure latency under agent load, model outage and downstream failure. This
  container diagram does not establish the p95 or availability targets.

Technology icons are embedded in the editable scene and SVG. AWS deployment
choices remain separate under D3.

## Regenerate

```sh
node diagrams/src/c2-agent-system.mjs
node .claude/skills/architecture-diagrams/scripts/lint-scene.mjs diagrams/dist/c2-agent-system.excalidraw
npm run diagram:export -- diagrams/dist/c2-agent-system.excalidraw diagrams/dist/c2-agent-system.svg
```
