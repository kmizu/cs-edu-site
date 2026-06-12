import type { Result } from '../niwa/errors';
import type { Span } from '../niwa/token';
import type { MiniExpr, MiniProgram, MiniStmt } from './ast';
import type { LanguageFeatures } from './features';
import { DEFAULT_KEYWORDS, type KeywordMap } from './keywords';
import { MiniError, parseMini } from './parser';

/** 学習者の言語が扱う値。関数も値だが、出力には数と真偽だけが現れる */
export type MiniValue =
  | number
  | boolean
  | { type: 'fn'; name: string; params: string[]; body: MiniStmt[]; env: Scope };

export type MiniRunResult = Result<{ values: (number | boolean)[] }>;

const MAX_FUEL = 100_000;
const MAX_DEPTH = 200;

function fail(message: string, span: Span, hint?: string): never {
  throw new MiniError({ message, span, ...(hint ? { hint } : {}) });
}

class Scope {
  private table = new Map<string, MiniValue>();

  constructor(private parent?: Scope) {}

  lookup(name: string): MiniValue | undefined {
    return this.table.get(name) ?? this.parent?.lookup(name);
  }

  /** 既にある名前ならそこを更新、なければこのスコープに作る */
  set(name: string, value: MiniValue): void {
    const owner = this.findOwner(name);
    (owner ?? this).table.set(name, value);
  }

  /** チェーンをさかのぼらず、必ずこのスコープに作る（引数バインド用） */
  declare(name: string, value: MiniValue): void {
    this.table.set(name, value);
  }

  private findOwner(name: string): Scope | undefined {
    if (this.table.has(name)) return this;
    return this.parent?.findOwner(name);
  }

  child(): Scope {
    return new Scope(this);
  }
}

class MiniInterpreter {
  private fuel = MAX_FUEL;
  private depth = 0;
  private global = new Scope();
  private values: (number | boolean)[] = [];

  run(program: MiniProgram): (number | boolean)[] {
    for (const stmt of program.body) {
      const v = this.execStmt(stmt, this.global);
      // トップレベルでは、式と代入の値だけを「言語の返事」として見せる
      if ((stmt.type === 'expr' || stmt.type === 'assign') && v !== undefined) {
        if (typeof v === 'number' || typeof v === 'boolean') this.values.push(v);
      }
    }
    return this.values;
  }

  /** 文を実行し、値を生む文ならその値を返す（関数本体の「最後の式が値」に使う） */
  private execStmt(stmt: MiniStmt, env: Scope): MiniValue | undefined {
    this.burn(stmt.span);

    switch (stmt.type) {
      case 'expr':
        return this.evalExpr(stmt.expr, env);

      case 'assign': {
        const v = this.evalExpr(stmt.value, env);
        env.set(stmt.name, v);
        return v;
      }

      case 'if': {
        const c = this.evalExpr(stmt.cond, env);
        if (typeof c !== 'boolean') {
          fail(
            '条件は、true か false で答えられる式にしてください。',
            stmt.cond.span,
            '例：x > 3 ／ x == 0',
          );
        }
        if (c) return this.execBlock(stmt.then, env);
        if (stmt.else) return this.execBlock(stmt.else, env);
        return undefined;
      }

      case 'while': {
        for (;;) {
          this.burn(stmt.cond.span);
          const c = this.evalExpr(stmt.cond, env);
          if (typeof c !== 'boolean') {
            fail('条件は、true か false で答えられる式にしてください。', stmt.cond.span);
          }
          if (!c) break;
          this.execBlock(stmt.body, env);
        }
        return undefined;
      }

      case 'fn': {
        env.set(stmt.name, {
          type: 'fn',
          name: stmt.name,
          params: stmt.params,
          body: stmt.body,
          env,
        });
        return undefined;
      }
    }
  }

  private execBlock(body: MiniStmt[], env: Scope): MiniValue | undefined {
    let last: MiniValue | undefined;
    for (const stmt of body) {
      const v = this.execStmt(stmt, env);
      if (v !== undefined) last = v;
    }
    return last;
  }

