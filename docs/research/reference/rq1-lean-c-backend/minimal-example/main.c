/* RQ-1 minimal example — C caller for the Lean exports in Spike.lean.
 *
 * Own-authored for foldlab RQ-1, 2026-08-16. Every lean_* symbol used
 * here is quoted from <lean/lean.h> of toolchain leanprover/lean4:v4.33.0
 * or resolved from lib/lean/libleanrt.a in the same toolchain; nothing is
 * reconstructed from memory.
 *
 * What this probes, in order:
 *   1. initialization order and idempotence
 *   2. scalar exports (no lean_object* involved at all)
 *   3. ByteArray in / ByteArray out, and who owns the result
 *   4. a product return (state', receipt) read via lean_ctor_get
 *   5. an IO-typed export: what the world token does at the boundary
 *   6. the RC=1 in-place / RC>1 copy behaviour that decides per-call cost
 */

#include <lean/lean.h>
#include <stdio.h>
#include <string.h>

/* Declared by the Lean runtime, not by <lean/lean.h>.
 * Resolved from libleanrt.a: `nm -g libleanrt.a | grep lean_initialize`
 * reports `T lean_initialize_runtime_module` and `T lean_initialize_thread`. */
void lean_initialize_runtime_module(void);
void lean_initialize_thread(void);
void lean_finalize_thread(void);

/* Emitted by the Lean compiler into .lake/build/ir/Spike.c.
 * Package `spike`, module `Spike` => initialize_spike_Spike. */
lean_object *initialize_spike_Spike(uint8_t builtin);

/* The @[export] symbols. These signatures are copied verbatim from the
 * compiler's own output in .lake/build/ir/Spike.c. */
uint64_t spike_add(uint64_t, uint64_t);
lean_object *spike_step(lean_object *);
lean_object *spike_pair(lean_object *);
lean_object *spike_io(lean_object *);
uint64_t spike_size(lean_object *);

lean_object *spike_total(lean_object *);

/* Build an owned ByteArray from host bytes. lean_alloc_sarray(elem_size,
 * size, capacity) is a static inline in lean.h line ~1014. */
static lean_object *mk_byte_array_cap(const uint8_t *src, size_t n,
                                      size_t cap) {
  lean_object *ba = lean_alloc_sarray(1, n, cap);
  memcpy(lean_sarray_cptr(ba), src, n);
  return ba;
}

static lean_object *mk_byte_array(const uint8_t *src, size_t n) {
  return mk_byte_array_cap(src, n, n);
}

static void print_bytes(const char *label, lean_object *ba) {
  size_t n = lean_sarray_size(ba);
  uint8_t *p = lean_sarray_cptr(ba);
  printf("%s len=%zu bytes=", label, n);
  for (size_t i = 0; i < n; i++) printf("%02x", p[i]);
  printf(" ascii=\"%.*s\"\n", (int)n, (const char *)p);
}

int main(void) {
  /* --- 1. initialization --------------------------------------------- */
  lean_initialize_runtime_module();

  lean_object *ini = initialize_spike_Spike(1 /* builtin */);
  if (lean_io_result_is_error(ini)) {
    lean_io_result_show_error(ini);
    lean_dec(ini);
    return 1;
  }
  lean_dec_ref(ini);

  /* Called twice on purpose: the emitted initializer guards on a static
   * bool `_G_initialized`, so this must be a no-op returning ok. */
  lean_object *ini2 = initialize_spike_Spike(1);
  printf("init: second call is_ok=%d\n", lean_io_result_is_ok(ini2));
  lean_dec_ref(ini2);

  lean_io_mark_end_initialization();

  /* --- 2. scalars ----------------------------------------------------- */
  printf("spike_add(40,2) = %llu\n",
         (unsigned long long)spike_add(40u, 2u));

  /* --- 3. ByteArray in / out ------------------------------------------ */
  const uint8_t hello[] = {'h', 'e', 'l', 'l', 'o'};
  lean_object *in1 = mk_byte_array(hello, sizeof hello);
  printf("in1 exclusive before call = %d\n", (int)lean_is_exclusive(in1));
  uint8_t *in1_data = lean_sarray_cptr(in1);
  lean_object *out1 = spike_step(in1); /* consumes in1 */
  print_bytes("spike_step ->", out1);
  printf("spike_step reused input buffer in place: %d\n",
         (int)(lean_sarray_cptr(out1) == in1_data));
  lean_dec(out1);

  /* --- 4. product return ---------------------------------------------- */
  lean_object *in2 = mk_byte_array(hello, sizeof hello);
  lean_object *pr = spike_pair(in2);
  lean_object *st = lean_ctor_get(pr, 0); /* borrowed */
  lean_object *rc = lean_ctor_get(pr, 1); /* borrowed */
  print_bytes("pair.fst ->", st);
  print_bytes("pair.snd ->", rc);
  lean_dec(pr); /* frees both fields */

  /* --- 5. IO export ---------------------------------------------------- */
  lean_object *in3 = mk_byte_array(hello, sizeof hello);
  lean_object *io = spike_io(in3); /* NOTE: one argument, no world token */
  printf("spike_io is_ok=%d\n", lean_io_result_is_ok(io));
  print_bytes("spike_io value ->", lean_io_result_get_value(io));
  lean_dec(io);

  /* --- 6. RC>1: the shared-input copy path ----------------------------- */
  lean_object *in4 = mk_byte_array(hello, sizeof hello);
  lean_inc(in4); /* host keeps a second reference: rc = 2 */
  uint8_t *in4_data = lean_sarray_cptr(in4);
  lean_object *out4 = spike_step(in4); /* consumes one of the two refs */
  printf("rc=2 input reused in place: %d (0 means the runtime copied)\n",
         (int)(lean_sarray_cptr(out4) == in4_data));
  print_bytes("original still intact ->", in4);
  lean_dec(out4);
  lean_dec(in4); /* release the host's own reference */

  /* --- 6b. RC=1 WITH spare capacity: the true in-place path ------------ */
  lean_object *in4b = mk_byte_array_cap(hello, sizeof hello, sizeof hello + 8);
  uint8_t *in4b_data = lean_sarray_cptr(in4b);
  lean_object *out4b = spike_step(in4b);
  printf("rc=1 + spare capacity reused in place: %d\n",
         (int)(lean_sarray_cptr(out4b) == in4b_data));
  lean_dec(out4b);

  /* --- 7. empty input, the degenerate total case ----------------------- */
  lean_object *in5 = mk_byte_array((const uint8_t *)"", 0);
  printf("spike_size(empty) = %llu\n",
         (unsigned long long)spike_size(in5)); /* consumes in5 */

  /* --- 8. refusal-as-data on the empty input --------------------------- */
  lean_object *in6 = mk_byte_array((const uint8_t *)"", 0);
  lean_object *ref = spike_total(in6);
  print_bytes("spike_total(empty) ->", ref);
  lean_dec(ref);

  printf("OK\n");
  return 0;
}
