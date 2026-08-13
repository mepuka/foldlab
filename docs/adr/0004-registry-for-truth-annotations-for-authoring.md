# Superseded (2026-08-12): the registry/binding mechanism was mint-era

This decision's mechanism — deployment bindings as law-gated registry
records `{schemaDigest, bindingClass, params, lawResult}` extracted from
annotations and committed by mint() — was rolled back with the mint
concept (NEXT.md). What survives, restated in the current model: schema
identity never carries deployment facts (ADR-0008 — a type deployed to
two subjects is one type), and a NAMED deployment fact (subject → type,
codec choice, correlation key) is a DECISION, single-homed behind the
effector per the ownership model (ticket 002 resolution; ADR-0009 for
journal roles). If annotation-authored bindings return as an authoring
surface, they must be pulled in by a real consumer, never built ahead of
one.
