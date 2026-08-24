# Artifact-kind ledger

The classifiers artifacts carry (see **Artifact kind** in
[CONTEXT.md](CONTEXT.md)). Starter set — each entry will be pressure-tested by
the repo self-model, where these become constructors of a Lean inductive type.
Add kinds through domain modeling plus grilling, like any definition.

| Kind | Meaning |
| --- | --- |
| charter | A governing statement of thesis, principles, and direction. |
| glossary | A bounded context's canonical vocabulary (a CONTEXT.md). |
| adr | A recorded decision: context, choice, consequences. |
| taxonomy | A classification of a domain with stated axes. |
| model | A Lean formalization of a domain: carriers, judgments, operations. |
| theorem | A single machine-checked statement with its proof and axiom report. |
| module | A TypeScript/JavaScript code unit with a declared interface. |
| schema | A first-class description of data: type and encoded views with laws. |
| codec | A paired encode/decode transformation with round-trip obligations. |
| tool | An executable that produces or checks artifacts. |
