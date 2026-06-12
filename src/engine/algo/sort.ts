import { frame, type Frame, type Trace } from './frames';

/** 差しこみでならべる：手札にカードを1枚ずつ差していく手つき */
export function insertionSortTrace(input: number[]): Trace {
  const a = [...input];
  const frames: Frame[] = [];
  let comparisons = 0;
  frames.push(frame(a, { comparisons, note: 'ならべる前。左はしの1枚は、それだけで「そろっている」' }));
  for (let i = 1; i < a.length; i++) {
    const card = a[i];
    let j = i - 1;
    frames.push(
      frame(a, { compare: [i], range: [0, i - 1], comparisons, note: `${card} を手に取る。左のそろった列のどこに入るか` }),
    );
    while (j >= 0) {
      comparisons++;
      if (a[j] <= card) {
        frames.push(
          frame(a, { compare: [j, j + 1], comparisons, note: `${a[j]} は ${card} 以下。ここで止まる` }),
        );
        break;
      }
      a[j + 1] = a[j];
      frames.push(
        frame(a, { compare: [j, j + 1], comparisons, note: `${a[j]} は ${card} より大きい。1つ右へずらす` }),
      );
      j--;
    }
    a[j + 1] = card;
    frames.push(frame(a, { compare: [j + 1], comparisons, note: `${card} を差しこむ` }));
  }
  frames.push(frame(a, { comparisons, note: 'そろいました', done: true }));
  return { frames, comparisons };
}

/** 分けて、たばねる */
export function mergeSortTrace(input: number[]): Trace {
  const a = [...input];
  const frames: Frame[] = [];
  let comparisons = 0;

  frames.push(frame(a, { comparisons, note: 'ならべる前。まず半分に分けることをくりかえす' }));

  function sort(lo: number, hi: number): void {
    if (hi - lo < 1) return;
    const mid = Math.floor((lo + hi) / 2);
    sort(lo, mid);
    sort(mid + 1, hi);
    merge(lo, mid, hi);
  }

  function merge(lo: number, mid: number, hi: number): void {
    const left = a.slice(lo, mid + 1);
    const right = a.slice(mid + 1, hi + 1);
    frames.push(
      frame(a, {
        range: [lo, hi],
        comparisons,
        note: `そろった2つの列（${left.join(',')}）と（${right.join(',')}）を、たばねる`,
      }),
    );
    let i = 0;
    let j = 0;
    let k = lo;
    while (i < left.length && j < right.length) {
      comparisons++;
      const takeLeft = left[i] <= right[j];
      const taken = takeLeft ? left[i] : right[j];
      frames.push(
        frame(a, {
          compare: [k],
          range: [lo, hi],
          comparisons,
          note: `先頭どうし ${left[i]} と ${right[j]} をくらべて、小さい ${taken} を取る`,
        }),
      );
      a[k++] = taken;
      if (takeLeft) i++;
      else j++;
    }
    while (i < left.length) a[k++] = left[i++];
    while (j < right.length) a[k++] = right[j++];
    frames.push(
      frame(a, { range: [lo, hi], comparisons, note: `たばね終わり：${a.slice(lo, hi + 1).join(',')}` }),
    );
  }

  sort(0, a.length - 1);
  frames.push(frame(a, { comparisons, note: 'そろいました', done: true }));
  return { frames, comparisons };
}
