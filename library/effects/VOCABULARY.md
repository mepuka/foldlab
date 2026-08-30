# Vocabulary — the user register of @foldlab/cas

The Lean model names every construct exhaustively because proof
obligations demand it. A person using the store needs about a dozen of
those names; the rest are protocol machinery that should stay invisible
until asked for. This document pins the split: the everyday register
(what the CLI and docs say unprompted) and the protocol register (what
surfaces only in `--json`, `inspect`, and reference material). The
internal glossary in
[docs/effect-replay/CONTEXT.md](../../docs/effect-replay/CONTEXT.md)
stays exhaustive on purpose; this is its user-facing projection.

Consumption contract: `--help` is the one surface for commands and
vocabulary together, because the two must stay coherent — a verb and
the words it speaks are one document. There is no separate vocabulary
verb and no startup card. Vocabulary is semantics, and in this
substrate semantics may alter while the grammar — the sorts, their
wire tags, the node structure — stays fixed. That is why help and
vocabulary flow toward store content rather than baked strings (the
CLI rider: help is a described document, loaded and rendered). This
file is the seed that content derives from — never a second, drifting
copy.

## The rule: vocabulary is consumer-gated

A term enters the everyday register only when a verb needs it — the
same admission discipline signatures follow. Until a verb summons a
term, it stays in the protocol register, absent from help. So the
tiering below is not a style judgment made term by term; it is the
current verb set, read off.

## The everyday register

| Word | Meaning | Model term behind it |
|---|---|---|
| store | the content-addressed data itself — a directory or a database file | `Store` (partial map, grows only, closed) over the store-root layout |
| address | the 64-hex identity of one piece of content; equal content means equal address | `Addr32` / `ContentId`, digest of the canonical bytes |
| kind | the form a thing takes: value, file, blob, schema | grammar sort (`Ty`) plus its wire tag — see collision 1 |
| value | the everyday unit: a typed JSON payload, put and got | `value` sort (0x01), canonical envelope |
| link | a typed edge to another address, declaring the kind it expects | `Ref` / `CasReference` (expected tag + address) |
| blob | large bytes, stored verified in chunks | `chunk` + `tree` + `manifest` sorts (0x08–0x0A), recipe 1 |
| file | a named file over a blob | `file` sort (0x0B) |
| schema | the shape a value claims, itself stored content with an address | `schema` sort (0x53), canonical schema plane |
| roots | the addresses published as entry points | `RootSig` — `publish` (fail-closed) / `listRoots` |
| program | a table of steps, itself content: put it, publish it, run it by address | `cont` sort (0x0F) over `step` (0x0E) — `Cas.Lang.PProg`, laid down by `encodeProg` |
| refused | a put that broke a store law; every refusal carries its clause name | the admission judgment, clause-named errors |
| verify | re-hash and re-decode everything reachable from a root | `Graph.verify` and the loader law |
| history | the record of a run: what was admitted, in order | the store word — see collision 5 |
| in flight | how many store-touching calls the host runs at once | `ServePolicy.maxInFlight`, the host's own bound — `cas status` prints it |
| doctor | the checkup: what this store is, and what the lab it sits in has proved so far | `cas doctor` — the runtime reader of the emitted ledgers |
| name | a human word on stored content — an annotation, never identity | `Annotation` at the pinned key `foldlab/name` (working tag 0x41) — `cas name` writes and publishes one, `cas show` reads it back |

## The protocol register

| Term | One line | Abstracted by |
|---|---|---|
| node | the stored unit: version byte, kind tag, payload bytes, ordered refs | its kind: "a value", "a file" |
| payload | a node's opaque byte body | the rendered value |
| tag | the wire byte naming a kind (0x01, 0x53, …) | the kind's name |
| sort | the grammar's name for a node form | "kind"; never printed |
| word | a run's history: bindings in children-first admission order — the semantics carrier | "history" in human output |
| binding | one address-to-node pair in a word | — |
| marker | `{"$ref": k}`, the k-th reference positionally, inside canonical bytes | links resolve without it being visible |
| vector | a named, checked, replayable word — conformance evidence | `cas doctor` |
| entry | journal record / genesis (0x0C) | no verb yet; stays here until one lands |
| context | grouping node of typed edges with no payload (0x0D) | no verb yet; stays here until one lands |
| git | a git object as content, its SHA-1 derivable (0x47) | interop surface, opt-in |
| step / cont | F3 code points and program tables (tags 14/15, registry rows 14 and 15) | "program" — the run verb landed 2026-08-29, so the word is in the everyday register and these two are not |
| canonical | one spelling per content; the exact bytes the digest sees | invisible: it is why addresses work |
| form address | the address of a value's canonical representative under a named method | reference-level, new mint |
| signature, operation, handler, program, fuel, status | the store-language machinery | the CLI itself — its verbs are programs |

## Collisions, resolved

1. Sort, kind, and tag are one thing in three registers: the grammar
   name (`sort`), the everyday word (kind), and the wire byte (`tag`).
   The proved round trip `Ty.ofTag_wireTag` licenses the collapse. The
   CLI says "kind"; `sort` never appears in output; the tag appears as
   hex in `--json`.
2. "Value" collides with itself. The value sort is the everyday
   meaning. The canonical envelope `{revision, value}` also has a field
   named `value`; that field belongs to the protocol register and shows
   up only when reading raw documents.
3. "Entry" and "context" are ratified sorts with no consumer verb, so
   the gating rule keeps them in the protocol register — undocumented
   in help until a journal or grouping verb exists. "Step" and "cont"
   were in that same position and left it on 2026-08-29: `cas run` and
   `cas put --program` are the verbs that summoned them, and what
   entered help is the abstraction — "program" — not the two tags. A
   `cont` node is never named in a rendered surface; it is "the
   program", and the address it sits at is "the program's address".
4. "Root" is three things. The everyday word "roots" means published
   entry points, and only that. The location of a store is "store",
   never "root", in every rendered surface. `Root α`, the typed handle
   the TypeScript value projection returns, is API vocabulary and does
   not appear in the CLI at all.
5. "Word" is the model's name for a run's history, and it stays the
   name in `--json` and in every claim (word equality is the
   conformance gate). Human output says "history": `cas run`'s human
   line reads `history N admitted`, and its `--json` says `word`.
   No other verb renders one yet — `cas doctor` reads the emitted
   ledgers and does not replay anything.
