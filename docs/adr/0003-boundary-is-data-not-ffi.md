# Language and runtime boundaries are data, not FFI

Every boundary crossing (Go↔TS, wasm↔Bun, and planned NATS/CLI transports)
is one entry point taking serialized data — a pipeline program plus
canonical frames — and returning data plus digests; errors return as data
and nothing throws across. We rejected named-function FFI (syscall/js
exports per primitive) even though it looks more like "bindings": each
js.Value crossing is a slow trampoline over an unshared heap, the surface
grows per primitive, and the live-marshalled boundary would be the only
un-refereed one in the lab. Data-shaped crossings make the pipeline program
itself registry data, so one program encoding serves in-process wasm, NATS
request/reply, and CLI stdin identically — and each transport is admitted
by the same digest wall (ADR-0001). First embodiment: go/cmd/wasmwall.
