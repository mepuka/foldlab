# Identity is of canonical uncompressed bytes; compression and chunking are transport

Chain heads and all digests are computed over the canonical event encoding,
never over gzip frames, chunk boundaries, or any wire form. Compressed
output legitimately differs across encoders (Go gzip vs Bun zlib), and
chunking legitimately varies across orchestrators — so fingerprinting a
transport form would make identity depend on who shipped the bytes. The
consequence is load-bearing both ways: transports are free to vary
(provably — rechunking never moves a head, test/stream.bindings.test.ts),
and any codec's correctness law collapses to "round trip preserves the
head," which forces exact canonical-byte and order preservation with no
"close enough" tier.