  private evalExpr(expr: MiniExpr, env: Scope): MiniValue {
    this.burn(expr.span);

    switch (expr.type) {
      case 'num':
        return expr.value;

      case 'var': {
        const v = env.lookup(expr.name);
        if (v === undefined) {
          fail(
            `「${expr.name}」という名前を、まだ知りません。`,
            expr.span,
            `先に「${expr.name} = 値」と書いてください。`,
          );
        }
        return v;
      }

      case 'bin': {
        const l = this.expectNumber(this.evalExpr(expr.left, env), expr.left.span);
        const r = this.expectNumber(this.evalExpr(expr.right, env), expr.right.span);
        switch (expr.op) {
          case '+':
            return l + r;
          case '-':
            return l - r;
          case '*':
            return l * r;
          case '/':
            if (r === 0) fail('0では割れませんでした。', expr.right.span);
            return l / r;
        }
        break;
      }

      case 'cmp': {
        const l = this.evalExpr(expr.left, env);
        const r = this.evalExpr(expr.right, env);
        if (expr.op === '==' || expr.op === '!=') {
          const eq =
            typeof l === typeof r && typeof l !== 'object' ? l === r : false;
          return expr.op === '==' ? eq : !eq;
        }
        const ln = this.expectNumber(l, expr.left.span);
        const rn = this.expectNumber(r, expr.right.span);
        switch (expr.op) {
          case '<':
            return ln < rn;
          case '>':
            return ln > rn;
          case '<=':
            return ln <= rn;
          case '>=':
            return ln >= rn;
        }
        break;
      }

      case 'call': {
        const fnVal = env.lookup(expr.name);
        if (fnVal === undefined) {
          fail(`「${expr.name}」という関数を、まだ知りません。`, expr.span);
        }
        if (typeof fnVal !== 'object') {
          fail(`「${expr.name}」は関数ではないので、呼び出せませんでした。`, expr.span);
        }
        if (expr.args.length !== fnVal.params.length) {
          fail(
            `「${expr.name}」の引数は${fnVal.params.length}個ですが、${expr.args.length}個が渡されました。`,
            expr.span,
          );
        }
        this.depth++;
        if (this.depth > MAX_DEPTH) {
          fail(
            '関数が関数を呼びすぎて、終わらなくなりました。',
            expr.span,
            `「${expr.name}」の再帰に、止まる条件はありますか？`,
          );
        }
        const local = fnVal.env.child();
        fnVal.params.forEach((p, idx) => {
          // 引数は新しいスコープに直接つくる（外の同名を上書きしない）
          local.declare(p, this.evalExpr(expr.args[idx]!, env));
        });
        const result = this.execBlock(fnVal.body, local);
        this.depth--;
        if (result === undefined) {
          fail(
            `「${expr.name}」は値を返しませんでした。`,
            expr.span,
            '関数の本体の最後を、値になる式にしてください。',
          );
        }
        return result;
      }
    }

    fail('この式を評価できませんでした。', expr.span);
  }

  private expectNumber(v: MiniValue, span: Span): number {
    if (typeof v !== 'number') {
      fail(
        `ここには数が要りますが、${typeof v === 'boolean' ? 'true/false' : '関数'}が来ました。`,
        span,
      );
    }
    return v;
  }

  private burn(span: Span): void {
    this.fuel--;
    if (this.fuel <= 0) {
      fail(
        'プログラムがいつまでも とまりませんでした。',
        span,
        'くりかえしの「終わる条件」は、いつか本当に成り立ちますか？',
      );
    }
  }
}

export function runMini(
  source: string,
  features: LanguageFeatures,
  keywords: KeywordMap = DEFAULT_KEYWORDS,
): MiniRunResult {
  const p = parseMini(source, features, keywords);
  if (!p.ok) return p;
  try {
    return { ok: true, values: new MiniInterpreter().run(p.program) };
  } catch (e) {
    if (e instanceof MiniError) return { ok: false, error: e.niwa };
    throw e;
  }
}
