import { useEffect, useMemo, useState } from 'preact/hooks';
import { ALGO_LABELS, traceOf, type AlgoName, type Trace } from '../../engine/algo';

interface Props {
  /** 並べる・さがす対象の数列 */
  data: number[];
  algo: AlgoName;
  /** 並走させる2つめの手順（くらべ読み用） */
  race?: AlgoName;
  /** 探し物（探索のとき） */
  target?: number;
  /** 数列と探し物を打ちかえられるようにする */
  editable?: boolean;
  /** 数の大きさを棒で見せる（ならべ替えで有効） */
  bars?: boolean;
}

const TICK_MS = 650;

function isSearch(algo: AlgoName): boolean {
  return algo === 'linear' || algo === 'binary';
}

/** 1つの手順ぶんの盤面 */
function Board({
  algo,
  trace,
  step,
  bars,
  max,
}: {
  algo: AlgoName;
  trace: Trace;
  step: number;
  bars: boolean;
  max: number;
}) {
  const f = trace.frames[Math.min(step, trace.frames.length - 1)];
  if (!f) return null;
  const finished = step >= trace.frames.length - 1;
  return (
    <div class={`algoviz-board ${finished ? 'is-finished' : ''}`}>
      <div class="algoviz-board-head">
        <span class="algoviz-algo">{ALGO_LABELS[algo]}</span>
        <span class="algoviz-count">
          くらべた回数 <strong>{f.comparisons}</strong>
        </span>
      </div>
      <div class="algoviz-cells">
        {f.array.map((v, i) => {
          const inRange = !f.range || (i >= f.range[0] && i <= f.range[1]);
          const cls = [
            'algoviz-cell',
            f.compare?.includes(i) ? 'is-compare' : '',
            f.found === i ? 'is-found' : '',
            inRange ? '' : 'is-out',
          ].join(' ');
          return (
            <span key={i} class={cls}>
              {bars && (
                <span
                  class="algoviz-bar"
                  style={{ height: `${Math.max(8, (v / max) * 52)}px` }}
                />
              )}
              <span class="algoviz-num">{v}</span>
            </span>
          );
        })}
      </div>
      <p class="algoviz-note">{f.note}</p>
    </div>
  );
}

/**
 * コース4の実験室。手順を1歩ずつ再生して、
 * 「くらべた回数」がアルゴリズムのかたちで変わるのを見る。
 */
export default function AlgoViz({
  data,
  algo,
  race,
  target,
  editable = false,
  bars,
}: Props) {
  const [numbers, setNumbers] = useState<number[]>(data);
  const [goal, setGoal] = useState<number>(target ?? data[data.length - 1] ?? 0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const showBars = bars ?? !isSearch(algo);
  const traces = useMemo(() => {
    const t = isSearch(algo) ? goal : undefined;
    const first = traceOf(algo, numbers, t);
    const second = race ? traceOf(race, numbers, isSearch(race) ? goal : undefined) : undefined;
    return { first, second };
  }, [numbers, goal, algo, race]);

  const totalSteps = Math.max(
    traces.first.frames.length,
    traces.second?.frames.length ?? 0,
  );
  const atEnd = step >= totalSteps - 1;

  useEffect(() => {
    if (!playing) return;
    if (atEnd) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setStep((s) => s + 1), TICK_MS);
    return () => clearTimeout(id);
  }, [playing, step, atEnd]);

  const reset = () => {
    setStep(0);
    setPlaying(false);
  };

  const max = Math.max(...numbers, 1);

  return (
    <div class="astviewer algoviz">
      {editable && (
        <div class="algoviz-edit">
          <label>
            <span class="astviewer-label">数列（コンマ区切りで打ちかえられます）</span>
            <input
              type="text"
              value={numbers.join(', ')}
              spellcheck={false}
              onChange={(e) => {
                const parsed = (e.target as HTMLInputElement).value
                  .split(/[,、\s]+/)
                  .map((s) => Number.parseInt(s, 10))
                  .filter((n) => Number.isFinite(n))
                  .slice(0, 16);
                if (parsed.length > 0) {
                  setNumbers(parsed);
                  reset();
                }
              }}
            />
          </label>
          {isSearch(algo) && (
            <label class="algoviz-goal">
              <span class="astviewer-label">探し物</span>
              <input
                type="number"
                value={goal}
                onChange={(e) => {
                  const n = Number.parseInt((e.target as HTMLInputElement).value, 10);
                  if (Number.isFinite(n)) {
                    setGoal(n);
                    reset();
                  }
                }}
              />
            </label>
          )}
        </div>
      )}

      <Board algo={algo} trace={traces.first} step={step} bars={showBars} max={max} />
      {race && traces.second && (
        <Board algo={race} trace={traces.second} step={step} bars={showBars} max={max} />
      )}

      <div class="algoviz-controls">
        <button
          type="button"
          class="btn btn-primary"
          disabled={atEnd}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? '一時停止' : '再生する'}
        </button>
        <button
          type="button"
          class="btn btn-ghost"
          disabled={atEnd || playing}
          onClick={() => setStep(step + 1)}
        >
          1歩すすむ
        </button>
        <button type="button" class="btn btn-ghost" onClick={reset}>
          はじめから
        </button>
        <span class="algoviz-progress">
          {Math.min(step + 1, totalSteps)} / {totalSteps} 場面
        </span>
      </div>
    </div>
  );
}
