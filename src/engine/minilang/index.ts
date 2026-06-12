/**
 * minilang — コース2「じぶんの言語をつくる」の教材言語。
 * 数式の電卓から始まり、機能フラグで段階的に育ち、
 * 最後はキーワードまで学習者が設計する。
 */
export type { CmpOp, MiniExpr, MiniProgram, MiniStmt } from './ast';
export type { MiniRunResult, MiniValue } from './evaluator';
export { runMini } from './evaluator';
export type { CheckResult, MiniType, TypeBinding } from './checker';
export { checkMini, checkTypes, typeName } from './checker';
export type { LanguageFeatures } from './features';
export {
  STAGE_ADD,
  STAGE_BOOL,
  STAGE_CALC,
  STAGE_FUNC,
  STAGE_LOOP,
  STAGE_NUMBER,
  STAGE_TYPE,
  STAGE_VAR,
  STAGES,
} from './features';
export { DEFAULT_KEYWORDS, reverseKeywords } from './keywords';
export type { KeywordKind, KeywordMap } from './keywords';
export type { MiniParseResult } from './parser';
export { parseMini } from './parser';
export { decodeLang, encodeLang } from './share';
export type { SharedLang } from './share';
export { tokenizeMini } from './tokenizer';
export type { MiniToken, MiniTokenKind, MiniTokenizeResult } from './tokenizer';
