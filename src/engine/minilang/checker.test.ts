import { describe, expect, it } from 'vitest';
import { checkMini, runMini, STAGE_FUNC, STAGE_TYPE } from './index';

function ok(source: string) {
  const r = checkMini(source, STAGE_TYPE);
  if (!r.ok) throw new Error(`check failed: ${r.error.message}`);
  return r.bindings;
}

function ng(source: string) {
  const r = checkMini(source, STAGE_TYPE);
  if (r.ok) throw new Error('expected type error');
  return r.error;
}

describe('checkTypes: 通る場合', () => {
  it('数の式', () => {
    expect(ok('1 + 2 * 3')).toEqual([]);
  });

  it('変数は最初の代入で型がつく', () => {
    expect(ok('x = 10\nx + 1')).toEqual([{ name: 'x', type: '数' }]);
  });

  it('比較は真偽になる', () => {
    expect(ok('x = 1 < 2')).toEqual([{ name: 'x', type: '真偽' }]);
  });

  it('注釈つき関数と呼び出し', () => {
    const b = ok('fn double(x: 数) { x * 2 }\ndouble(21)');
    expect(b).toEqual([{ name: 'double', type: '関数(数) → 数' }]);
  });

  it('真偽を返す関数は戻り型が推論される', () => {
    const b = ok('fn isBig(x: 数) { x > 100 }\ny = isBig(5)');
    expect(b).toContainEqual({ name: 'isBig', type: '関数(数) → 真偽' });
    expect(b).toContainEqual({ name: 'y', type: '真偽' });
  });

  it('if/else 両枝が同じ型なら値になる', () => {
    expect(() =>
      ok('fn abs(x: 数) { if x < 0 { 0 - x } else { x } }\nabs(0 - 5)'),
    ).not.toThrow();
  });

  it('再帰（fib）が通る', () => {
    const src = 'fn fib(n: 数) { if n < 2 { n } else { fib(n - 1) + fib(n - 2) } }\nfib(10)';
    expect(() => ok(src)).not.toThrow();
    // 実行とも一致する
    const r = runMini(src, STAGE_TYPE);
    expect(r.ok && r.values).toEqual([55]);
  });

  it('while と再代入', () => {
    expect(() => ok('i = 0\nwhile i < 3 { i = i + 1 }\ni')).not.toThrow();
  });
});

describe('checkTypes: 実行前につかまえる', () => {
  it('数と真偽のたし算', () => {
    const e = ng('1 + (2 == 3)');
    expect(e.message).toContain('「+」の右には数が来るはず');
    expect(e.message).toContain('真偽');
  });

  it('条件が数', () => {
    const e = ng('if 1 { 2 }');
    expect(e.message).toContain('真偽 で答えられる式のはず');
  });

  it('whileの条件が数', () => {
    expect(ng('while 1 { 2 }').message).toContain('くりかえしの条件');
  });

  it('名前の型は変えられない', () => {
    const e = ng('x = 10\nx = 1 < 2');
    expect(e.message).toContain('「x」は 数 として名づけられています');
    expect(e.hint).toContain('別の名前');
  });

  it('ちがう型どうしの ==', () => {
    expect(ng('1 == (2 < 3)').message).toContain('両側の型がちがいます');
  });

  it('真偽の大小くらべ', () => {
    expect(ng('(1 < 2) < (3 < 4)').message).toContain('くらべられるのは数');
  });

  it('引数の型ちがい', () => {
    const e = ng('fn double(x: 数) { x * 2 }\ndouble(1 == 1)');
    expect(e.message).toContain('1番目の引数は 数 のはず');
  });

  it('引数の個数ちがい', () => {
    expect(ng('fn double(x: 数) { x * 2 }\ndouble(1, 2)').message).toContain('1個ですが、2個');
  });

  it('知らない名前（実行前に分かる）', () => {
    expect(ng('x + 1').message).toContain('「x」という名前を、まだ知りません');
  });

  it('関数を数のように使う', () => {
    expect(ng('fn f(x: 数) { x }\nf + 1').message).toContain('数が来るはず');
  });

  it('関数でないものを呼ぶ', () => {
    expect(ng('x = 1\nx(2)').message).toContain('呼び出せません');
  });

  it('注釈がない引数', () => {
    const e = ng('fn double(x) { x * 2 }');
    expect(e.message).toContain('「x」の型が書かれていません');
    expect(e.hint).toContain('x: 数');
  });

  it('知らない型名', () => {
    const e = ng('fn f(x: もじ) { x }');
    expect(e.message).toContain('「もじ」という型を知りません');
    expect(e.hint).toContain('「数」と「真偽」');
  });

  it('値にならない本体', () => {
    expect(ng('fn f(x: 数) { while x < 1 { 2 } }').message).toContain('値になる文ではありません');
  });

  it('elseのないifが本体の最後', () => {
    expect(ng('fn f(x: 数) { if x > 0 { 1 } }').message).toContain('値になる文ではありません');
  });
});

describe('checkTypes: すりぬけるもの（レッスン7の裏取り）', () => {
  it('0での割り算は型では捕まらない', () => {
    expect(() => ok('1 / 0')).not.toThrow();
    const r = runMini('1 / 0', STAGE_TYPE);
    expect(r.ok).toBe(false); // 実行時には落ちる
  });

  it('止まらないループは型では捕まらない', () => {
    expect(() => ok('i = 1\nwhile i > 0 { i = i + 1 }')).not.toThrow();
  });
});

describe('構文とステージの互換', () => {
  it('型ステージ以外では注釈が文法エラー', () => {
    const r = checkMini('fn f(x: 数) { x }', STAGE_FUNC);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain('まだ「型の注釈」は登場していません');
  });

  it('注釈つきコードは実行もできる（評価器は注釈を無視）', () => {
    const r = runMini('fn double(x: 数) { x * 2 }\ndouble(21)', STAGE_TYPE);
    expect(r.ok && r.values).toEqual([42]);
  });

  it('全角コロンも読める', () => {
    expect(() => ok('fn f(x： 数) { x }')).not.toThrow();
  });
});
