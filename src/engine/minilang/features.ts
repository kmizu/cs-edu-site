/**
 * minilang（コース2の教材言語）の機能フラグ。
 * レッスンが進むごとに、言語が「育つ」——同じ実装を、段階的に解放する。
 */
export interface LanguageFeatures {
  /** たし算・ひき算（レッスン3で解放） */
  add: boolean;
  /** かけ算・わり算と優先順位（レッスン4で解放） */
  mul: boolean;
  /** かっこ（レッスン4で解放） */
  paren: boolean;
  /** 変数（レッスン6で解放） */
  variables: boolean;
  /** 比較と if/else（レッスン8で解放） */
  conditionals: boolean;
  /** while（レッスン9で解放） */
  loops: boolean;
  /** 関数（レッスン10で解放） */
  functions: boolean;
  /** 型注釈 fn f(x: 数)（コース6で解放） */
  types: boolean;
}

const OFF = {
  add: false,
  mul: false,
  paren: false,
  variables: false,
  conditionals: false,
  loops: false,
  functions: false,
  types: false,
} satisfies LanguageFeatures;

/** レッスン2：数しか話せない言語 */
export const STAGE_NUMBER: LanguageFeatures = { ...OFF };

/** レッスン3：たし算の木 */
export const STAGE_ADD: LanguageFeatures = { ...OFF, add: true };

/** レッスン4：優先順位とかっこ（電卓の完成） */
export const STAGE_CALC: LanguageFeatures = { ...OFF, add: true, mul: true, paren: true };

/** レッスン6：名前をおぼえる言語 */
export const STAGE_VAR: LanguageFeatures = { ...STAGE_CALC, variables: true };

/** レッスン8：「ほんとう」を決める */
export const STAGE_BOOL: LanguageFeatures = { ...STAGE_VAR, conditionals: true };

/** レッスン9：くりかえしと、止まらない機械 */
export const STAGE_LOOP: LanguageFeatures = { ...STAGE_BOOL, loops: true };

/** レッスン10以降：ことばを定義できる言語（全機能） */
export const STAGE_FUNC: LanguageFeatures = { ...STAGE_LOOP, functions: true };

/** コース6：型注釈を書ける言語 */
export const STAGE_TYPE: LanguageFeatures = { ...STAGE_FUNC, types: true };

export const STAGES: Record<string, LanguageFeatures> = {
  number: STAGE_NUMBER,
  add: STAGE_ADD,
  calc: STAGE_CALC,
  var: STAGE_VAR,
  bool: STAGE_BOOL,
  loop: STAGE_LOOP,
  func: STAGE_FUNC,
  type: STAGE_TYPE,
};
