import type { NiwaError, Result } from '../niwa/errors';
import type { Span } from '../niwa/token';
import type { MiniExpr, MiniProgram, MiniStmt } from './ast';
import type { LanguageFeatures } from './features';
import { DEFAULT_KEYWORDS, type KeywordMap } from './keywords';
import { MiniError, parseMini } from './parser';

/**
 * checker — コース6「型のはなし」の型検査器。
 * プログラムを実行せずに読み、値の種類（数・真偽・関数）の
 * つじつまが合わない場所を、実行**前**に報告する。
 */

export type MiniType =
  | { kind: 'num' }
  | { kind: 'bool' }
  | { kind: 'fn'; params: MiniType[]; ret: MiniType };

export const NUM: MiniType = { kind: 'num' };
export const BOOL: MiniType = { kind: 'bool' };

/** 型の表示名。エラーメッセージと「型の目」パネルで使う */
export function typeName(t: MiniType): string {
  switch (t.kind) {
    case 'num':
      return '数';
    case 'bool':
      return '真偽';
    case 'fn':
      return `関数(${t.params.map(typeName).join(', ')}) → ${typeName(t.ret)}`;
  }
}

function sameType(a: MiniType, b: MiniType): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'fn' && b.kind === 'fn') {
    return (
      a.params.length === b.params.length &&
      a.params.every((p, i) => sameType(p, b.params[i]!)) &&
      sameType(a.ret, b.ret)
    );
  }
  return true;
}

export interface TypeBinding {
  name: string;
  type: string;
}

export type CheckResult = Result<{ bindings: TypeBinding[] }>;

function fail(message: string, span: Span, hint?: string): never {
  throw new MiniError({ message, span, ...(hint ? { hint } : {}) });
}

/** 評価器の Scope と同じ形の、型の名簿 */
class TypeScope {
  private table = new Map<string, MiniType>();

  constructor(private parent?: TypeScope) {}

  lookup(name: string): MiniType | undefined {
    return this.table.get(name) ?? this.parent?.lookup(name);
  }

  set(name: string, type: MiniType): void {
    const owner = this.findOwner(name);
    (owner ?? this).table.set(name, type);
  }

  declare(name: string, type: MiniType): void {
    this.table.set(name, type);
  }

  private findOwner(name: string): TypeScope | undefined {
    if (this.table.has(name)) return this;
    return this.parent?.findOwner(name);
  }

  child(): TypeScope {
    return new TypeScope(this);
  }

  entries(): TypeBinding[] {
    return [...this.table.entries()].map(([name, t]) => ({ name, type: typeName(t) }));
  }
}

function parseTypeName(text: string, span: Span): MiniType {
  if (text === '数') return NUM;
  if (text === '真偽') return BOOL;
  fail(
    `「${text}」という型を知りません。`,
    span,
    'この言語の型は「数」と「真偽」の2つです。',
  );
}

class Checker {
  private global = new TypeScope();

  check(program: MiniProgram): TypeBinding[] {
    for (const stmt of program.body) {
      this.checkStmt(stmt, this.global);
    }
    return this.global.entries();
  }

  /** 文を検査し、値を生む文ならその型を返す（関数本体の「最後の式が値」に対応） */
  private checkStmt(stmt: MiniStmt, env: TypeScope): MiniType | undefined {
    switch (stmt.type) {
      case 'expr':
        return this.checkExpr(stmt.expr, env);

      case 'assign': {
        const t = this.checkExpr(stmt.value, env);
        const existing = env.lookup(stmt.name);
        if (existing && !sameType(existing, t)) {
          fail(
            `「${stmt.name}」は ${typeName(existing)} として名づけられていますが、${typeName(t)} を入れようとしています。`,
            stmt.span,
            'ひとつの名前には、ひとつの型。別の種類の値には、別の名前をつけてください。',
          );
        }
        env.set(stmt.name, t);
        return t;
      }

      case 'if': {
        const c = this.checkExpr(stmt.cond, env);
        if (c.kind !== 'bool') {
          fail(
            `もしもの条件は 真偽 で答えられる式のはずですが、${typeName(c)} が来ています。`,
            stmt.cond.span,
            '例：x > 3 ／ x == 0',
          );
        }
        const thenT = this.checkBlock(stmt.then, env);
        const elseT = stmt.else ? this.checkBlock(stmt.else, env) : undefined;
        if (thenT && elseT && sameType(thenT, elseT)) return thenT;
        return undefined;
      }

      case 'while': {
        const c = this.checkExpr(stmt.cond, env);
        if (c.kind !== 'bool') {
          fail(
            `くりかえしの条件は 真偽 で答えられる式のはずですが、${typeName(c)} が来ています。`,
            stmt.cond.span,
          );
        }
        this.checkBlock(stmt.body, env);
        return undefined;
      }

      case 'fn': {
        const paramTypes = stmt.params.map((p, i) => {
          const anno = stmt.paramTypes?.[i];
          if (!anno) {
            fail(
              `引数「${p}」の型が書かれていません。`,
              stmt.span,
              `例：fn ${stmt.name}(${p}: 数) { … }`,
            );
          }
          return parseTypeName(anno, stmt.span);
        });
        // 再帰呼び出しのために、戻りはひとまず 数 とみなして名簿に載せる
        // （この割り切りはこの検査器の正直な限界。戻りが真偽の再帰関数は検査が合わないことがある）
        env.set(stmt.name, { kind: 'fn', params: paramTypes, ret: NUM });
        const local = env.child();
        stmt.params.forEach((p, i) => local.declare(p, paramTypes[i]!));
        const retT = this.checkBlock(stmt.body, local);
        if (!retT) {
          fail(
            `「${stmt.name}」の本体の最後が、値になる文ではありません。`,
            stmt.span,
            '関数の本体の最後を、値になる式にしてください（else のない if も値になりません）。',
          );
        }
        env.set(stmt.name, { kind: 'fn', params: paramTypes, ret: retT });
        return undefined;
      }
    }
  }

