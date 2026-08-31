# Effect Core TypeScript surface experiment

Status: **SCAFFOLD ONLY**, 2026-08-31

This lane will turn the pinned Effect TypeScript public surface into finite
source rows, join them to the language-neutral protocol, generate the selected
profile adapter, and test every generated file with Effect's TypeScript
language service.

The present tree contains only empty TypeScript module boundaries and fixture
directories. It emits nothing and makes no source-closure or semantic claim.

Planned stages are: exact pins and export closure; source type graph;
dispositions; neutral-profile join; generated codec/adapter; exact-file-set LSP
checks; independent decoding and mutation checks. Lean remains the meaning and
proof authority.
