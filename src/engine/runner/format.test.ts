import { describe, it, expect } from 'vitest';
import { formatArgs, formatValue } from './format';

describe('formatValue', () => {
  it('プリミティブをそのまま見せる', () => {
    expect(formatValue('hello')).toBe('hello');
    expect(formatValue(42)).toBe('42');
    expect(formatValue(true)).toBe('true');
    expect(formatValue(null)).toBe('null');
    expect(formatValue(undefined)).toBe('undefined');
  });

  it('入れ子の文字列は引用符つき', () => {
    expect(formatValue(['a', 1])).toBe('["a", 1]');
  });

  it('オブジェクトとMapとSetとDate', () => {
    expect(formatValue({ x: 1, y: 'a' })).toBe('{x: 1, y: "a"}');
    expect(formatValue(new Map([['k', 1]]))).toBe('Map {"k" => 1}');
    expect(formatValue(new Set([1, 2]))).toBe('Set {1, 2}');
    expect(formatValue(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01-01T00:00:00.000Z');
  });

  it('循環参照で落ちない', () => {
    const a: Record<string, unknown> = {};
    a['self'] = a;
    expect(formatValue(a)).toContain('循環参照');
  });

  it('深い入れ子は省略する', () => {
    expect(formatValue({ a: { b: { c: { d: { e: 1 } } } } })).toContain('…');
  });

  it('巨大配列は件数つきで省略', () => {
    const big = Array.from({ length: 200 }, (_, i) => i);
    expect(formatValue(big)).toContain('ほか100件');
  });

  it('長すぎる文字列を切る', () => {
    expect(formatValue('x'.repeat(20_000))).toContain('省略');
  });

  it('関数とエラー', () => {
    expect(formatValue(function hello() {})).toContain('hello');
    expect(formatValue(new TypeError('oops'))).toBe('TypeError: oops');
  });
});

describe('formatArgs', () => {
  it('複数引数をスペースでつなぐ', () => {
    expect(formatArgs(['count:', 3])).toBe('count: 3');
  });
});