  private checkBlock(body: MiniStmt[], env: TypeScope): MiniType | undefined {
    let last: MiniType | undefined;
    for (const stmt of body) {
      const t = this.checkStmt(stmt, env);
      if (t !== undefined) last = t;
    }
    return last;
  }

  private checkExpr(expr: MiniExpr, env: TypeScope): MiniType {
    switch (expr.type) {
      case 'num':
        return NUM;

      case 'var': {
        const t = env.lookup(expr.name);
        if (t === undefined) {
          fail(
            `「${expr.name}」という名前を、まだ知りません。`,
            expr.span,
            `先に「${expr.name} = 値」と書いてください。`,
          );
        }
        return t;
      }

      case 'bin': {
        const sides: ['左', '右'] = ['左', '右'];
        [expr.left, expr.right].forEach((side, i) => {
          const t = this.checkExpr(side, env);
          if (t.kind !== 'num') {
            fail(
              `「${expr.op}」の${sides[i]}には数が来るはずですが、${typeName(t)} が来ています。`,
              side.span,
              '実行する前から、これは分かります——それが型の目です。',
            );
          }
        });
        return NUM;
      }

      case 'cmp': {
        const l = this.checkExpr(expr.left, env);
        const r = this.checkExpr(expr.right, env);
        if (expr.op === '==' || expr.op === '!=') {
          if (!sameType(l, r)) {
            fail(
              `「${expr.op}」の両側の型がちがいます（左は ${typeName(l)}、右は ${typeName(r)}）。`,
              expr.span,
              '種類のちがうものは、くらべる前から「等しくない」と決まっています。',
            );
          }
          return BOOL;
        }
        for (const [t, side] of [
          [l, expr.left],
          [r, expr.right],
        ] as const) {
          if (t.kind !== 'num') {
            fail(
              `「${expr.op}」でくらべられるのは数ですが、${typeName(t)} が来ています。`,
              side.span,
            );
          }
        }
        return BOOL;
      }

      case 'call': {
        const t = env.lookup(expr.name);
        if (t === undefined) {
          fail(`「${expr.name}」という関数を、まだ知りません。`, expr.span);
        }
        if (t.kind !== 'fn') {
          fail(
            `「${expr.name}」は ${typeName(t)} なので、呼び出せません。`,
            expr.span,
          );
        }
        if (expr.args.length !== t.params.length) {
          fail(
            `「${expr.name}」の引数は${t.params.length}個ですが、${expr.args.length}個が渡されています。`,
            expr.span,
          );
        }
        expr.args.forEach((arg, i) => {
          const at = this.checkExpr(arg, env);
          if (!sameType(at, t.params[i]!)) {
            fail(
              `「${expr.name}」の${i + 1}番目の引数は ${typeName(t.params[i]!)} のはずですが、${typeName(at)} が渡されています。`,
              arg.span,
            );
          }
        });
        return t.ret;
      }
    }
  }
}

/** 構文木を実行せずに読み、型のつじつまを検査する */
export function checkTypes(program: MiniProgram): CheckResult {
  try {
    return { ok: true, bindings: new Checker().check(program) };
  } catch (e) {
    if (e instanceof MiniError) return { ok: false, error: e.niwa };
    throw e;
  }
}

/** ソースから一発で（パース→型検査） */
export function checkMini(
  source: string,
  features: LanguageFeatures,
  keywords: KeywordMap = DEFAULT_KEYWORDS,
): CheckResult {
  const p = parseMini(source, features, keywords);
  if (!p.ok) return p;
  return checkTypes(p.program);
}

export type { NiwaError };
