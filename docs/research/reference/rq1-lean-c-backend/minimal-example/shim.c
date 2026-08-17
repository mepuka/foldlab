/* RQ-1 — the plain-C shim the native fallback lane actually needs.
 *
 * Own-authored for foldlab RQ-1, 2026-08-16.
 *
 * Why this file exists: `@[export]` symbols speak the Lean object ABI.
 * Their arguments and results are `lean_object *`, and the only way to
 * build one is `lean_alloc_sarray`, which is a `static inline` in
 * <lean/lean.h> — a header-only definition, so it is NOT a linkable
 * symbol and cannot be reached through `bun:ffi`, cgo's dlopen, or any
 * other host that only knows how to call C functions by name.
 *
 * So the kernel must carry its own bytes-in/bytes-out façade, compiled
 * against lean.h on the Lean side of the wall. That is this file. The
 * host sees only: init, step, free — no Lean object ever crosses.
 *
 * ABI (deliberately D-d shaped, minus the second output for brevity):
 *   int  kernel_init(void)                          -> 0 on success
 *   int  kernel_step(const uint8_t *in, size_t in_len,
 *                    uint8_t **out, size_t *out_len) -> 0 on success
 *   void kernel_free(uint8_t *p)
 *   const char *kernel_build_id(void)
 */

#include <lean/lean.h>
#include <stdlib.h>
#include <string.h>

#ifdef _WIN32
#define KERNEL_API __declspec(dllexport)
#else
#define KERNEL_API __attribute__((visibility("default")))
#endif

void lean_initialize_runtime_module(void);
void lean_initialize_thread(void);
void lean_finalize_thread(void);
lean_object *initialize_spike_Spike(uint8_t builtin);
lean_object *spike_total(lean_object *);

/* Exposed because a host whose threads the Lean runtime did not spawn
 * (cgo's Ms, a worker pool, Bun's thread) must announce each one. */
KERNEL_API void kernel_thread_init(void);
KERNEL_API void kernel_thread_fini(void);

static int g_booted = 0;

KERNEL_API int kernel_init(void) {
  if (g_booted) return 0; /* our own idempotence, not the runtime's */
  lean_initialize_runtime_module();
  lean_object *ini = initialize_spike_Spike(1);
  if (lean_io_result_is_error(ini)) {
    lean_dec(ini);
    return 1;
  }
  lean_dec_ref(ini);
  lean_io_mark_end_initialization();
  g_booted = 1;
  return 0;
}

KERNEL_API int kernel_step(const uint8_t *in, size_t in_len, uint8_t **out,
                           size_t *out_len) {
  if (!g_booted) return 2;
  if (!out || !out_len) return 3;

  lean_object *arg = lean_alloc_sarray(1, in_len, in_len);
  if (in_len) memcpy(lean_sarray_cptr(arg), in, in_len);

  lean_object *res = spike_total(arg); /* owned result */

  size_t n = lean_sarray_size(res);
  uint8_t *buf = (uint8_t *)malloc(n ? n : 1);
  if (!buf) {
    lean_dec(res);
    return 4;
  }
  if (n) memcpy(buf, lean_sarray_cptr(res), n);
  lean_dec(res); /* the only place a Lean object is released */

  *out = buf;
  *out_len = n;
  return 0;
}

KERNEL_API void kernel_free(uint8_t *p) { free(p); }

KERNEL_API void kernel_thread_init(void) { lean_initialize_thread(); }
KERNEL_API void kernel_thread_fini(void) { lean_finalize_thread(); }

/* D-d's "self-identifying" obligation in its cheapest form: a build
 * identity string the host can read without parsing the artifact. */
KERNEL_API const char *kernel_build_id(void) {
  return "rq1-spike/leanprover-lean4-v4.33.0";
}
