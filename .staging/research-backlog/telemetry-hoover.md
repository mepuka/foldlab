# The telemetry hoover — logs and traces that speak the language

Status: operator-directed backlog research, 2026-08-29 late night
(SPECS.md decision 20). Not dispatched; this note pins the framing so
the research lane starts from the estate's own semantics rather than
from generic observability.

## The directive

A TELEMETRY HOOVER and a LOGGING HOOVER that speak our language.
Internal introspection and a semantic layer. All agents should be
able to look into logs and see EVENT ORDER. Backlog research:
applying Defun trace analysis for periodic health checking and
system self-awareness.

## The mapping the research starts from (nothing here is minted)

1. **The word IS the trace.** R5: a run's history is a store word —
   binding order is event order, byte-decidable. A logging hoover
   that speaks the language is the acquisition loop (R15:
   acquire → ingest → normalize → gate → admit) applied to run
   logs: log streams land as described store content, addressed,
   with provenance. Agents "looking into logs" is then a store
   query, not file spelunking.
2. **Defun trace analysis is already the cheap verifier.** The
   build-modeling audit (BUILD-MODELING-AUDIT.md §3B) ruled the
   cheap check is *the envelope against the word* —
   `runPFrom_puts_sound`'s conclusion is a decidable relation
   between a produced word and a statically computed envelope.
   Periodic health checking = re-running that relation over recorded
   words on a schedule; a divergence names its line. This is the
   police lane's telemetry posture (byte-gated shape, host-varying
   numbers appended un-gated) applied to runtime.
3. **The sensors that already exist or are landing:** Gate's
   `--json` verdict lines (BS1 adds `ms` — the first telemetry
   field); the MCP host's logfmt stderr with per-tool annotations;
   the words themselves (every cross-host run gate stores one);
   `ENVIRONMENT.json` (what should be running);
   `cas-obligations.json` (what is owed). The hoover's job is to
   make these one queryable plane, not to add instrumentation.
4. **Event order for agents:** the word's binding order for store
   events; logfmt timestamps for host events; the dataflow envelope
   for causal order within a program. The semantic layer is the
   plain-language lane's verbalizer applied to traces — "line 3
   read line 1's answer" was already E3's output shape; a trace
   verbalizer is the same projection over a recorded word.
5. **Self-awareness = the police + the hoover:** the reflexive
   suite audits the static estate; the hoover audits the running
   one. Same Gate discipline, same one-walker-many-projections
   shape, same refusal to gate host-varying numbers.

## Research questions for the eventual lane

- The log/trace described kind: what arms (host event, store event,
  tool call, run word ref), and does it ride Exchange's precedent?
- Effect 4's own telemetry surface at the pin (Logger, Tracer,
  Metric in rc.111) — hoover from it, never fork it.
- Periodic health checks as mise tasks vs a daemon; where W-SEC's
  verify-without-store applies to remote agents reading traces.
- Persistable keying for trace queries (decision 15's regime 3).
- OTLP interop at the seam (speak cloud — decision 17) without
  letting a foreign schema own the internal plane.
