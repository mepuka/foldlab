# RQ-1 minimal example — build script (Windows).
# Own-authored for foldlab RQ-1, 2026-08-16.
#
# Reproduces every artifact the RQ-1 report cites. Run from this directory.
# Requires: elan-managed leanprover/lean4:v4.33.0 on PATH, MSYS2 gcc, and
# (for the host lanes) Bun and Go with CGO_ENABLED=1.
#
# The Lean toolchain root is discovered from `lean --print-prefix`.

$ErrorActionPreference = "Stop"

$T = (& lean --print-prefix).Trim()
Write-Host "Lean toolchain: $T"
Write-Host "Lean version:   $((& lean --version))"

# 1. Lean -> C -> static archive. Emitted C lands in .lake/build/ir/Spike.c.
lake build Spike:static

# 2. The freestanding C driver. Compiled by MSYS2 gcc, LINKED by leanc:
#    libleanrt.a is C++ built against LLVM libc++, so MSYS2 ld cannot
#    resolve its std::__1:: symbols. See README.md, "the gcc link wall".
gcc -std=c11 -O2 "-I$T/include" -c main.c      -o main.o
gcc -std=c11 -O2 "-I$T/include" -c probe.c     -o probe.o
gcc -std=c11 -O2 "-I$T/include" -c initprobe.c -o initprobe.o
gcc -std=c11 -O2 "-I$T/include" -c shim.c      -o shim.o

& "$T/bin/leanc.exe" main.o      .lake/build/lib/spike_Spike.a -o spike_native.exe
& "$T/bin/leanc.exe" probe.o     .lake/build/lib/spike_Spike.a -o spike_probe.exe
& "$T/bin/leanc.exe" initprobe.o .lake/build/lib/spike_Spike.a -o spike_init.exe

# 3. A SELF-CONTAINED shared library for the bun:ffi / cgo lane.
#    Note the explicit static archives: `lake build Spike:shared` and a bare
#    `leanc -shared` both link the Lean *shared* runtime instead, which drags
#    in ~178 MB of DLLs. See README.md, "the shared-library trap".
$link = @(
  "-shared", "shim.o", ".lake/build/ir/Spike.c.o.noexport",
  "$T/lib/lean/libInit.a", "$T/lib/lean/libStd.a", "$T/lib/lean/libleanrt.a",
  "-o", "kernel.dll", "-Wl,--gc-sections",
  # Without this the PE header carries the build clock and two links of the
  # identical inputs differ. Verified on this machine, 2026-08-16.
  "-Wl,--no-insert-timestamp"
)
& "$T/bin/leanc.exe" @link

# 4. The T2 baseline: a bare driver linked by the same driver, no Lean.
"int main(void){return 0;}" | Out-File -Encoding ascii bare.c
gcc -O2 -c bare.c -o bare.o
& "$T/bin/leanc.exe" bare.o -o bare_leanc.exe

Get-ChildItem kernel.dll, spike_native.exe, bare_leanc.exe, `
  .lake/build/lib/spike_Spike.a | Select-Object Name, Length
