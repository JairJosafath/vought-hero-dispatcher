# C2 — VHD System containers

Status: **draft for review**, extending the [foundations](00-foundations.md).
Open `diagrams/dist/c2-vhd-system.excalidraw` in Excalidraw. Regenerate with
`node diagrams/src/c2-vhd-system.mjs`.

## Ownership and delivery

The web application calls the public API. Free users may schedule; basic and
premium users may also request ASAP. Agent System owns priority queues and
human dispatch decisions. Premium telephone intake enters Agent System directly.

Intake commits each request and its delivery intent in one Postgres transaction
(the transactional outbox). The delivery worker claims due requests and retries
handoffs using request IDs as idempotency keys. Agent System must acknowledge
durable receipt and deduplicate retries. Intake acceptance means persisted,
not assigned. Status updates require event IDs and monotonic versions to reject
duplicates and stale updates.

Dispatch, audit and analytics delivery need independent scheduling and reserved
dispatch capacity. Analytics backlogs must not block dispatch. Audit delivery
retries from durable records; retention and tamper-evidence belong in the
Government System design.

## Data boundaries

Zone 1 holds opaque account and incident references, entitlements, schedules and
redacted status. The session store maps to DynamoDB in the AWS deployment and
is not the source of truth for requests or subscriptions.

The Zone 2 service owns PII, incident details and payment references in separate
Postgres storage. It authorizes each detail read. Handoffs carry references;
authorized agents retrieve details through its API, to be shown in Agent C2.
Audit and analytics events carry redacted metadata rather than incident bodies.
Only verified billing updates may change the operational entitlement projection;
provider integration details remain deferred under D5.

Zone 3 promotion is a separate design: the Zone 2 service will participate in
an explicit promotion API, retaining a pointer and redacted summary. Hero true
identities and adverse incident detail do not belong in these databases.

## Review points

- Confirm the account/incident service split and subscription ownership.
- Define cancellation versus dispatch races and scheduled handoff lead times.
- Specify handoff acknowledgements, authorized detail access and status contracts.
- Design Zone 3 promotion failure handling and regulator disclosure.
- Validate latency and availability under load and dependency failure; these
  targets are not demonstrated by this diagram.

Container boundaries are platform-neutral. AWS topology and redundancy remain
separate deployment work under D3. Technology labels include their matching registry icons. The first build fetches
icons into the local cache; generated Excalidraw and SVG files embed the icons
for offline viewing.
