# RUNBOOK — reproducing every RQ-3 transcript

Run from this directory. Recorded on Windows 11 x86-64, Go 1.26.5,
Bun 1.3.14, 2026-08-16. Network is needed once, to fetch
`github.com/tetratelabs/wazero v1.12.0` into the module cache.

## 0. Regenerate the probes (byte-identical)

`gen/` is its own module, so use `-C` (or `cd`) rather than a package
path:

```
go run -C gen . ../wasm
```

Prints one `name  bytes  sha256=…` line per module. `probe.wasm` must
come out as
`ec49aa6decea4c8a6562c6ca5baadf08bd4466dc3368c42e92881ddc3a768b50`.

## 1. Zero-import identity, both hosts

```
go build -C host-wazero -o host-wazero.exe .
./host-wazero/host-wazero.exe identity ./wasm     > transcripts/wazero-identity.txt
cd host-bun && bun run run.ts identity ../wasm    > ../transcripts/bun-identity.txt
```

The two transcripts differ only in the `host=` / `engine=` labels. Diff
them with those labels stripped.

## 2. Which post-2.0 proposals each host accepts

```
./host-wazero/host-wazero.exe features ./wasm     > transcripts/wazero-features.txt
cd host-bun && bun run run.ts features ../wasm    > ../transcripts/bun-features.txt
```

## 3. WASI preview1, both hosts

```
./host-wazero/host-wazero.exe wasi ./wasm         > transcripts/wazero-wasi.txt

# Bun's node:wasi lets proc_exit exit the Bun process, so run one per process:
cd host-bun
for f in wasi_min.wasm wasi_grow.wasm wasi_rand_ok.wasm wasi_rand_oob.wasm; do
  bun run run.ts wasi ../wasm $f
  echo "$f bun_process_exit=$?"
done > ../transcripts/bun-wasi.txt 2>&1
```

## 4. A realistic WASI import surface, and the same bytes in both hosts

```
cd gowasi && GOOS=wasip1 GOARCH=wasm go build -o hello.wasm . && cd ..
./host-wazero/host-wazero.exe imports gowasi/hello.wasm > transcripts/wazero-gowasi-imports.txt
./host-wazero/host-wazero.exe run     gowasi/hello.wasm
bun ./gowasi/hello.wasm
```

`hello.wasm` is 2.6 MB and is deliberately not kept in the repository.
Its digest at the time of recording is in
`transcripts/gowasi-both-hosts.txt`; it is Go-toolchain-specific and is
recorded as a datum, not as a gate.

## 5. wazero concurrency patterns

```
RQ3_CONC=BC ./host-wazero/host-wazero.exe conc ./wasm    # clean
RQ3_CONC=A  ./host-wazero/host-wazero.exe conc ./wasm    # crashes the process
```

`RQ3_CONC=A` shares one `api.Function` across goroutines, which wazero
documents as unsafe. It faults the Go runtime; the default of `BC` is
deliberate so nobody trips over it by accident.
