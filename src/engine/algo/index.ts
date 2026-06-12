export type { Frame, Trace } from './frames';
export { frame } from './frames';
export { binarySearchTrace, linearSearchTrace } from './search';
export { insertionSortTrace, mergeSortTrace } from './sort';
export { memoFibCalls, naiveFibCalls } from './fib';

import type { Trace } from './frames';
import { binarySearchTrace, linearSearchTrace } from './search';
import { insertionSortTrace, mergeSortTrace } from './sort';

export type AlgoName = 'linear' | 'binary' | 'insertion' | 'merge';

export const ALGO_LABELS: Record<AlgoName, string> = {
  linear: 'まっすぐさがす',
  binary: '半分に切ってさがす',
  insertion: '差しこみでならべる',
  merge: '分けて、たばねる',
};

/** 名前でトレースを作る（AlgoViz用の入口） */
export function traceOf(algo: AlgoName, data: number[], target?: number): Trace {
  switch (algo) {
    case 'linear':
      return linearSearchTrace(data, target ?? data[data.length - 1] ?? 0);
    case 'binary':
      return binarySearchTrace(data, target ?? data[data.length - 1] ?? 0);
    case 'insertion':
      return insertionSortTrace(data);
    case 'merge':
      return mergeSortTrace(data);
  }
}
