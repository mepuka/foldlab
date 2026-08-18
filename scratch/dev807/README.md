# DEV-807 — the tripwire fired

DEV-807 asked for one canonicalizer: collapse `truth/CanonicalJson.ts` and
`truth/SchemaCanonical.ts` onto the `jcs` seam and move kernel program
identity with them. The ticket armed a tripwire on the way in:

> if any committed program declaration or corpus vector is found carrying an
> integer outside the safe range, STOP and take the disagreement to the
> operator's grill per the cut-over-then-grill rule — do not silently
> harmonize in either direction.

It fired. Nothing was collapsed, no file was deleted, and no fixture was
edited. `FINDING-CANON-DOMAIN-001.md` is the finding; the three scripts
beside it are the evidence, re-runnable from the repository root.

```bash
bun scratch/dev807/tripwire-scan.ts     # the scan that fired
bun scratch/dev807/collapse-probe.ts    # what jcs would emit for every vector
bun scratch/dev807/refusal-probe.ts     # which walls are armed against it
```

`gates-baseline.log` is the untouched-tree battery run these were taken
against; the finding's "Bounds" section states what that run does and does
not cover.
