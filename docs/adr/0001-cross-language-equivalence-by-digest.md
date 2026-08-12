# Cross-language equivalence is proved by digest, never by trusting a port

The lab keeps twin implementations (TypeScript and Go, and now wasm) of the
same algebras. Instead of code review or shared test vectors alone, we pin
canonical byte encodings on both sides and freeze a fixture of digests
generated once by Go (`fixtures/stream-wall.json`); every twin must
reproduce every digest byte-identically (`test/*.wall.test.ts`). On
mismatch the default reading is that a port drifted — the fixture is
evidence, not a constant to update. The rejected alternative was
property-based equivalence testing per pair of implementations, which
scales quadratically in pairs and proves nothing about a third runtime;
digest walls admit any new runtime (wasm, TinyGo, a NATS-remote node) by
one test against the same frozen pins.
