import type { Expr, Ident, Program, Stmt } from './ast';
import type { NiwaError, Result } from './errors';
import type { Span, Token } from './token';
import { tokenize } from './tokenizer';

export type ParseResult = Result<{ program: Program }>;

class ParseError extends Error {
  constructor(public niwa: NiwaError) {
    super(niwa.message);
  }
}

function fail(message: string, span: Span, hint?: string): never {
  throw new ParseError({ message, span, ...(hint ? { hint } : {}) });
}

class Parser {
  private pos = 0;

  constructor(private tokens: Token[]) {}

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)]!;
  }

  private next(): Token {
    const t = this.peek();
    if (t.kind !== 'eof') this.pos++;
    return t;
  }

  private at(kind: Token['kind'], text?: string): boolean {
    const t = this.peek();
    return t.kind === kind && (text === undefined || t.text === text);
  }

  private eat(kind: Token['kind'], text?: string): Token | null {
    if (this.at(kind, text)) return this.next();
    return null;
  }

  private skipNewlines(): void {
    while (this.at('newline')) this.next();
  }

  /* ---------- プログラム ---------- */

  parseProgram(): Program {
    const start = this.peek().span.start;
    const body = this.parseStmts(() => this.at('eof'));
    const end = this.peek().span.end;
    return { type: 'program', body, span: { start, end } };
  }

  private parseStmts(isEnd: () => boolean): Stmt[] {
    const body: Stmt[] = [];
    this.skipNewlines();
    while (!isEnd()) {
      body.push(this.parseStmt());
      if (!isEnd() && !this.at('newline')) {
        const t = this.peek();
        fail(
          `文の終わりのはずの場所に「${t.text}」が続いています。`,
          t.span,
          '文と文のあいだは、改行か 。 で区切ります。',
        );
      }
      this.skipNewlines();
    }
    return body;
  }

  /* ---------- 文 ---------- */

  private parseStmt(): Stmt {
    // もし 〜 ならば { … }
    if (this.at('keyword', 'もし')) return this.parseIf();

    // <名前> とは { … }
    if (this.at('word') && this.peek(1).kind === 'keyword' && this.peek(1).text === 'とは') {
      return this.parseDef();
    }

    const startTok = this.peek();
    const e1 = this.parseExpr();

    // <expr> を …
    if (this.eat('particle', 'を')) {
      if (this.at('keyword', 'かく')) {
        const end = this.next().span.end;
        return { type: 'draw', shape: e1, span: { start: startTok.span.start, end } };
      }
      if (this.at('keyword', 'いう')) {
        const end = this.next().span.end;
        return { type: 'say', value: e1, span: { start: startTok.span.start, end } };
      }
      const e2 = this.parseExpr();
      if (this.at('keyword', 'とよぶ')) {
        const end = this.next().span.end;
        if (e2.type !== 'ident') {
          fail(
            '名前にできるのは、ことば（文字の並び）だけです。',
            e2.span,
            '例：90 を かくど とよぶ',
          );
        }
        return {
          type: 'name',
          value: e1,
          name: e2.name,
          span: { start: startTok.span.start, end },
        };
      }
      if (this.at('keyword', 'にする')) {
        const end = this.next().span.end;
        if (e1.type !== 'ident') {
          fail('付け替えられるのは、名前だけです。', e1.span, '例：いろ を あか にする');
        }
        return {
          type: 'assign',
          name: e1.name,
          nameSpan: e1.span,
          value: e2,
          span: { start: startTok.span.start, end },
        };
      }
      const t = this.peek();
      fail(
        `「を」のあとの読み方が分かりませんでした。`,
        t.kind === 'eof' ? { start: startTok.span.start, end: e1.span.end } : t.span,
        '「を」のあとに置けるのは：かく ／ いう ／ 〜とよぶ ／ 〜にする です。',
      );
    }

    // <expr> と いう
    if (this.at('particle', 'と') && this.peek(1).text === 'いう') {
      this.next();
      const end = this.next().span.end;
      return { type: 'say', value: e1, span: { start: startTok.span.start, end } };
    }

    // <expr> かい くりかえす { … }
    if (this.eat('keyword', 'かい')) {
      if (!this.eat('keyword', 'くりかえす')) {
        fail('「かい」のあとには「くりかえす」が続きます。', this.peek().span, '例：6 かい くりかえす { … }');
      }
      const body = this.parseBlock();
      return {
        type: 'repeat',
        count: e1,
        body: body.stmts,
        span: { start: startTok.span.start, end: body.end },
      };
    }

    // <expr> すすむ
    if (this.at('keyword', 'すすむ')) {
      const end = this.next().span.end;
      return { type: 'move', distance: e1, span: { start: startTok.span.start, end } };
    }

    // みぎ/ひだり へ <expr> まわる
    if (this.eat('particle', 'へ')) {
      if (e1.type !== 'ident' || (e1.name !== 'みぎ' && e1.name !== 'ひだり')) {
        fail('まわる向きは「みぎ」か「ひだり」です。', e1.span, '例：みぎ へ 90 まわる');
      }
      const angle = this.parseExpr();
      if (!this.at('keyword', 'まわる')) {
        fail('「へ」のあとには角度と「まわる」が続きます。', this.peek().span, '例：みぎ へ 90 まわる');
      }
      const end = this.next().span.end;
      return {
        type: 'turn',
        direction: e1.name === 'みぎ' ? 'right' : 'left',
        angle,
        span: { start: startTok.span.start, end },
      };
    }

    // 定義したことばを呼ぶ：名前だけの文
    if (e1.type === 'ident' && (this.at('newline') || this.at('eof') || this.at('rbrace'))) {
      return { type: 'call', name: e1.name, span: e1.span };
    }

    fail(
      `この文の読み方が分かりませんでした。`,
      { start: startTok.span.start, end: this.peek().span.end },
      '文のかたち：まる を かく ／ 50 すすむ ／ みぎ へ 90 まわる ／ 90 を かくど とよぶ',
    );
  }

  private parseIf(): Stmt {
    const start = this.next().span.start; // もし
    const cond = this.parseExpr();
    if (!this.eat('keyword', 'ならば')) {
      fail('「もし」のあとには、条件と「ならば」が続きます。', this.peek().span, '例：もし x が 3 より おおきい ならば { … }');
    }
    const thenBlock = this.parseBlock();
    let elseBody: Stmt[] | undefined;
    let end = thenBlock.end;
    this.skipNewlines();
    if (this.eat('keyword', 'ちがえば')) {
      const elseBlock = this.parseBlock();
      elseBody = elseBlock.stmts;
      end = elseBlock.end;
    }
    return {
      type: 'if',
      cond,
      then: thenBlock.stmts,
      ...(elseBody ? { else: elseBody } : {}),
      span: { start, end },
    };
  }

  private parseDef(): Stmt {
    const nameTok = this.next(); // word
    this.next(); // とは
    const body = this.parseBlock();
    return {
      type: 'def',
      name: nameTok.text,
      body: body.stmts,
      span: { start: nameTok.span.start, end: body.end },
    };
  }

  private parseBlock(): { stmts: Stmt[]; end: number } {
    this.skipNewlines();
    const open = this.eat('lbrace');
    if (!open) {
      fail('ここに { が来るはずでした。', this.peek().span, 'まとまりは { と } で囲みます。');
    }
    const stmts = this.parseStmts(() => this.at('rbrace') || this.at('eof'));
    const close = this.eat('rbrace');
    if (!close) {
      fail(
        '{ が } で閉じられていません。',
        open.span,
        'まとまりの終わりに } を書き足してください。',
      );
    }
    return { stmts, end: close.span.end };
  }

  /* ---------- 式 ---------- */

  private parseExpr(): Expr {
    const left = this.parseAdd();

    // 「A が B より おおきい/ちいさい」「A が B と おなじ」
    if (this.at('particle', 'が')) {
      this.next();
      const right = this.parseAdd();
      if (this.eat('particle', 'より')) {
        const cmp = this.peek();
        if (cmp.text === 'おおきい' || cmp.text === 'ちいさい') {
          this.next();
          return {
            type: 'compare',
            op: cmp.text === 'おおきい' ? 'gt' : 'lt',
            left,
            right,
            span: { start: left.span.start, end: cmp.span.end },
          };
        }
        fail('「より」のあとには「おおきい」か「ちいさい」が続きます。', cmp.span);
      }
      if (this.eat('particle', 'と')) {
        const cmp = this.peek();
        if (cmp.text === 'おなじ') {
          this.next();
          return {
            type: 'compare',
            op: 'eq',
            left,
            right,
            span: { start: left.span.start, end: cmp.span.end },
          };
        }
        fail('「と」のあとには「おなじ」が続きます。', cmp.span, '例：x が 3 と おなじ');
      }
      fail(
        'くらべ方が分かりませんでした。',
        this.peek().span,
        '例：x が 3 より おおきい ／ x が 3 と おなじ',
      );
    }

    return left;
  }

  private parseAdd(): Expr {
    let left = this.parseMul();
    while (this.at('op', '+') || this.at('op', '-')) {
      const op = this.next();
      const right = this.parseMul();
      left = {
        type: 'binop',
        op: op.text === '+' ? '+' : '-',
        left,
        right,
        span: { start: left.span.start, end: right.span.end },
      };
    }
    return left;
  }

  private parseMul(): Expr {
    let left = this.parsePrimary();
    while (this.at('op', '*') || this.at('op', '×') || this.at('op', '/') || this.at('op', '÷')) {
      const op = this.next();
      const right = this.parsePrimary();
      left = {
        type: 'binop',
        op: op.text === '*' || op.text === '×' ? '*' : '/',
        left,
        right,
        span: { start: left.span.start, end: right.span.end },
      };
    }
    return left;
  }

  private parsePrimary(): Expr {
    const t = this.peek();

    if (t.kind === 'number') {
      this.next();
      return { type: 'num', value: t.value!, span: t.span };
    }
    if (t.kind === 'string') {
      this.next();
      return { type: 'str', value: t.text, span: t.span };
    }
    if (t.kind === 'word') {
      this.next();
      const ident: Ident = { type: 'ident', name: t.text, span: t.span };
      return ident;
    }
    if (t.kind === 'lparen') {
      this.next();
      const inner = this.parseExpr();
      if (!this.eat('rparen')) {
        fail('( が ) で閉じられていません。', t.span);
      }
      return inner;
    }
    if (t.kind === 'op' && t.text === '-') {
      this.next();
      const operand = this.parsePrimary();
      return {
        type: 'binop',
        op: '-',
        left: { type: 'num', value: 0, span: t.span },
        right: operand,
        span: { start: t.span.start, end: operand.span.end },
      };
    }

    fail(
      t.kind === 'eof'
        ? '文の途中で、コードが終わってしまいました。'
        : `ここに「${t.text}」が来る理由が分かりませんでした。`,
      t.span,
      'ここには 数・「文字列」・名前 のどれかが入ります。',
    );
  }
}

export function parse(source: string): ParseResult {
  const tk = tokenize(source);
  if (!tk.ok) return tk;
  try {
    const program = new Parser(tk.tokens).parseProgram();
    return { ok: true, program };
  } catch (e) {
    if (e instanceof ParseError) return { ok: false, error: e.niwa };
    throw e;
  }
}
