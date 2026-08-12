# LLM/agent traffic goes through the journal; provenance is one mechanism

Provenance is not a separate lineage or tracing system: model calls, tool
calls, and results are events in correlation-keyed journal streams, so
record-level certificates (schema digest, program digest, input anchor,
span head) and trace-level spans are the same fold read at different
altitudes, and lineage is a query. We accepted the real costs — canonical
encoding for conversation shapes, journal volume, and the journal (not the
SDK's own logs) becoming the source of truth for agent behavior — because
the alternative is two provenance systems whose disagreements are
undetectable. Corollary product commitment: consumers hold entity handles
and never see correlation keys or stream mechanics.
