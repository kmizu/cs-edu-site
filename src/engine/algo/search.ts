import { frame, type Trace } from './frames';

/** まっすぐさがす：先頭から1つずつ */
export function linearSearchTrace(array: number[], target: number): Trace {
  const frames = [];
  let comparisons = 0;
  for (let i = 0; i < array.length; i++) {
    comparisons++;
    if (array[i] === target) {
      frames.push(
        frame(array, {
          compare: [i],
          comparisons,
          note: `${i + 1}番目は ${array[i]}。${target} と同じ——見つかりました`,
          found: i,
          done: true,
        }),
      );
      return { frames, comparisons };
    }
    frames.push(
      frame(array, {
        compare: [i],
        comparisons,
        note: `${i + 1}番目は ${array[i]}。${target} ではない`,
      }),
    );
  }
  frames.push(
    frame(array, {
      comparisons,
      note: `最後までさがしましたが、${target} はありませんでした`,
      found: null,
      done: true,
    }),
  );
  return { frames, comparisons };
}

/** 半分に切ってさがす：そろっている前提 */
export function binarySearchTrace(array: number[], target: number): Trace {
  const frames = [];
  let comparisons = 0;
  let lo = 0;
  let hi = array.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    comparisons++;
    if (array[mid] === target) {
      frames.push(
        frame(array, {
          compare: [mid],
          range: [lo, hi],
          comparisons,
          note: `まんなかの ${array[mid]} は ${target} と同じ——見つかりました`,
          found: mid,
          done: true,
        }),
      );
      return { frames, comparisons };
    }
    const goRight = array[mid] < target;
    frames.push(
      frame(array, {
        compare: [mid],
        range: [lo, hi],
        comparisons,
        note: `まんなかの ${array[mid]} は ${target} より${goRight ? '小さい——右半分にしぼる' : '大きい——左半分にしぼる'}`,
      }),
    );
    if (goRight) lo = mid + 1;
    else hi = mid - 1;
  }
  frames.push(
    frame(array, {
      comparisons,
      note: `範囲がなくなりました。${target} はありません`,
      found: null,
      done: true,
    }),
  );
  return { frames, comparisons };
}
