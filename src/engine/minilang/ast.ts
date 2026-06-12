import type { Span } from '../niwa/token';

export type CmpOp = '==' | '!=' | '<' | '>' | '<=' | '>=';

export type MiniExpr =
  | { type: 'num'; value: number; span: Span }
  | { type: 'var'; name: string; span: Span }
  | { type: 'bin'; op: '+' | '-' | '*' | '/'; left: MiniExpr; right: MiniExpr; span: Span }
  | { type: 'cmp'; op: CmpOp; left: MiniExpr; right: MiniExpr; span: Span }
  | { type: 'call'; name: string; args: MiniExpr[]; span: Span };

export type MiniStmt =
  | { type: 'expr'; expr: MiniExpr; span: Span }
  | { type: 'assign'; name: string; value: MiniExpr; span: Span }
  | { type: 'if'; cond: MiniExpr; then: MiniStmt[]; else?: MiniStmt[]; span: Span }
  | { type: 'while'; cond: MiniExpr; body: MiniStmt[]; span: Span }
  | { type: 'fn'; name: string; params: string[]; body: MiniStmt[]; span: Span };

export interface MiniProgram {
  type: 'program';
  body: MiniStmt[];
  span: Span;
}
