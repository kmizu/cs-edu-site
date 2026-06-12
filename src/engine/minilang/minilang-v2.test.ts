import { describe, it, expect } from 'vitest';
import { STAGE_BOOL, STAGE_CALC, STAGE_FUNC, STAGE_LOOP, STAGE_VAR } from './features';
import { runMini, tokenizeMini } from './index';
import { decodeLang, encodeLang } from './share';

describe('比較と真偽（STAGE_BOOL）', () => {
  it('比較は true/false になる', () => {
    const r = runMini('3 > 2\n1 == 2\n2 <= 2\n1 != 2', STAGE_BOOL);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values).toEqual([true, false, true, true]);
  });

  it('STAGE_VARでは比較はまだ', () => {
    const r = runMini('1 < 2', STAGE_VAR);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toContain('まだ');
  });

  it('if/else が分岐する', () => {
    const src = 'x = 10\nif x > 5 {\n  y = 1\n} else {\n  y = 2\n}\ny';
    const r = runMini(src, STAGE_BOOL);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values.at(-1)).toBe(1);
  });

  it('条件が真偽でなければエラー', () => {
    const r = runMini('if 1 { 2 }', STAGE_BOOL);
    expect(r.ok).toBe(false);
  });
});

describe('くりかえし（STAGE_LOOP）', () => {
  it('while が回る', () => {
    const src = 'x = 0\nwhile x < 5 {\n  x = x + 1\n}\nx';
    const r = runMini(src, STAGE_LOOP);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values.at(-1)).toBe(5);
  });

  it('止まらないループは fuel 切れで止まる', () => {
    const r = runMini('x = 0\nwhile 1 < 2 {\n  x = x + 1\n}', STAGE_LOOP);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toMatch(/とま|終わ/);
  });

  it('STAGE_BOOLでは while はまだ', () => {
    expect(runMini('while 1 < 2 { 1 }', STAGE_BOOL).ok).toBe(false);
  });
});

describe('関数（STAGE_FUNC）', () => {
  it('定義と呼び出し（本体の最後の式が値）', () => {
    const src = 'fn double(x) {\n  x * 2\n}\ndouble(21)';
    const r = runMini(src, STAGE_FUNC);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values).toEqual([42]);
  });

  it('引数が複数・関数から関数を呼ぶ', () => {
    const src = 'fn add(a, b) {\n  a + b\n}\nfn triple(x) {\n  add(x, add(x, x))\n}\ntriple(5)';
    const r = runMini(src, STAGE_FUNC);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values).toEqual([15]);
  });

  it('再帰（階乗）が動く', () => {
    const src = 'fn fact(n) {\n  if n < 2 {\n    1\n  } else {\n    n * fact(n - 1)\n  }\n}\nfact(5)';
    const r = runMini(src, STAGE_FUNC);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values).toEqual([120]);
  });

  it('引数の数ちがいはやさしいエラー', () => {
    const r = runMini('fn f(a, b) {\n  a\n}\nf(1)', STAGE_FUNC);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toContain('2');
  });

  it('関数の中の名前は外に漏れない（スコープ）', () => {
    const r = runMini('fn f(a) {\n  a\n}\nf(1)\na', STAGE_FUNC);
    expect(r.ok).toBe(false);
  });

  it('終わらない再帰は深さ制限で止まる', () => {
    const r = runMini('fn f(n) {\n  f(n)\n}\nf(1)', STAGE_FUNC);
    expect(r.ok).toBe(false);
  });
});

describe('キーワードの差し替え（L11: 文法は、きみが決める）', () => {
  const JA = { if: 'もし', else: 'ちがえば', while: 'くりかえす', fn: 'かんすう' };

  it('日本語キーワードの言語が動く', () => {
    const src = 'x = 7\nもし x > 5 {\n  y = 100\n} ちがえば {\n  y = 200\n}\ny';
    const r = runMini(src, STAGE_FUNC, JA);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values.at(-1)).toBe(100);
  });

  it('差し替え後は英語の if はただの名前になる', () => {
    const r = runMini('if = 3\nif + 1', STAGE_FUNC, JA);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values).toEqual([3, 4]);
  });

  it('日本語の関数定義', () => {
    const src = 'かんすう にばい(x) {\n  x * 2\n}\nにばい(50)';
    const r = runMini(src, STAGE_FUNC, JA);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values).toEqual([100]);
  });
});

describe('share — 言語のURL符号化', () => {
  it('encode→decodeで往復できる（日本語も）', () => {
    const lang = {
      name: 'ここね語',
      keywords: { if: 'もし', else: 'ちがえば', while: 'まわる', fn: 'ことば' },
      code: 'x = 1\nもし x > 0 {\n  x\n}',
    };
    const encoded = encodeLang(lang);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/); // URLセーフ
    expect(decodeLang(encoded)).toEqual(lang);
  });

  it('壊れた文字列は null', () => {
    expect(decodeLang('!!!not-base64!!!')).toBeNull();
    expect(decodeLang('aGVsbG8')).toBeNull(); // JSONでない
  });
});

describe('トークナイザv2', () => {
  it('== と = を区別する', () => {
    const r = tokenizeMini('x == 1\nx = 1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const kinds = r.tokens.map((t) => t.kind);
    expect(kinds).toContain('cmp');
    expect(kinds).toContain('eq');
  });

  it('波かっことカンマ', () => {
    const r = tokenizeMini('fn f(a, b) { a }');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const kinds = r.tokens.map((t) => t.kind);
    expect(kinds).toContain('lbrace');
    expect(kinds).toContain('rbrace');
    expect(kinds).toContain('comma');
    expect(kinds).toContain('keyword');
  });
});
