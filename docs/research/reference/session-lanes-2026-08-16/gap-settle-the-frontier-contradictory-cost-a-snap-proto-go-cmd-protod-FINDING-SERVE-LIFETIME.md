# FINDING-SERVE-LIFETIME — no explicit lifetime survives stdin EOF

Issue: [#44](https://github.com/mepuka/foldlab/issues/44). Reproduced on
fresh `origin/main` at
`72afae43d915c2a50ce9f0c79b7f852c80c8c2e0`, on Windows, before any code
change.

## Minimized real-process reproduction

The only required input is a disposable JetStream store. Stdin closes
immediately; there is no shell background-job or `nohup` behavior left in the
experiment:

```powershell
$null | go run ./cmd/protod --store <TEMP>
```

Three runs printed a valid ready fact, then exited successfully in 459 ms,
540 ms, and 717 ms:

```text
{"ready":true,"url":"nats://127.0.0.1:<PORT>"}
exit=0
```

This is D29 working as written, not an embedded-NATS failure:
`cmd/protod/main.go` selects between stdin EOF and `os.Interrupt`, and
`proto/AGENTS.md` promises that default lifetime for the Windows-compatible
test harness. The independent process test
`TestDefaultLifetimeExitsCleanlyWhenStdinCloses` builds and launches the real
binary, parses its ready line, closes its stdin, and requires a clean exit.

The finding is the missing second lifetime: a developer or service manager
cannot keep the foreground server alive after inherited stdin reaches EOF.
That makes the DX dossier's S1 background/service story unavailable without
the undocumented `sleep infinity | protod ...` workaround.

## Why repair stopped

No authority selects the public flag name:

- D29 ratifies only the existing default, stdin EOF or interrupt.
- The branch-only DX dossier at `6b25ae613` proposes `--detach` **or**
  `--no-stdin-shutdown` and labels the work unbuilt.
- Issue #44 proposes `--detach` **or** `--serve` and has no ratifying comment.

Choosing among those names would create an ungrilled public interface. No
runtime repair or speculative skipped test was added.

## Exact decision required

Ratify one explicit foreground service mode and its public name. Recommended:

> `--serve` keeps the default ready-line and foreground process behavior, but
> stdin EOF is not a shutdown signal; the process serves until its context is
> cancelled or an operating-system interrupt arrives. Without `--serve`, D29
> remains unchanged. The mode does not fork, reparent, close standard streams,
> or otherwise daemonize.

Alternatives:

- `--detach` is short, but conventionally promises daemonization that this mode
  does not perform and that is not portable to Windows.
- `--no-stdin-shutdown` is mechanically exact, but exposes the implementation
  accident rather than the user's service-lifetime intent.

After ratification, the green gate must be a real subprocess test: start the
binary in the explicit mode, close stdin, prove it remains live and responsive,
then deliver the licensed signal/context cancellation and require a clean exit.
The existing default-lifetime subprocess test remains its negative control.
