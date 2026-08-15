// Lean compiler output
// Module: Replay.Faithless
// Imports: public import Init public meta import Init public import Replay.Core
#include <lean/lean.h>
#if defined(__clang__)
#pragma clang diagnostic ignored "-Wunused-parameter"
#pragma clang diagnostic ignored "-Wunused-label"
#elif defined(__GNUC__) && !defined(__CLANG__)
#pragma GCC diagnostic ignored "-Wunused-parameter"
#pragma GCC diagnostic ignored "-Wunused-label"
#pragma GCC diagnostic ignored "-Wunused-but-set-variable"
#endif
#ifdef __cplusplus
extern "C" {
#endif
uint8_t lean_nat_dec_eq(lean_object*, lean_object*);
lean_object* l_List_getD___redArg(lean_object*, lean_object*, lean_object*);
lean_object* lp_replay_Replay_commitStep(lean_object*, lean_object*, lean_object*, lean_object*);
static const lean_ctor_object lp_replay_Replay_Gcex___lam__0___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_replay_Replay_Gcex___lam__0___closed__0 = (const lean_object*)&lp_replay_Replay_Gcex___lam__0___closed__0_value;
LEAN_EXPORT lean_object* lp_replay_Replay_Gcex___lam__0(lean_object*);
LEAN_EXPORT lean_object* lp_replay_Replay_Gcex___lam__0___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_replay_Replay_Gcex___lam__1(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_replay_Replay_Gcex___lam__1___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_replay_Replay_Gcex___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_replay_Replay_Gcex___lam__0___boxed, .m_arity = 1, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_replay_Replay_Gcex___closed__0 = (const lean_object*)&lp_replay_Replay_Gcex___closed__0_value;
static const lean_closure_object lp_replay_Replay_Gcex___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_replay_Replay_Gcex___lam__1___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_replay_Replay_Gcex___closed__1 = (const lean_object*)&lp_replay_Replay_Gcex___closed__1_value;
static const lean_ctor_object lp_replay_Replay_Gcex___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)&lp_replay_Replay_Gcex___closed__0_value),((lean_object*)&lp_replay_Replay_Gcex___closed__1_value)}};
static const lean_object* lp_replay_Replay_Gcex___closed__2 = (const lean_object*)&lp_replay_Replay_Gcex___closed__2_value;
LEAN_EXPORT const lean_object* lp_replay_Replay_Gcex = (const lean_object*)&lp_replay_Replay_Gcex___closed__2_value;
LEAN_EXPORT lean_object* lp_replay___private_Replay_Faithless_0__Replay_empty(lean_object*);
LEAN_EXPORT lean_object* lp_replay___private_Replay_Faithless_0__Replay_empty___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_replay___private_Replay_Faithless_0__Replay_sigA___lam__0(lean_object*);
LEAN_EXPORT lean_object* lp_replay___private_Replay_Faithless_0__Replay_sigA___lam__0___boxed(lean_object*);
static const lean_closure_object lp_replay___private_Replay_Faithless_0__Replay_sigA___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_replay___private_Replay_Faithless_0__Replay_sigA___lam__0___boxed, .m_arity = 1, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_replay___private_Replay_Faithless_0__Replay_sigA___closed__0 = (const lean_object*)&lp_replay___private_Replay_Faithless_0__Replay_sigA___closed__0_value;
static const lean_closure_object lp_replay___private_Replay_Faithless_0__Replay_sigA___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*3, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_replay_Replay_commitStep, .m_arity = 4, .m_num_fixed = 3, .m_objs = {((lean_object*)&lp_replay_Replay_Gcex___closed__2_value),((lean_object*)&lp_replay___private_Replay_Faithless_0__Replay_sigA___closed__0_value),((lean_object*)(((size_t)(1) << 1) | 1))} };
static const lean_object* lp_replay___private_Replay_Faithless_0__Replay_sigA___closed__1 = (const lean_object*)&lp_replay___private_Replay_Faithless_0__Replay_sigA___closed__1_value;
LEAN_EXPORT lean_object* lp_replay___private_Replay_Faithless_0__Replay_sigA(lean_object*);
static const lean_closure_object lp_replay___private_Replay_Faithless_0__Replay_sigB___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*3, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_replay_Replay_commitStep, .m_arity = 4, .m_num_fixed = 3, .m_objs = {((lean_object*)&lp_replay_Replay_Gcex___closed__2_value),((lean_object*)&lp_replay___private_Replay_Faithless_0__Replay_sigA___closed__0_value),((lean_object*)(((size_t)(0) << 1) | 1))} };
static const lean_object* lp_replay___private_Replay_Faithless_0__Replay_sigB___closed__0 = (const lean_object*)&lp_replay___private_Replay_Faithless_0__Replay_sigB___closed__0_value;
LEAN_EXPORT lean_object* lp_replay___private_Replay_Faithless_0__Replay_sigB(lean_object*);
LEAN_EXPORT lean_object* lp_replay_Replay_Gcex___lam__0(lean_object* v_n_4_){
_start:
{
lean_object* v___x_5_; uint8_t v___x_6_; 
v___x_5_ = lean_unsigned_to_nat(1u);
v___x_6_ = lean_nat_dec_eq(v_n_4_, v___x_5_);
if (v___x_6_ == 0)
{
lean_object* v___x_7_; 
v___x_7_ = lean_box(0);
return v___x_7_;
}
else
{
lean_object* v___x_8_; 
v___x_8_ = ((lean_object*)(lp_replay_Replay_Gcex___lam__0___closed__0));
return v___x_8_;
}
}
}
LEAN_EXPORT lean_object* lp_replay_Replay_Gcex___lam__0___boxed(lean_object* v_n_9_){
_start:
{
lean_object* v_res_10_; 
v_res_10_ = lp_replay_Replay_Gcex___lam__0(v_n_9_);
lean_dec(v_n_9_);
return v_res_10_;
}
}
LEAN_EXPORT lean_object* lp_replay_Replay_Gcex___lam__1(lean_object* v_n_11_, lean_object* v_xs_12_){
_start:
{
lean_object* v___x_13_; uint8_t v___x_14_; 
v___x_13_ = lean_unsigned_to_nat(0u);
v___x_14_ = lean_nat_dec_eq(v_n_11_, v___x_13_);
if (v___x_14_ == 0)
{
lean_object* v___x_15_; 
v___x_15_ = l_List_getD___redArg(v_xs_12_, v___x_13_, v___x_13_);
return v___x_15_;
}
else
{
lean_object* v___x_16_; 
v___x_16_ = lean_unsigned_to_nat(1u);
return v___x_16_;
}
}
}
LEAN_EXPORT lean_object* lp_replay_Replay_Gcex___lam__1___boxed(lean_object* v_n_17_, lean_object* v_xs_18_){
_start:
{
lean_object* v_res_19_; 
v_res_19_ = lp_replay_Replay_Gcex___lam__1(v_n_17_, v_xs_18_);
lean_dec(v_xs_18_);
lean_dec(v_n_17_);
return v_res_19_;
}
}
LEAN_EXPORT lean_object* lp_replay___private_Replay_Faithless_0__Replay_empty(lean_object* v_x_26_){
_start:
{
lean_object* v___x_27_; 
v___x_27_ = lean_box(0);
return v___x_27_;
}
}
LEAN_EXPORT lean_object* lp_replay___private_Replay_Faithless_0__Replay_empty___boxed(lean_object* v_x_28_){
_start:
{
lean_object* v_res_29_; 
v_res_29_ = lp_replay___private_Replay_Faithless_0__Replay_empty(v_x_28_);
lean_dec(v_x_28_);
return v_res_29_;
}
}
LEAN_EXPORT lean_object* lp_replay___private_Replay_Faithless_0__Replay_sigA___lam__0(lean_object* v___y_30_){
_start:
{
lean_object* v___x_31_; 
v___x_31_ = lean_box(0);
return v___x_31_;
}
}
LEAN_EXPORT lean_object* lp_replay___private_Replay_Faithless_0__Replay_sigA___lam__0___boxed(lean_object* v___y_32_){
_start:
{
lean_object* v_res_33_; 
v_res_33_ = lp_replay___private_Replay_Faithless_0__Replay_sigA___lam__0(v___y_32_);
lean_dec(v___y_32_);
return v_res_33_;
}
}
LEAN_EXPORT lean_object* lp_replay___private_Replay_Faithless_0__Replay_sigA(lean_object* v_a_39_){
_start:
{
lean_object* v___x_40_; lean_object* v___x_41_; lean_object* v___x_42_; lean_object* v___x_43_; 
v___x_40_ = ((lean_object*)(lp_replay_Replay_Gcex));
v___x_41_ = ((lean_object*)(lp_replay___private_Replay_Faithless_0__Replay_sigA___closed__1));
v___x_42_ = lean_unsigned_to_nat(0u);
v___x_43_ = lp_replay_Replay_commitStep(v___x_40_, v___x_41_, v___x_42_, v_a_39_);
return v___x_43_;
}
}
LEAN_EXPORT lean_object* lp_replay___private_Replay_Faithless_0__Replay_sigB(lean_object* v_a_48_){
_start:
{
lean_object* v___x_49_; lean_object* v___x_50_; lean_object* v___x_51_; lean_object* v___x_52_; 
v___x_49_ = ((lean_object*)(lp_replay_Replay_Gcex));
v___x_50_ = ((lean_object*)(lp_replay___private_Replay_Faithless_0__Replay_sigB___closed__0));
v___x_51_ = lean_unsigned_to_nat(1u);
v___x_52_ = lp_replay_Replay_commitStep(v___x_49_, v___x_50_, v___x_51_, v_a_48_);
return v___x_52_;
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_replay_Replay_Core(uint8_t builtin);
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_replay_Replay_Faithless(uint8_t builtin) {
lean_object * res;
if (_G_initialized) return lean_io_result_mk_ok(lean_box(0));
_G_initialized = true;
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_replay_Replay_Core(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
