// Lean compiler output
// Module: Replay.Core
// Imports: public import Init public meta import Init
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
lean_object* l_List_reverse___redArg(lean_object*);
uint8_t lean_nat_dec_eq(lean_object*, lean_object*);
lean_object* lean_nat_sub(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_replay_Replay_evalF(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_replay_List_mapTR_loop___at___00Replay_evalF_spec__0(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_replay_List_mapTR_loop___at___00Replay_evalF_spec__0___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_replay_Replay_evalF___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_replay_Replay_eval(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_replay___private_Replay_Core_0__Replay_evalF_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_replay___private_Replay_Core_0__Replay_evalF_match__1_splitter___redArg___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_replay___private_Replay_Core_0__Replay_evalF_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_replay___private_Replay_Core_0__Replay_evalF_match__1_splitter___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_replay_List_mapTR_loop___at___00Replay_inputs_spec__0(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_replay_Replay_inputs(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_replay_Replay_commitStep(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_replay_Replay_replayF(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_replay_List_mapTR_loop___at___00Replay_replayF_spec__0(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_replay_List_mapTR_loop___at___00Replay_replayF_spec__0___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_replay_Replay_replayF___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_replay_Replay_replay(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_replay___private_Replay_Core_0__Replay_replayF_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_replay___private_Replay_Core_0__Replay_replayF_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_replay_Replay_evalF(lean_object* v_G_1_, lean_object* v_x_2_, lean_object* v_x_3_){
_start:
{
lean_object* v_zero_4_; uint8_t v_isZero_5_; 
v_zero_4_ = lean_unsigned_to_nat(0u);
v_isZero_5_ = lean_nat_dec_eq(v_x_2_, v_zero_4_);
if (v_isZero_5_ == 1)
{
lean_object* v_body_6_; lean_object* v___x_7_; lean_object* v___x_8_; 
v_body_6_ = lean_ctor_get(v_G_1_, 1);
lean_inc_ref(v_body_6_);
lean_dec_ref(v_G_1_);
v___x_7_ = lean_box(0);
v___x_8_ = lean_apply_2(v_body_6_, v_x_3_, v___x_7_);
return v___x_8_;
}
else
{
lean_object* v_preds_9_; lean_object* v_body_10_; lean_object* v_one_11_; lean_object* v_n_12_; lean_object* v___x_13_; lean_object* v___x_14_; lean_object* v___x_15_; lean_object* v___x_16_; 
v_preds_9_ = lean_ctor_get(v_G_1_, 0);
v_body_10_ = lean_ctor_get(v_G_1_, 1);
lean_inc_ref(v_body_10_);
v_one_11_ = lean_unsigned_to_nat(1u);
v_n_12_ = lean_nat_sub(v_x_2_, v_one_11_);
lean_inc_ref(v_preds_9_);
lean_inc(v_x_3_);
v___x_13_ = lean_apply_1(v_preds_9_, v_x_3_);
v___x_14_ = lean_box(0);
v___x_15_ = lp_replay_List_mapTR_loop___at___00Replay_evalF_spec__0(v_G_1_, v_n_12_, v___x_13_, v___x_14_);
lean_dec(v_n_12_);
v___x_16_ = lean_apply_2(v_body_10_, v_x_3_, v___x_15_);
return v___x_16_;
}
}
}
LEAN_EXPORT lean_object* lp_replay_List_mapTR_loop___at___00Replay_evalF_spec__0(lean_object* v_G_17_, lean_object* v_n_18_, lean_object* v_a_19_, lean_object* v_a_20_){
_start:
{
if (lean_obj_tag(v_a_19_) == 0)
{
lean_object* v___x_21_; 
lean_dec_ref(v_G_17_);
v___x_21_ = l_List_reverse___redArg(v_a_20_);
return v___x_21_;
}
else
{
lean_object* v_head_22_; lean_object* v_tail_23_; lean_object* v___x_25_; uint8_t v_isShared_26_; uint8_t v_isSharedCheck_32_; 
v_head_22_ = lean_ctor_get(v_a_19_, 0);
v_tail_23_ = lean_ctor_get(v_a_19_, 1);
v_isSharedCheck_32_ = !lean_is_exclusive(v_a_19_);
if (v_isSharedCheck_32_ == 0)
{
v___x_25_ = v_a_19_;
v_isShared_26_ = v_isSharedCheck_32_;
goto v_resetjp_24_;
}
else
{
lean_inc(v_tail_23_);
lean_inc(v_head_22_);
lean_dec(v_a_19_);
v___x_25_ = lean_box(0);
v_isShared_26_ = v_isSharedCheck_32_;
goto v_resetjp_24_;
}
v_resetjp_24_:
{
lean_object* v___x_27_; lean_object* v___x_29_; 
lean_inc_ref(v_G_17_);
v___x_27_ = lp_replay_Replay_evalF(v_G_17_, v_n_18_, v_head_22_);
if (v_isShared_26_ == 0)
{
lean_ctor_set(v___x_25_, 1, v_a_20_);
lean_ctor_set(v___x_25_, 0, v___x_27_);
v___x_29_ = v___x_25_;
goto v_reusejp_28_;
}
else
{
lean_object* v_reuseFailAlloc_31_; 
v_reuseFailAlloc_31_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_31_, 0, v___x_27_);
lean_ctor_set(v_reuseFailAlloc_31_, 1, v_a_20_);
v___x_29_ = v_reuseFailAlloc_31_;
goto v_reusejp_28_;
}
v_reusejp_28_:
{
v_a_19_ = v_tail_23_;
v_a_20_ = v___x_29_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_replay_List_mapTR_loop___at___00Replay_evalF_spec__0___boxed(lean_object* v_G_33_, lean_object* v_n_34_, lean_object* v_a_35_, lean_object* v_a_36_){
_start:
{
lean_object* v_res_37_; 
v_res_37_ = lp_replay_List_mapTR_loop___at___00Replay_evalF_spec__0(v_G_33_, v_n_34_, v_a_35_, v_a_36_);
lean_dec(v_n_34_);
return v_res_37_;
}
}
LEAN_EXPORT lean_object* lp_replay_Replay_evalF___boxed(lean_object* v_G_38_, lean_object* v_x_39_, lean_object* v_x_40_){
_start:
{
lean_object* v_res_41_; 
v_res_41_ = lp_replay_Replay_evalF(v_G_38_, v_x_39_, v_x_40_);
lean_dec(v_x_39_);
return v_res_41_;
}
}
LEAN_EXPORT lean_object* lp_replay_Replay_eval(lean_object* v_G_42_, lean_object* v_n_43_){
_start:
{
lean_object* v___x_44_; 
lean_inc(v_n_43_);
v___x_44_ = lp_replay_Replay_evalF(v_G_42_, v_n_43_, v_n_43_);
lean_dec(v_n_43_);
return v___x_44_;
}
}
LEAN_EXPORT lean_object* lp_replay___private_Replay_Core_0__Replay_evalF_match__1_splitter___redArg(lean_object* v_x_45_, lean_object* v_x_46_, lean_object* v_h__1_47_, lean_object* v_h__2_48_){
_start:
{
lean_object* v_zero_49_; uint8_t v_isZero_50_; 
v_zero_49_ = lean_unsigned_to_nat(0u);
v_isZero_50_ = lean_nat_dec_eq(v_x_45_, v_zero_49_);
if (v_isZero_50_ == 1)
{
lean_object* v___x_51_; 
lean_dec(v_h__2_48_);
v___x_51_ = lean_apply_1(v_h__1_47_, v_x_46_);
return v___x_51_;
}
else
{
lean_object* v_one_52_; lean_object* v_n_53_; lean_object* v___x_54_; 
lean_dec(v_h__1_47_);
v_one_52_ = lean_unsigned_to_nat(1u);
v_n_53_ = lean_nat_sub(v_x_45_, v_one_52_);
v___x_54_ = lean_apply_2(v_h__2_48_, v_n_53_, v_x_46_);
return v___x_54_;
}
}
}
LEAN_EXPORT lean_object* lp_replay___private_Replay_Core_0__Replay_evalF_match__1_splitter___redArg___boxed(lean_object* v_x_55_, lean_object* v_x_56_, lean_object* v_h__1_57_, lean_object* v_h__2_58_){
_start:
{
lean_object* v_res_59_; 
v_res_59_ = lp_replay___private_Replay_Core_0__Replay_evalF_match__1_splitter___redArg(v_x_55_, v_x_56_, v_h__1_57_, v_h__2_58_);
lean_dec(v_x_55_);
return v_res_59_;
}
}
LEAN_EXPORT lean_object* lp_replay___private_Replay_Core_0__Replay_evalF_match__1_splitter(lean_object* v_motive_60_, lean_object* v_x_61_, lean_object* v_x_62_, lean_object* v_h__1_63_, lean_object* v_h__2_64_){
_start:
{
lean_object* v_zero_65_; uint8_t v_isZero_66_; 
v_zero_65_ = lean_unsigned_to_nat(0u);
v_isZero_66_ = lean_nat_dec_eq(v_x_61_, v_zero_65_);
if (v_isZero_66_ == 1)
{
lean_object* v___x_67_; 
lean_dec(v_h__2_64_);
v___x_67_ = lean_apply_1(v_h__1_63_, v_x_62_);
return v___x_67_;
}
else
{
lean_object* v_one_68_; lean_object* v_n_69_; lean_object* v___x_70_; 
lean_dec(v_h__1_63_);
v_one_68_ = lean_unsigned_to_nat(1u);
v_n_69_ = lean_nat_sub(v_x_61_, v_one_68_);
v___x_70_ = lean_apply_2(v_h__2_64_, v_n_69_, v_x_62_);
return v___x_70_;
}
}
}
LEAN_EXPORT lean_object* lp_replay___private_Replay_Core_0__Replay_evalF_match__1_splitter___boxed(lean_object* v_motive_71_, lean_object* v_x_72_, lean_object* v_x_73_, lean_object* v_h__1_74_, lean_object* v_h__2_75_){
_start:
{
lean_object* v_res_76_; 
v_res_76_ = lp_replay___private_Replay_Core_0__Replay_evalF_match__1_splitter(v_motive_71_, v_x_72_, v_x_73_, v_h__1_74_, v_h__2_75_);
lean_dec(v_x_72_);
return v_res_76_;
}
}
LEAN_EXPORT lean_object* lp_replay_List_mapTR_loop___at___00Replay_inputs_spec__0(lean_object* v_00_u03c3_77_, lean_object* v_a_78_, lean_object* v_a_79_){
_start:
{
if (lean_obj_tag(v_a_78_) == 0)
{
lean_object* v___x_80_; 
lean_dec_ref(v_00_u03c3_77_);
v___x_80_ = l_List_reverse___redArg(v_a_79_);
return v___x_80_;
}
else
{
lean_object* v_head_81_; lean_object* v_tail_82_; lean_object* v___x_84_; uint8_t v_isShared_85_; uint8_t v_isSharedCheck_95_; 
v_head_81_ = lean_ctor_get(v_a_78_, 0);
v_tail_82_ = lean_ctor_get(v_a_78_, 1);
v_isSharedCheck_95_ = !lean_is_exclusive(v_a_78_);
if (v_isSharedCheck_95_ == 0)
{
v___x_84_ = v_a_78_;
v_isShared_85_ = v_isSharedCheck_95_;
goto v_resetjp_83_;
}
else
{
lean_inc(v_tail_82_);
lean_inc(v_head_81_);
lean_dec(v_a_78_);
v___x_84_ = lean_box(0);
v_isShared_85_ = v_isSharedCheck_95_;
goto v_resetjp_83_;
}
v_resetjp_83_:
{
lean_object* v___y_87_; lean_object* v___x_92_; 
lean_inc_ref(v_00_u03c3_77_);
v___x_92_ = lean_apply_1(v_00_u03c3_77_, v_head_81_);
if (lean_obj_tag(v___x_92_) == 0)
{
lean_object* v___x_93_; 
v___x_93_ = lean_unsigned_to_nat(0u);
v___y_87_ = v___x_93_;
goto v___jp_86_;
}
else
{
lean_object* v_val_94_; 
v_val_94_ = lean_ctor_get(v___x_92_, 0);
lean_inc(v_val_94_);
lean_dec_ref_known(v___x_92_, 1);
v___y_87_ = v_val_94_;
goto v___jp_86_;
}
v___jp_86_:
{
lean_object* v___x_89_; 
if (v_isShared_85_ == 0)
{
lean_ctor_set(v___x_84_, 1, v_a_79_);
lean_ctor_set(v___x_84_, 0, v___y_87_);
v___x_89_ = v___x_84_;
goto v_reusejp_88_;
}
else
{
lean_object* v_reuseFailAlloc_91_; 
v_reuseFailAlloc_91_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_91_, 0, v___y_87_);
lean_ctor_set(v_reuseFailAlloc_91_, 1, v_a_79_);
v___x_89_ = v_reuseFailAlloc_91_;
goto v_reusejp_88_;
}
v_reusejp_88_:
{
v_a_78_ = v_tail_82_;
v_a_79_ = v___x_89_;
goto _start;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_replay_Replay_inputs(lean_object* v_G_96_, lean_object* v_00_u03c3_97_, lean_object* v_n_98_){
_start:
{
lean_object* v_preds_99_; lean_object* v___x_100_; lean_object* v___x_101_; lean_object* v___x_102_; 
v_preds_99_ = lean_ctor_get(v_G_96_, 0);
lean_inc_ref(v_preds_99_);
lean_dec_ref(v_G_96_);
v___x_100_ = lean_apply_1(v_preds_99_, v_n_98_);
v___x_101_ = lean_box(0);
v___x_102_ = lp_replay_List_mapTR_loop___at___00Replay_inputs_spec__0(v_00_u03c3_97_, v___x_100_, v___x_101_);
return v___x_102_;
}
}
LEAN_EXPORT lean_object* lp_replay_Replay_commitStep(lean_object* v_G_103_, lean_object* v_00_u03c3_104_, lean_object* v_n_105_, lean_object* v_m_106_){
_start:
{
uint8_t v___x_107_; 
v___x_107_ = lean_nat_dec_eq(v_m_106_, v_n_105_);
if (v___x_107_ == 0)
{
lean_object* v___x_108_; 
lean_dec(v_n_105_);
lean_dec_ref(v_G_103_);
v___x_108_ = lean_apply_1(v_00_u03c3_104_, v_m_106_);
return v___x_108_;
}
else
{
lean_object* v_body_109_; lean_object* v___x_110_; lean_object* v___x_111_; lean_object* v___x_112_; 
lean_dec(v_m_106_);
v_body_109_ = lean_ctor_get(v_G_103_, 1);
lean_inc_ref(v_body_109_);
lean_inc(v_n_105_);
v___x_110_ = lp_replay_Replay_inputs(v_G_103_, v_00_u03c3_104_, v_n_105_);
v___x_111_ = lean_apply_2(v_body_109_, v_n_105_, v___x_110_);
v___x_112_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_112_, 0, v___x_111_);
return v___x_112_;
}
}
}
LEAN_EXPORT lean_object* lp_replay_Replay_replayF(lean_object* v_G_113_, lean_object* v_00_u03c3_114_, lean_object* v_x_115_, lean_object* v_x_116_){
_start:
{
lean_object* v_zero_117_; uint8_t v_isZero_118_; 
v_zero_117_ = lean_unsigned_to_nat(0u);
v_isZero_118_ = lean_nat_dec_eq(v_x_115_, v_zero_117_);
if (v_isZero_118_ == 1)
{
lean_object* v___x_119_; 
lean_inc(v_x_116_);
v___x_119_ = lean_apply_1(v_00_u03c3_114_, v_x_116_);
if (lean_obj_tag(v___x_119_) == 0)
{
lean_object* v_body_120_; lean_object* v___x_121_; lean_object* v___x_122_; 
v_body_120_ = lean_ctor_get(v_G_113_, 1);
lean_inc_ref(v_body_120_);
lean_dec_ref(v_G_113_);
v___x_121_ = lean_box(0);
v___x_122_ = lean_apply_2(v_body_120_, v_x_116_, v___x_121_);
return v___x_122_;
}
else
{
lean_object* v_val_123_; 
lean_dec(v_x_116_);
lean_dec_ref(v_G_113_);
v_val_123_ = lean_ctor_get(v___x_119_, 0);
lean_inc(v_val_123_);
lean_dec_ref_known(v___x_119_, 1);
return v_val_123_;
}
}
else
{
lean_object* v___x_124_; 
lean_inc_ref(v_00_u03c3_114_);
lean_inc(v_x_116_);
v___x_124_ = lean_apply_1(v_00_u03c3_114_, v_x_116_);
if (lean_obj_tag(v___x_124_) == 0)
{
lean_object* v_preds_125_; lean_object* v_body_126_; lean_object* v_one_127_; lean_object* v_n_128_; lean_object* v___x_129_; lean_object* v___x_130_; lean_object* v___x_131_; lean_object* v___x_132_; 
v_preds_125_ = lean_ctor_get(v_G_113_, 0);
v_body_126_ = lean_ctor_get(v_G_113_, 1);
lean_inc_ref(v_body_126_);
v_one_127_ = lean_unsigned_to_nat(1u);
v_n_128_ = lean_nat_sub(v_x_115_, v_one_127_);
lean_inc_ref(v_preds_125_);
lean_inc(v_x_116_);
v___x_129_ = lean_apply_1(v_preds_125_, v_x_116_);
v___x_130_ = lean_box(0);
v___x_131_ = lp_replay_List_mapTR_loop___at___00Replay_replayF_spec__0(v_G_113_, v_00_u03c3_114_, v_n_128_, v___x_129_, v___x_130_);
lean_dec(v_n_128_);
v___x_132_ = lean_apply_2(v_body_126_, v_x_116_, v___x_131_);
return v___x_132_;
}
else
{
lean_object* v_val_133_; 
lean_dec(v_x_116_);
lean_dec_ref(v_00_u03c3_114_);
lean_dec_ref(v_G_113_);
v_val_133_ = lean_ctor_get(v___x_124_, 0);
lean_inc(v_val_133_);
lean_dec_ref_known(v___x_124_, 1);
return v_val_133_;
}
}
}
}
LEAN_EXPORT lean_object* lp_replay_List_mapTR_loop___at___00Replay_replayF_spec__0(lean_object* v_G_134_, lean_object* v_00_u03c3_135_, lean_object* v_n_136_, lean_object* v_a_137_, lean_object* v_a_138_){
_start:
{
if (lean_obj_tag(v_a_137_) == 0)
{
lean_object* v___x_139_; 
lean_dec_ref(v_00_u03c3_135_);
lean_dec_ref(v_G_134_);
v___x_139_ = l_List_reverse___redArg(v_a_138_);
return v___x_139_;
}
else
{
lean_object* v_head_140_; lean_object* v_tail_141_; lean_object* v___x_143_; uint8_t v_isShared_144_; uint8_t v_isSharedCheck_150_; 
v_head_140_ = lean_ctor_get(v_a_137_, 0);
v_tail_141_ = lean_ctor_get(v_a_137_, 1);
v_isSharedCheck_150_ = !lean_is_exclusive(v_a_137_);
if (v_isSharedCheck_150_ == 0)
{
v___x_143_ = v_a_137_;
v_isShared_144_ = v_isSharedCheck_150_;
goto v_resetjp_142_;
}
else
{
lean_inc(v_tail_141_);
lean_inc(v_head_140_);
lean_dec(v_a_137_);
v___x_143_ = lean_box(0);
v_isShared_144_ = v_isSharedCheck_150_;
goto v_resetjp_142_;
}
v_resetjp_142_:
{
lean_object* v___x_145_; lean_object* v___x_147_; 
lean_inc_ref(v_00_u03c3_135_);
lean_inc_ref(v_G_134_);
v___x_145_ = lp_replay_Replay_replayF(v_G_134_, v_00_u03c3_135_, v_n_136_, v_head_140_);
if (v_isShared_144_ == 0)
{
lean_ctor_set(v___x_143_, 1, v_a_138_);
lean_ctor_set(v___x_143_, 0, v___x_145_);
v___x_147_ = v___x_143_;
goto v_reusejp_146_;
}
else
{
lean_object* v_reuseFailAlloc_149_; 
v_reuseFailAlloc_149_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_149_, 0, v___x_145_);
lean_ctor_set(v_reuseFailAlloc_149_, 1, v_a_138_);
v___x_147_ = v_reuseFailAlloc_149_;
goto v_reusejp_146_;
}
v_reusejp_146_:
{
v_a_137_ = v_tail_141_;
v_a_138_ = v___x_147_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_replay_List_mapTR_loop___at___00Replay_replayF_spec__0___boxed(lean_object* v_G_151_, lean_object* v_00_u03c3_152_, lean_object* v_n_153_, lean_object* v_a_154_, lean_object* v_a_155_){
_start:
{
lean_object* v_res_156_; 
v_res_156_ = lp_replay_List_mapTR_loop___at___00Replay_replayF_spec__0(v_G_151_, v_00_u03c3_152_, v_n_153_, v_a_154_, v_a_155_);
lean_dec(v_n_153_);
return v_res_156_;
}
}
LEAN_EXPORT lean_object* lp_replay_Replay_replayF___boxed(lean_object* v_G_157_, lean_object* v_00_u03c3_158_, lean_object* v_x_159_, lean_object* v_x_160_){
_start:
{
lean_object* v_res_161_; 
v_res_161_ = lp_replay_Replay_replayF(v_G_157_, v_00_u03c3_158_, v_x_159_, v_x_160_);
lean_dec(v_x_159_);
return v_res_161_;
}
}
LEAN_EXPORT lean_object* lp_replay_Replay_replay(lean_object* v_G_162_, lean_object* v_00_u03c3_163_, lean_object* v_n_164_){
_start:
{
lean_object* v___x_165_; 
lean_inc(v_n_164_);
v___x_165_ = lp_replay_Replay_replayF(v_G_162_, v_00_u03c3_163_, v_n_164_, v_n_164_);
lean_dec(v_n_164_);
return v___x_165_;
}
}
LEAN_EXPORT lean_object* lp_replay___private_Replay_Core_0__Replay_replayF_match__1_splitter___redArg(lean_object* v_x_166_, lean_object* v_h__1_167_, lean_object* v_h__2_168_){
_start:
{
if (lean_obj_tag(v_x_166_) == 0)
{
lean_object* v___x_169_; lean_object* v___x_170_; 
lean_dec(v_h__1_167_);
v___x_169_ = lean_box(0);
v___x_170_ = lean_apply_1(v_h__2_168_, v___x_169_);
return v___x_170_;
}
else
{
lean_object* v_val_171_; lean_object* v___x_172_; 
lean_dec(v_h__2_168_);
v_val_171_ = lean_ctor_get(v_x_166_, 0);
lean_inc(v_val_171_);
lean_dec_ref_known(v_x_166_, 1);
v___x_172_ = lean_apply_1(v_h__1_167_, v_val_171_);
return v___x_172_;
}
}
}
LEAN_EXPORT lean_object* lp_replay___private_Replay_Core_0__Replay_replayF_match__1_splitter(lean_object* v_motive_173_, lean_object* v_x_174_, lean_object* v_h__1_175_, lean_object* v_h__2_176_){
_start:
{
if (lean_obj_tag(v_x_174_) == 0)
{
lean_object* v___x_177_; lean_object* v___x_178_; 
lean_dec(v_h__1_175_);
v___x_177_ = lean_box(0);
v___x_178_ = lean_apply_1(v_h__2_176_, v___x_177_);
return v___x_178_;
}
else
{
lean_object* v_val_179_; lean_object* v___x_180_; 
lean_dec(v_h__2_176_);
v_val_179_ = lean_ctor_get(v_x_174_, 0);
lean_inc(v_val_179_);
lean_dec_ref_known(v_x_174_, 1);
v___x_180_ = lean_apply_1(v_h__1_175_, v_val_179_);
return v___x_180_;
}
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_replay_Replay_Core(uint8_t builtin) {
lean_object * res;
if (_G_initialized) return lean_io_result_mk_ok(lean_box(0));
_G_initialized = true;
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
