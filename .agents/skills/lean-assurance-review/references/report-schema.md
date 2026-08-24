# Assurance report schema

## Claim

- headline claim and exact scope;
- source intent/reference;
- formal theorem/declaration;
- required implementation/deployment link.

## Findings

| Field      | Values                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| class      | `spec-mismatch`, `model-mismatch`, `proof-debt`, `implementation-gap`, `external-trust`, `observational-gap` |
| severity   | blocker, major, minor                                                                                        |
| status     | confirmed, assumed, unknown, out-of-scope                                                                    |
| evidence   | exact file/declaration/command/result/test/receipt                                                           |
| correction | strongest supported wording or required fix                                                                  |

## Evidence bundle

```text
proved       : theorem refs + axiom/checker policy
modelChecked : property + finite/model bounds
tested       : property + oracle/coverage/context
measured     : metric + platform/workload/uncertainty
monitored    : assumption + event semantics + status
assumed      : explicit assumption + owner/validation route
unknown      : open obligation + consequence
```

Close with per-axis and end-to-end verdicts. Never summarize as a bare `verified : Bool`.
