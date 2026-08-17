/* RQ-1 probes 2 — panic behaviour, host threads, and a first per-call
 * cost measurement at the 10 KB payload that D-a's T3 threshold names.
 *
 * Own-authored for foldlab RQ-1, 2026-08-16.
 *
 * Build/run instructions are in this directory's README.md. Selected by
 * argv[1]:
 *   panic   — call an @[export]ed Lean function that hits `panic!`
 *   thread  — call an export from a host thread the Lean runtime did not
 *             spawn, with and without lean_initialize_thread()
 *   bench   — steady-state per-call cost of spike_step at 10 KB
 *   threadbench — N host threads each hammering spike_step on its own
 *             session-sized buffer, to see whether per-session
 *             serialization is enough (D-a threshold T4)
 */

#include <lean/lean.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <windows.h>

void lean_initialize_runtime_module(void);
void lean_initialize_thread(void);
void lean_finalize_thread(void);
lean_object *initialize_spike_Spike(uint8_t builtin);

lean_object *spike_step(lean_object *);
lean_object *spike_panic(lean_object *);
lean_object *spike_total(lean_object *);

static lean_object *mk_ba(const uint8_t *src, size_t n) {
  lean_object *ba = lean_alloc_sarray(1, n, n);
  if (n) memcpy(lean_sarray_cptr(ba), src, n);
  return ba;
}

static void boot(void) {
  lean_initialize_runtime_module();
  lean_object *ini = initialize_spike_Spike(1);
  if (lean_io_result_is_error(ini)) {
    lean_io_result_show_error(ini);
    exit(2);
  }
  lean_dec_ref(ini);
  lean_io_mark_end_initialization();
}

/* ---------------- panic ---------------------------------------------- */
static int do_panic(void) {
  printf("before spike_panic(empty)\n");
  fflush(stdout);
  lean_object *r = spike_panic(mk_ba(NULL, 0));
  printf("after  spike_panic(empty): returned, len=%zu\n",
         lean_sarray_size(r));
  lean_dec(r);
  printf("PROCESS SURVIVED PANIC\n");
  return 0;
}

/* ---------------- host threads ---------------------------------------- */
typedef struct {
  int init_thread; /* call lean_initialize_thread()? */
  int iterations;
  size_t payload;
  int ok;
} thread_arg;

static DWORD WINAPI worker(LPVOID p) {
  thread_arg *a = (thread_arg *)p;
  if (a->init_thread) lean_initialize_thread();
  uint8_t *buf = (uint8_t *)calloc(a->payload, 1);
  for (int i = 0; i < a->iterations; i++) {
    lean_object *in = mk_ba(buf, a->payload);
    lean_object *out = spike_step(in);
    if (lean_sarray_size(out) != a->payload + 1) {
      a->ok = 0;
      lean_dec(out);
      free(buf);
      return 1;
    }
    lean_dec(out);
  }
  free(buf);
  a->ok = 1;
  if (a->init_thread) lean_finalize_thread();
  return 0;
}

static int do_thread(int init_thread) {
  thread_arg a = {init_thread, 1000, 1024, 0};
  printf("spawning host thread, lean_initialize_thread=%d\n", init_thread);
  fflush(stdout);
  HANDLE h = CreateThread(NULL, 0, worker, &a, 0, NULL);
  WaitForSingleObject(h, INFINITE);
  DWORD code = 0;
  GetExitCodeThread(h, &code);
  CloseHandle(h);
  printf("thread returned %lu, ok=%d\n", (unsigned long)code, a.ok);
  return a.ok ? 0 : 1;
}

/* Each thread owns its own state buffer: the "per-session serialization"
 * pattern D-a's T4 asks about. No Lean object is shared between threads. */
static int do_threadbench(int nthreads, int iters) {
  HANDLE h[32];
  thread_arg a[32];
  if (nthreads > 32) nthreads = 32;
  LARGE_INTEGER f, t0, t1;
  QueryPerformanceFrequency(&f);
  QueryPerformanceCounter(&t0);
  for (int i = 0; i < nthreads; i++) {
    a[i].init_thread = 1;
    a[i].iterations = iters;
    a[i].payload = 10240;
    a[i].ok = 0;
    h[i] = CreateThread(NULL, 0, worker, &a[i], 0, NULL);
  }
  WaitForMultipleObjects(nthreads, h, TRUE, INFINITE);
  QueryPerformanceCounter(&t1);
  int allok = 1;
  for (int i = 0; i < nthreads; i++) {
    if (!a[i].ok) allok = 0;
    CloseHandle(h[i]);
  }
  double secs = (double)(t1.QuadPart - t0.QuadPart) / (double)f.QuadPart;
  printf("threads=%d iters=%d payload=10240 all_ok=%d wall=%.3fs\n",
         nthreads, iters, allok, secs);
  return allok ? 0 : 1;
}

/* ---------------- bench ------------------------------------------------ */
static int cmp_double(const void *a, const void *b) {
  double x = *(const double *)a, y = *(const double *)b;
  return (x > y) - (x < y);
}

static int do_bench(size_t payload, int iters) {
  uint8_t *buf = (uint8_t *)calloc(payload, 1);
  for (size_t i = 0; i < payload; i++) buf[i] = (uint8_t)(i & 0xff);
  double *samples = (double *)malloc(sizeof(double) * iters);
  LARGE_INTEGER f, t0, t1;
  QueryPerformanceFrequency(&f);

  /* warm-up: let the allocator reach steady state */
  for (int i = 0; i < iters / 10 + 100; i++) {
    lean_object *o = spike_step(mk_ba(buf, payload));
    lean_dec(o);
  }

  for (int i = 0; i < iters; i++) {
    QueryPerformanceCounter(&t0);
    lean_object *in = mk_ba(buf, payload);   /* host -> Lean marshalling */
    lean_object *out = spike_step(in);       /* the call itself */
    volatile size_t n = lean_sarray_size(out);
    (void)n;
    memcpy(buf, lean_sarray_cptr(out), payload); /* Lean -> host */
    lean_dec(out);
    QueryPerformanceCounter(&t1);
    samples[i] =
        (double)(t1.QuadPart - t0.QuadPart) * 1e6 / (double)f.QuadPart;
  }
  qsort(samples, iters, sizeof(double), cmp_double);
  printf("payload=%zu iters=%d  p50=%.3fus p90=%.3fus p99=%.3fus "
         "min=%.3fus max=%.3fus\n",
         payload, iters, samples[iters / 2], samples[(iters * 90) / 100],
         samples[(iters * 99) / 100], samples[0], samples[iters - 1]);
  free(samples);
  free(buf);
  return 0;
}

int main(int argc, char **argv) {
  boot();
  const char *mode = argc > 1 ? argv[1] : "bench";
  if (!strcmp(mode, "panic")) return do_panic();
  if (!strcmp(mode, "thread")) return do_thread(1);
  if (!strcmp(mode, "thread-noinit")) return do_thread(0);
  if (!strcmp(mode, "threadbench"))
    return do_threadbench(argc > 2 ? atoi(argv[2]) : 4,
                          argc > 3 ? atoi(argv[3]) : 20000);
  if (!strcmp(mode, "bench")) {
    do_bench(64, 20000);
    do_bench(1024, 20000);
    do_bench(10240, 20000);
    do_bench(102400, 5000);
    return 0;
  }
  fprintf(stderr, "unknown mode %s\n", mode);
  return 2;
}
