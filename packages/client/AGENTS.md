# packages/client — agent contract

The narrow-writ authoring adapter (ticket 002 resolution). Read root
`AGENTS.md` first; these laws are scoped to this package and
non-negotiable:

- Three verbs only: READ (subscribe/fetch, verify-on-read), PUBLISH
  canonical frames to designated ingress subjects, REQUEST everything
  else as data on daemon-owned request subjects.
- This package NEVER implements authority protocols — no CAS-append, no
  fencing, no journal-shape logic, no catalog writes. A TS
  implementation of a protocol the Go daemon owns is a port owing a
  wall (ADR-0006). If you feel the need for one here, the daemon is
  missing a request type; add it there instead.
- Holds connections, never servers (ticket 001): no embedded NATS, no
  lifecycle ownership.
- Refusals are data: surface the daemon's typed refusals to callers
  unchanged; never retry silently, never convert absence into a throw.
