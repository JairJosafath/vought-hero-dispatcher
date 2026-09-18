# C2 — Hero System containers

Status: **draft for review**. [View SVG](../../diagrams/dist/c2-hero-system.svg).
Source: `diagrams/src/c2-hero-system.mjs`.

## Assignment ownership

The Hero System owns the hero-facing contract: assignment brief delivery,
acceptance/rejection, ETA and route updates, and the versioned status stream the
rest of VHD consumes. Agents never directly mutate hero state; they issue a
validated assignment intent and wait for the hero's acceptance or refusal.

The assignment API accepts only a trusted assignment ID, a hero ID, and a
request version previously acknowledged by the Agent System. It records the
hero's decision as a durable state transition in Postgres with a monotonic event
version. Duplicate delivery is deduplicated by assignment ID, and the API must
not silently accept a conflicting second assignment for the same hero or request.

Availability is maintained as a versioned projection rather than as a shared
mutable cache. The Hero System publishes a read model to the Agent System and
keeps the authoritative source for local route, consent and location rules.
Hero location can be noisy or stale, so the Agent System must treat it as a
derived signal, not a truth source for dispatch.

## Mobile and field workflow

The hero mobile app is the user experience boundary. It receives a brief,
displays safe arrival details only after authorization, and sends back a concrete
status change: accepted, in transit, arrived, blocked, resolved or rejected. The
API does not infer hero intent; it writes what the app reports and preserves a
player- or device-scoped audit trail.

Availability, location and presence are treated separately from assignment
state. The service validates route constraints, safety checks and operational
limits before returning a current ETA or recommending a denial. If a hero is
temporarily unavailable, the app may send a status update which the Agent System
can consume without creating a new dispatch attempt.

## Trust and event boundaries

The Agent System is the dispatch authority; the Hero System is the operational
execution boundary. Events are emitted asynchronously in a durable outbox and
retried to maintain eventual consistency. Assignment delivery, acceptance and
resolution are separate states so that a hero can decline without losing the
request's audit trail.

Management and Government do not receive live hero state. They only consume
redacted analytics and durable event metadata that is non-sensitive enough to be
shared outside the field workflow. Zone 3-sensitive records remain out of scope
for this diagram; they are promoted from the Agent System's evidence pathway, not
created here.

## Review points

- Define the exact hero availability contract: open, unavailable, on assignment,
  en route and offline.
- Decide whether ETA is calculated by the Hero System or by the Agent System,
  and make that contract explicit.
- Agree on route and safety denial semantics so agents can distinguish a refusal
  from a temporary unavailability.
- Specify retry and ordering requirements for event delivery and outbox replay.
- Validate the mobile app's handling of background app shutdown, poor network
  connectivity and stale location updates.

## Regenerate

```sh
node diagrams/src/c2-hero-system.mjs
node .claude/skills/architecture-diagrams/scripts/lint-scene.mjs diagrams/dist/c2-hero-system.excalidraw
npm run diagram:export -- diagrams/dist/c2-hero-system.excalidraw diagrams/dist/c2-hero-system.svg
```
