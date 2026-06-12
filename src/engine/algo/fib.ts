/** レッスン7（おぼえておくという工夫）用：同じ計算を何度しているかを数える */

/** メモなしの fib(n) が行う関数呼び出しの回数 */
export function naiveFibCalls(n: number): number {
  let calls = 0;
  function fib(k: number): number {
    calls++;
    if (k <= 1) return k;
    return fib(k - 1) + fib(k - 2);
  }
  fib(n);
  return calls;
}

/** メモつきの fib(n) が行う関数呼び出しの回数 */
export function memoFibCalls(n: number): number {
  let calls = 0;
  const memo = new Map<number, number>();
  function fib(k: number): number {
    calls++;
    if (memo.has(k)) return memo.get(k)!;
    const v = k <= 1 ? k : fib(k - 1) + fib(k - 2);
    memo.set(k, v);
    return v;
  }
  fib(n);
  return calls;
}
