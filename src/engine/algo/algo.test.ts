import { describe, expect, it } from 'vitest';
import {
  binarySearchTrace,
  insertionSortTrace,
  linearSearchTrace,
  memoFibCalls,
  mergeSortTrace,
  naiveFibCalls,
  traceOf,
} from './index';

const SORTED = [3, 8, 14, 21, 30, 42, 57, 68, 75, 91];

describe('linearSearchTrace', () => {
  it('見つかるまで1つずつくらべる', () => {
    const t = linearSearchTrace(SORTED, 42);
    expect(t.comparisons).toBe(6);
    expect(t.frames[t.frames.length - 1]).toMatchObject({ found: 5, done: true });
  });

  it('先頭ならいきなり見つかる', () => {
    expect(linearSearchTrace(SORTED, 3).comparisons).toBe(1);
  });

  it('ない場合は全部くらべて null', () => {
    const t = linearSearchTrace(SORTED, 99);
    expect(t.comparisons).toBe(10);
    expect(t.frames[t.frames.length - 1]).toMatchObject({ found: null, done: true });
  });

  it('そろっていなくても働く', () => {
    const t = linearSearchTrace([5, 1, 4], 4);
    expect(t.comparisons).toBe(3);
    expect(t.frames[t.frames.length - 1].found).toBe(2);
  });

  it('場面は配列のコピーを持つ', () => {
    const data = [1, 2, 3];
    const t = linearSearchTrace(data, 2);
    t.frames[0].array[0] = 999;
    expect(data[0]).toBe(1);
  });
});

describe('binarySearchTrace', () => {
  it('半分ずつ範囲がせばまる', () => {
    const t = binarySearchTrace(SORTED, 42);
    expect(t.comparisons).toBeLessThanOrEqual(4);
    expect(t.frames[t.frames.length - 1].found).toBe(5);
    // range が場面ごとにせばまる
    const ranges = t.frames.filter((f) => f.range).map((f) => f.range!);
    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i][1] - ranges[i][0]).toBeLessThan(ranges[i - 1][1] - ranges[i - 1][0]);
    }
  });

  it('10個なら最大4回でけりがつく', () => {
    for (const target of SORTED) {
      expect(binarySearchTrace(SORTED, target).comparisons).toBeLessThanOrEqual(4);
    }
  });

  it('ない場合も4回以内で「ない」と分かる', () => {
    const t = binarySearchTrace(SORTED, 50);
    expect(t.comparisons).toBeLessThanOrEqual(4);
    expect(t.frames[t.frames.length - 1].found).toBeNull();
  });

  it('1000個でも10回で足りる（レッスン3の主張の裏取り）', () => {
    const big = Array.from({ length: 1000 }, (_, i) => i * 2);
    expect(binarySearchTrace(big, 1998).comparisons).toBeLessThanOrEqual(10);
    expect(binarySearchTrace(big, 999).comparisons).toBeLessThanOrEqual(10);
  });
});

describe('insertionSortTrace', () => {
  it('ならべ終わると昇順', () => {
    const t = insertionSortTrace([5, 2, 8, 1, 9, 3]);
    expect(t.frames[t.frames.length - 1].array).toEqual([1, 2, 3, 5, 8, 9]);
    expect(t.frames[t.frames.length - 1].done).toBe(true);
  });

  it('そろい済みなら比較は n-1 回（いちばん得意な場合）', () => {
    expect(insertionSortTrace([1, 2, 3, 4, 5, 6]).comparisons).toBe(5);
  });

  it('逆順がいちばん苦手（n(n-1)/2 回）', () => {
    expect(insertionSortTrace([6, 5, 4, 3, 2, 1]).comparisons).toBe(15);
  });

  it('もとの配列を壊さない', () => {
    const data = [3, 1, 2];
    insertionSortTrace(data);
    expect(data).toEqual([3, 1, 2]);
  });
});

describe('mergeSortTrace', () => {
  it('ならべ終わると昇順', () => {
    const t = mergeSortTrace([5, 2, 8, 1, 9, 3]);
    expect(t.frames[t.frames.length - 1].array).toEqual([1, 2, 3, 5, 8, 9]);
  });

  it('逆順でも比較回数が爆発しない（挿入ソートとの対比）', () => {
    const reversed = Array.from({ length: 12 }, (_, i) => 12 - i);
    const ins = insertionSortTrace(reversed);
    const mrg = mergeSortTrace(reversed);
    expect(ins.comparisons).toBe(66);
    expect(mrg.comparisons).toBeLessThan(40);
  });

  it('1個・空でも壊れない', () => {
    expect(mergeSortTrace([7]).frames[0].array).toEqual([7]);
    expect(mergeSortTrace([]).comparisons).toBe(0);
  });
});

describe('traceOf', () => {
  it('名前で呼び分けられる', () => {
    expect(traceOf('linear', [1, 2, 3], 2).comparisons).toBe(2);
    expect(traceOf('binary', [1, 2, 3], 2).comparisons).toBe(1);
    expect(traceOf('insertion', [2, 1]).frames.at(-1)!.array).toEqual([1, 2]);
    expect(traceOf('merge', [2, 1]).frames.at(-1)!.array).toEqual([1, 2]);
  });

  it('target省略時は末尾の値をさがす（最悪の場合が見える既定値）', () => {
    expect(traceOf('linear', SORTED).comparisons).toBe(10);
  });
});

describe('fib呼び出し回数（レッスン7の裏取り）', () => {
  it('メモなしは爆発する', () => {
    expect(naiveFibCalls(10)).toBe(177);
    expect(naiveFibCalls(20)).toBe(21891);
    expect(naiveFibCalls(30)).toBe(2692537);
  });

  it('メモありは直線的', () => {
    expect(memoFibCalls(10)).toBe(19);
    expect(memoFibCalls(20)).toBe(39);
    expect(memoFibCalls(30)).toBe(59);
  });
});
