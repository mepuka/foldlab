/* RQ-1 probe 3 — initialization order and idempotence.
 * Own-authored for foldlab RQ-1, 2026-08-16.
 *
 * Modes:
 *   double  — call lean_initialize_runtime_module() twice, then work
 *   noinit  — call an @[export] symbol with NO initialization at all
 *   modonly — initialize the module but not the runtime
 *   order   — the documented order, as a control
 */
#include <lean/lean.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

void lean_initialize_runtime_module(void);
lean_object *initialize_spike_Spike(uint8_t builtin);
lean_object *spike_step(lean_object *);
lean_object *spike_total(lean_object *);

static lean_object *mk_ba(const uint8_t *s, size_t n) {
  lean_object *b = lean_alloc_sarray(1, n, n);
  if (n) memcpy(lean_sarray_cptr(b), s, n);
  return b;
}

static void work(const char *tag) {
  const uint8_t hi[] = {'h', 'i'};
  lean_object *o = spike_step(mk_ba(hi, 2));
  printf("%s: spike_step ok, len=%zu\n", tag, lean_sarray_size(o));
  lean_dec(o);
  /* spike_total returns a *closed term* on the empty branch, i.e. a
   * constant allocated by the module initializer — the case that
   * distinguishes "works by accident" from "actually initialized". */
  lean_object *r = spike_total(mk_ba(NULL, 0));
  printf("%s: spike_total(empty) len=%zu first=%d\n", tag,
         lean_sarray_size(r), (int)lean_sarray_cptr(r)[0]);
  lean_dec(r);
}

int main(int argc, char **argv) {
  const char *mode = argc > 1 ? argv[1] : "order";
  if (!strcmp(mode, "double")) {
    lean_initialize_runtime_module();
    lean_initialize_runtime_module();
    printf("double: survived two lean_initialize_runtime_module()\n");
    lean_object *i = initialize_spike_Spike(1);
    lean_dec_ref(i);
    lean_io_mark_end_initialization();
    work("double");
  } else if (!strcmp(mode, "noinit")) {
    printf("noinit: calling export with no initialization\n");
    fflush(stdout);
    work("noinit");
  } else if (!strcmp(mode, "modonly")) {
    printf("modonly: module initializer without runtime init\n");
    fflush(stdout);
    lean_object *i = initialize_spike_Spike(1);
    printf("modonly: initializer is_ok=%d\n", lean_io_result_is_ok(i));
    lean_dec_ref(i);
    lean_io_mark_end_initialization();
    work("modonly");
  } else {
    lean_initialize_runtime_module();
    lean_object *i = initialize_spike_Spike(1);
    lean_dec_ref(i);
    lean_io_mark_end_initialization();
    work("order");
  }
  printf("%s: DONE\n", mode);
  return 0;
}
