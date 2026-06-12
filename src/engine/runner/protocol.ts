/**
 * ホスト（ページ）⇔ Worker（サンドボックス）のメッセージ契約。
 * この型定義がサンドボックス全体の仕様書になる。
 */

export type ConsoleLevel = 'log' | 'warn' | 'error' | 'info';

export type HostToWorker = { type: 'run'; id: number; code: string };

export type WorkerToHost =
  | { type: 'console'; id: number; level: ConsoleLevel; text: string }
  | { type: 'done'; id: number; durationMs: number }
  | {
      type: 'error';
      id: number;
      name: string;
      message: string;
      /** 利用者コード内の行番号（分かったときだけ） */
      line?: number;
    };

/** 1回の実行の最終結果 */
export interface JsRunResult {
  ok: boolean;
  timedOut: boolean;
  error?: { name: string; message: string; line?: number };
  durationMs: number;
}
