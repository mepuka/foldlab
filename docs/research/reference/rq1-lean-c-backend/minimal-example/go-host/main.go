// RQ-1 — the native fallback lane's Go half, exercised for real.
// Own-authored for foldlab RQ-1, 2026-08-16.
//
// Run: go run .   (after building ../kernel.dll, see ../README.md)
//
// As with the Bun host, no lean_* symbol appears: the Lean object
// constructors are static inline in lean.h and have no linkable symbol,
// so cgo cannot build a ByteArray either. Everything goes through the
// plain-C façade in shim.c.

package main

/*
#cgo CFLAGS: -I.
#cgo LDFLAGS: -L${SRCDIR}/.. -l:kernel.dll
#include <stdint.h>
#include <stdlib.h>
int  kernel_init(void);
int  kernel_step(const uint8_t *in, size_t in_len, uint8_t **out, size_t *out_len);
void kernel_free(uint8_t *p);
const char *kernel_build_id(void);
void kernel_thread_init(void);
void kernel_thread_fini(void);
*/
import "C"

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"runtime"
	"sort"
	"time"
	"unsafe"
)

func step(in []byte) ([]byte, error) {
	var out *C.uint8_t
	var outLen C.size_t
	var inPtr *C.uint8_t
	if len(in) > 0 {
		inPtr = (*C.uint8_t)(unsafe.Pointer(&in[0]))
	} else {
		var z C.uint8_t
		inPtr = &z
	}
	rc := C.kernel_step(inPtr, C.size_t(len(in)), &out, &outLen)
	if rc != 0 {
		return nil, fmt.Errorf("kernel_step rc=%d", int(rc))
	}
	b := C.GoBytes(unsafe.Pointer(out), C.int(outLen))
	C.kernel_free(out)
	return b, nil
}

func main() {
	// mode: "" (naive), "lock" (LockOSThread), "lock+ti" (LockOSThread and
	// lean_initialize_thread on that OS thread).
	mode := ""
	if len(os.Args) > 1 {
		mode = os.Args[1]
	}
	if mode == "lock" || mode == "lock+ti" {
		runtime.LockOSThread()
		defer runtime.UnlockOSThread()
	}
	fmt.Println("mode:", mode)

	raw, err := os.ReadFile("../kernel.dll")
	if err != nil {
		fmt.Println("cannot read artifact:", err)
	} else {
		sum := sha256.Sum256(raw)
		fmt.Println("artifact sha256 ->", hex.EncodeToString(sum[:]))
	}

	fmt.Println("kernel_init ->", int(C.kernel_init()))
	if mode == "lock+ti" {
		C.kernel_thread_init()
		defer C.kernel_thread_fini()
	}
	fmt.Println("kernel_build_id ->", C.GoString(C.kernel_build_id()))

	b, err := step([]byte("hello"))
	fmt.Println("step(\"hello\") ->", b, err)
	b, err = step(nil)
	fmt.Println("step(\"\")      ->", b, err)

	payload := make([]byte, 10240)
	for i := range payload {
		payload[i] = byte(i)
	}
	for i := 0; i < 5000; i++ {
		_, _ = step(payload)
	}
	// Windows' Go clock is too coarse to time one call, so time batches of
	// 100 and report the per-call figure derived from the batch median.
	const batches, per = 50, 2000
	samples := make([]time.Duration, batches)
	for i := range samples {
		t0 := time.Now()
		for j := 0; j < per; j++ {
			_, _ = step(payload)
		}
		samples[i] = time.Since(t0) / per
	}
	sort.Slice(samples, func(i, j int) bool { return samples[i] < samples[j] })
	fmt.Printf("cgo 10KB round trip (batch/%d)  p50=%v p90=%v p99=%v\n",
		per, samples[batches/2], samples[batches*9/10], samples[batches*99/100])
}
