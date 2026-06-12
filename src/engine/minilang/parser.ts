import type { NiwaError, Result } from '../niwa/errors';
import type { Span } from '../niwa/token';
import type { CmpOp, MiniExpr, MiniProgram, MiniStmt } from './ast';
import type { LanguageFeatures } from './features';
import { DEFAULT_KEYWORDS, type KeywordMap } from './keywords';
import { tokenizeMini, type MiniToken } from './tokenizer';

export type MiniParseResult = Result<{ program: MiniProgram }>;

export class MiniError extends Error {
  constructor(public niwa: NiwaError) {
    super(niwa.message);
  }
}

function fail(message: string, span: Span, hint?: string): never {
  throw new MiniError({ message, span, ...(hint ? { hint } : {}) });
}

class MiniParser {
  private pos = 0;

  constructor(
    private tokens: MiniToken[],
    private features: LanguageFeatures,
    private keywords: KeywordMap,
  ) {}

  private peek(offset = 0): MiniToken {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)]!;
  }

  private next(): MiniToken {
    const t = this.peek();
    if (t.kind !== 'eof') this.pos++;
    return t;
  }

  private skipNewlines(): void {
    while (this.peek().kind === 'newline') this.next();
  }

  /* ---------- プログラム・文 ---------- */

  parseProgram(): MiniProgram {
    const start = this.peek().span.start;
    const body = this.parseStmts(() => this.peek().kind === 'eof');
    return { type: 'program', body, span: { start, end: this.peek().span.end } };
  }

  private parseStmts(isEnd: () => boolean): MiniStmt[] {
    const body: MiniStmt[] = [];
    this.skipNewlines();
    while (!isEnd()) {
      body.push(this.parseStmt());
      const t = this.peek();
      if (!isEnd() && t.kind !== 'newline' && t.kind !== 'rbrace') {
        fail(`文の終わりのはずの場所に「${t.text}」が続いています。`, t.span);
      }
      this.skipNewlines();
    }
    return body;
  }

  private parseStmt(): MiniStmt {
    const t = this.peek();

    if (t.kind === 'keyword' && t.kw === 'fn') {
      if (!this.features.functions) {
        fail(
          `この章では、まだ「${t.text}」（関数）は登場していません。`,
          t.span,
          '関数は、もうすこし先のレッスンであなたが実装します。',
        );
      }
      return this.parseFnDef();
    }
    if (t.kind === 'keyword' && t.kw === 'if') {
      if (!this.features.conditionals) {
        fail(`この章では、まだ「${t.text}」（もしも）は登場していません。`, t.span);
      }
      return this.parseIf();
    }
    if (t.kind === 'keyword' && t.kw === 'while') {
      if (!this.features.loops) {
        fail(
          `この章では、まだ「${t.text}」（くりかえし）は登場していません。`,
          t.span,
          'くりかえしは、次の章で言語に教えます。',
        );
      }
      return this.parseWhile();
    }
    if (t.kind === 'keyword') {
      fail(`「${t.text}」をここに置く読み方が分かりませんでした。`, t.span);
    }

    // 代入: ident = expr
    if (t.kind === 'ident' && this.peek(1).kind === 'eq') {
      const nameTok = this.next();
      if (!this.features.variables) {
        fail(
          'この章では、まだ「変数」は登場していません。',
          nameTok.span,
          '変数は、もうすこし先のレッスンであなたが実装します。',
        );
      }
      this.next(); // =
      const value = this.parseExpr();
      return {
        type: 'assign',
        name: nameTok.text,
        value,
        span: { start: nameTok.span.start, end: value.span.end },
      };
    }

    const expr = this.parseExpr();
    return { type: 'expr', expr, span: expr.span };
  }

  private parseFnDef(): MiniStmt {
    const fnTok = this.next(); // fn
    const nameTok = this.peek();
    if (nameTok.kind !== 'ident') {
      fail(`「${fnTok.text}」のあとには、関数の名前が来ます。`, nameTok.span, `例：${fnTok.text} double(x) { x * 2 }`);
    }
    this.next();
    if (this.peek().kind !== 'lparen') {
      fail('関数の名前のあとには ( が来ます。', this.peek().span);
    }
    this.next();
    const params: string[] = [];
    if (this.peek().kind !== 'rparen') {
      for (;;) {
        const p = this.peek();
        if (p.kind !== 'ident') fail('引数の名前が読めませんでした。', p.span);
        params.push(p.text);
        this.next();
        if (this.peek().kind === 'comma') {
          this.next();
          continue;
        }
        break;
      }
    }
    if (this.peek().kind !== 'rparen') {
      fail('引数のならびが ) で閉じられていません。', this.peek().span);
    }
    this.next();
    const body = this.parseBlock();
    return {
      type: 'fn',
      name: nameTok.text,
      params,
      body: body.stmts,
      span: { start: fnTok.span.start, end: body.end },
    };
  }

  private parseIf(): MiniStmt {
    const ifTok = this.next();
    const cond = this.parseExpr();
    const thenBlock = this.parseBlock();
    let elseBody: MiniStmt[] | undefined;
    let end = thenBlock.end;

    // 改行をはさんだ else も許す
    const save = this.pos;
    this.skipNewlines();
    const t = this.peek();
    if (t.kind === 'keyword' && t.kw === 'else') {
      this.next();
      const elseBlock = this.parseBlock();
      elseBody = elseBlock.stmts;
      end = elseBlock.end;
    } else {
      this.pos = save;
    }

    return {
      type: 'if',
      cond,
      then: thenBlock.stmts,
      ...(elseBody ? { else: elseBody } : {}),
      span: { start: ifTok.span.start, end },
    };
  }

  private parseWhile(): MiniStmt {
    const whileTok = this.next();
    const cond = this.parseExpr();
    const body = this.parseBlock();
    return {
      type: 'while',
      cond,
      body: body.stmts,
      span: { start: whileTok.span.start, end: body.end },
    };
  }

  private parseBlock(): { stmts: MiniStmt[]; end: number } {
    this.skipNewlines();
    const open = this.peek();
    if (open.kind !== 'lbrace') {
      fail('ここに { が来るはずでした。', open.span, 'まとまりは { と } で囲みます。');
    }
    this.next();
    const stmts = this.parseStmts(() => this.peek().kind === 'rbrace' || this.peek().kind === 'eof');
    const close = this.peek();
    if (close.kind !== 'rbrace') {
      fail('{ が } で閉じられていません。', open.span, 'まとまりの終わりに } を書き足してください。');
    }
    this.next();
    return { stmts, end: close.span.end };
  }

  /* ---------- 式 ---------- */

  private parseExpr(): MiniExpr {
    const left = this.parseAdd();
    const t = this.peek();
    if (t.kind === 'cmp') {
      if (!this.features.conditionals) {
        fail(`この章では、まだ「${t.text}」（くらべる）は登場していません。`, t.span);
      }
      this.next();
      const right = this.parseAdd();
      if (this.peek().kind === 'cmp') {
        fail(
          'くらべた結果を、さらにくらべることはできません。',
          this.peek().span,
          '例：a < b < c とは書けません。',
        );
      }
      return {
        type: 'cmp',
        op: t.text as CmpOp,
        left,
        right,
        span: { start: left.span.start, end: right.span.end },
      };
    }
    return left;
  }

  // minBp方式（Prattパース）。たし算・ひき算は強さ1、かけ算・わり算は強さ2
  private parseAdd(minBp = 0): MiniExpr {
    let left = this.parsePrimary();

    for (;;) {
      const t = this.peek();
      if (t.kind !== 'op') break;
      const op = t.text as '+' | '-' | '*' | '/';
      const bp = op === '+' || op === '-' ? 1 : 2;
      if (bp < minBp) break;

      if ((op === '+' || op === '-') && !this.features.add) {
        fail(
          `この章では、まだ「${op}」は登場していません。`,
          t.span,
          'いまの言語が話せるのは、数だけです。',
        );
      }
      if ((op === '*' || op === '/') && !this.features.mul) {
        fail(
          `この章では、まだ「${op === '*' ? '×' : '÷'}」は登場していません。`,
          t.span,
          'かけ算とわり算は、次の章で言語に教えます。',
        );
      }

      this.next();
      const right = this.parseAdd(bp + 1);
      left = { type: 'bin', op, left, right, span: { start: left.span.start, end: right.span.end } };
    }

    return left;
  }

  private parsePrimary(): MiniExpr {
    const t = this.peek();

    if (t.kind === 'number') {
      this.next();
      return { type: 'num', value: t.value!, span: t.span };
    }

    if (t.kind === 'ident') {
      // 関数呼び出し: ident ( args )
      if (this.peek(1).kind === 'lparen') {
        if (!this.features.functions) {
          fail(`この章では、まだ「関数の呼び出し」は登場していません。`, t.span);
        }
        return this.parseCall();
      }
      if (!this.features.variables) {
        fail(
          `「${t.text}」——この言語は、まだ名前を知りません。`,
          t.span,
          '変数は、もうすこし先のレッスンであなたが実装します。',
        );
      }
      this.next();
      return { type: 'var', name: t.text, span: t.span };
    }

    if (t.kind === 'lparen') {
      if (!this.features.paren) {
        fail('この章では、まだ「(」は登場していません。', t.span);
      }
      this.next();
      const inner = this.parseExpr();
      if (this.peek().kind !== 'rparen') {
        fail('( が ) で閉じられていません。', t.span);
      }
      this.next();
      return inner;
    }

    if (t.kind === 'op' && t.text === '-') {
      this.next();
      const operand = this.parsePrimary();
      return {
        type: 'bin',
        op: '-',
        left: { type: 'num', value: 0, span: t.span },
        right: operand,
        span: { start: t.span.start, end: operand.span.end },
      };
    }

    fail(
      t.kind === 'eof'
        ? '式の途中で、コードが終わってしまいました。'
        : `ここに「${t.text}」が来る理由が分かりませんでした。`,
      t.span,
      'ここには数が入ります。',
    );
  }

  private parseCall(): MiniExpr {
    const nameTok = this.next(); // ident
    this.next(); // (
    const args: MiniExpr[] = [];
    if (this.peek().kind !== 'rparen') {
      for (;;) {
        args.push(this.parseExpr());
        if (this.peek().kind === 'comma') {
          this.next();
          continue;
        }
        break;
      }
    }
    if (this.peek().kind !== 'rparen') {
      fail('呼び出しの ( が ) で閉じられていません。', nameTok.span);
    }
    const close = this.next();
    return {
      type: 'call',
      name: nameTok.text,
      args,
      span: { start: nameTok.span.start, end: close.span.end },
    };
  }
}

export function parseMini(
  source: string,
  features: LanguageFeatures,
  keywords: KeywordMap = DEFAULT_KEYWORDS,
): MiniParseResult {
  const tk = tokenizeMini(source, keywords);
  if (!tk.ok) return tk;
  try {
    return { ok: true, program: new MiniParser(tk.tokens, features, keywords).parseProgram() };
  } catch (e) {
    if (e instanceof MiniError) return { ok: false, error: e.niwa };
    throw e;
  }
}
