# Task 19 NATS hardening benchmark record

Machine: Windows/amd64, AMD Ryzen 7 8700F 8-Core Processor, 2026-08-13.
Both samples used one CPU, the same deterministic 1,000-entry read corpus,
`-benchmem`, `-count=10`, and `-benchtime=100ms`. The raw files are deliberately
uncommitted under `bench/results/`; this record preserves the benchstat medians
and significance results required by the ticket.

## Durability-mode price

These are final-code medians. `power-durable` is the pinned
`server.Options.SyncAlways` path; `crash-durable` leaves that option false.

| Hot path | crash-durable | power-durable | observed price |
| --- | ---: | ---: | ---: |
| Journal append | 31.95 us/op | 2.699 ms/op | 84.5x latency |
| Effector claim | 87.46 us/op | 2.850 ms/op | 32.6x latency |
| Effector commit | 84.81 us/op | 2.585 ms/op | 30.5x latency |

The two modes make different durability claims, so this table prices a choice;
it is not a regression comparison.

## Read-path comparison

The before sample is the retained sequential `Stream.GetMsg` walk. The after
sample is a bounded 16-request window over the same per-message management API,
with replies folded strictly in sequence order.

| Mode | before | after | benchstat |
| --- | ---: | ---: | --- |
| crash-durable | 18.34k entries/s | 26.62k entries/s | +45.18%, p=0.000 |
| power-durable | 27.82k entries/s | 24.13k entries/s | no significant change, p=0.089 |

Sync mode does not change the read implementation. The wide power-durable
before distribution (±38%) makes its apparent direction noise; only the
crash-durable gain is claimed.

The pipelined path allocates 154.2k times per 1,000-entry read versus 153.1k
before: +0.73% (p=0.000). This is an explained allocation regression, not
rounding: the high-level pinned API has one blocking `GetMsg` call per message,
so bounded concurrency adds goroutine/result bookkeeping while retaining the
same request surface. The measured throughput gain is the reason the bounded
window remains; a future async request primitive would need its own wall and
benchmark before replacing it.
