# Toy kernel — status

This file plays the part of a `VERIFICATION.md` row. Its prose is for
people; the `gate:claim` markers beside each sentence are for
`check-status.sh`, which re-derives every one of them from `kernel/` at
HEAD and exits nonzero if any is false.

* The kernel exports **2** functions.
  <!-- gate:claim id=exports value=2 -->
* The kernel source tree digests to
  `2456b762d1c97f9067c95bd520f234f5511473f035dee720fc3dc6ea9ed44e44`.
  <!-- gate:claim id=kernel-digest value=2456b762d1c97f9067c95bd520f234f5511473f035dee720fc3dc6ea9ed44e44 -->

Deleting a marker does not make the gate pass: `check-status.sh` fails a
status file that carries no markers at all. Adding a marker whose `id`
the checker cannot derive also fails — a claim with no derivation is a
claim with no gate.
