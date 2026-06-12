import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  BLANK,
  PROGRAMS,
  runMachine,
  type Machine,
  type ProgramKey,
  type Rule,
} from '../../engine/turing';

interface Props {
  /** プリセット機械: flip | increment | add | forever */
  program: ProgramKey;
  /** 初期テープ（省略時はプリセットの見本） */
  input?: string;
  /** 遷移表を書きかえられるようにする */
  editable?: boolean;
  /** 打ち切り歩数（止まらない機械の安全網） */
  fuel?: number;
}

const TICK_MS = 550;
const WINDOW = 8;

const MOVE_LABELS: Record<Rule['move'], string> = { L: '←左へ', R: '→右へ', N: '・そのまま' };

const FIELD_LABELS = { state: '状態', read: '読む記号', write: '書く記号' } as const;

/**
 * コース5の実験室。紙テープ・ヘッド・遷移表——
 * 計算する機械の、いちばん素朴なかたちを1歩ずつ動かす。
 */
export default function TuringLab({ program, input, editable = false, fuel = 300 }: Props) {
  const preset = PROGRAMS[program];
  const [tape, setTape] = useState(input ?? preset.sampleInput);
  const [rules, setRules] = useState<Rule[]>(preset.machine.rules);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const machine: Machine = useMemo(
    () => ({ ...preset.machine, rules }),
    [preset.machine, rules],
  );
  const result = useMemo(() => runMachine(machine, tape, fuel), [machine, tape, fuel]);

  const frame = result.frames[Math.min(step, result.frames.length - 1)];
  const atEnd = step >= result.frames.length - 1;

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

  const readNow = frame.tape[frame.head] ?? BLANK;
  const cells = [];
  for (let i = frame.head - WINDOW; i <= frame.head + WINDOW; i++) {
    cells.push({ pos: i, ch: frame.tape[i] ?? BLANK, isHead: i === frame.head });
  }

  const verdict = atEnd
    ? result.halted
      ? `止まりました（${result.steps}歩）。テープ：${result.finalTape === '' ? '（なにもなし）' : result.finalTape}`
      : result.stuck
        ? 'この状態でこの記号を読んだときの規則が、表にありません。機械は手詰まりです。'
        : `${result.steps}歩で打ち切りました。この機械は、止まらないかもしれません。`
    : '';

  return (
    <div class="astviewer turinglab">
      <div class="turinglab-inputs">
        <label>
          <span class="astviewer-label">テープのはじめの中身</span>
          <input
            type="text"
            value={tape}
            spellcheck={false}
            onChange={(e) => {
              setTape((e.target as HTMLInputElement).value);
              reset();
            }}
          />
        </label>
        <div class="turinglab-state">
          <span class="astviewer-label">いまの状態</span>
          <span class={`turinglab-statename ${frame.halted ? 'is-halted' : ''}`}>{frame.state}</span>
        </div>
      </div>

      <div class="turinglab-tape" role="img" aria-label={`テープ。ヘッドは${frame.head}番のマスにいます`}>
        {cells.map((c) => (
          <span key={c.pos} class={`turinglab-cell ${c.isHead ? 'is-head' : ''} ${c.ch === BLANK ? 'is-blank' : ''}`}>
            {c.ch}
          </span>
        ))}
      </div>

      <div class="turinglab-controls">
        <button type="button" class="btn btn-primary" disabled={atEnd} onClick={() => setPlaying(!playing)}>
          {playing ? '一時停止' : '再生する'}
        </button>
        <button type="button" class="btn btn-ghost" disabled={atEnd || playing} onClick={() => setStep(step + 1)}>
          1歩すすむ
        </button>
        <button type="button" class="btn btn-ghost" onClick={reset}>
          はじめから
        </button>
        <span class="algoviz-progress">{frame.steps} 歩目</span>
      </div>

      {verdict && <p class={`turinglab-verdict ${result.halted ? 'is-halted' : 'is-warn'}`}>{verdict}</p>}

      <div>
        <span class="astviewer-label">遷移表（この機械のすべて）</span>
        <table class="turinglab-rules">
          <thead>
            <tr>
              <th>状態</th>
              <th>読む</th>
              <th>書く</th>
              <th>動く</th>
              <th>次の状態</th>
              {editable && (
                <th>
                  <span class="sr-only">この行を消す</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rules.map((r, i) => {
              const active = !frame.halted && r.state === frame.state && r.read === readNow;
              return (
                <tr key={i} class={active ? 'is-active' : ''}>
                  {editable ? (
                    <>
                      {(['state', 'read', 'write'] as const).map((field) => (
                        <td key={field}>
                          <input
                            type="text"
                            value={r[field]}
                            aria-label={`${i + 1}行目の${FIELD_LABELS[field]}`}
                            onChange={(e) => {
                              const v = (e.target as HTMLInputElement).value || BLANK;
                              setRules(rules.map((x, j) => (j === i ? { ...x, [field]: v } : x)));
                              reset();
                            }}
                          />
                        </td>
                      ))}
                      <td>
                        <select
                          value={r.move}
                          aria-label={`${i + 1}行目の動き`}
                          onChange={(e) => {
                            const v = (e.target as HTMLSelectElement).value as Rule['move'];
                            setRules(rules.map((x, j) => (j === i ? { ...x, move: v } : x)));
                            reset();
                          }}
                        >
                          {(['L', 'R', 'N'] as const).map((m) => (
                            <option key={m} value={m}>
                              {MOVE_LABELS[m]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={r.next}
                          aria-label={`${i + 1}行目の次の状態`}
                          onChange={(e) => {
                            const v = (e.target as HTMLInputElement).value || r.next;
                            setRules(rules.map((x, j) => (j === i ? { ...x, next: v } : x)));
                            reset();
                          }}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          class="turinglab-rowbtn"
                          aria-label="この規則を消す"
                          onClick={() => {
                            setRules(rules.filter((_, j) => j !== i));
                            reset();
                          }}
                        >
                          ×
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{r.state}</td>
                      <td class="turinglab-sym">{r.read}</td>
                      <td class="turinglab-sym">{r.write}</td>
                      <td>{MOVE_LABELS[r.move]}</td>
                      <td>{r.next}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {editable && (
          <button
            type="button"
            class="btn btn-ghost turinglab-addrule"
            onClick={() => {
              setRules([
                ...rules,
                { state: frame.state, read: BLANK, write: BLANK, move: 'N', next: machine.halt },
              ]);
              reset();
            }}
          >
            規則を1行たす
          </button>
        )}
      </div>
    </div>
  );
}
