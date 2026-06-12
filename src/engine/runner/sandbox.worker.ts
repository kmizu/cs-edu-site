/**
 * JSサンドボックス（Worker側）。
 * Worker内なのでDOM・localStorage・親ページには触れない。
 * 無限ループはホスト側の terminate でしか止められない（それがこの設計の前提）。
 */
import { formatArgs } from './format';
import type { HostToWorker, WorkerToHost } from './protocol';

const MAX_MESSAGES = 1000;

function post(msg: WorkerToHost): void {
  self.postMessage(msg);
}

self.onmessage = (e: MessageEvent<HostToWorker>) => {
  const { type, id, code } = e.data;
  if (type !== 'run') return;

  let sent = 0;
  let dropped = false;

  const capture =
    (level: 'log' | 'warn' | 'error' | 'info') =>
    (...args: unknown[]) => {
      if (sent >= MAX_MESSAGES) {
        if (!dropped) {
          dropped = true;
          post({ type: 'console', id, level: 'warn', text: '（出力が多すぎるため、ここから先は省略します）' });
        }
        return;
      }
      sent++;
      post({ type: 'console', id, level, text: formatArgs(args) });
    };

  // consoleを上書きして出力を捕まえる
  const original = self.console;
  self.console = {
    ...original,
    log: capture('log'),
    info: capture('info'),
    warn: capture('warn'),
    error: capture('error'),
  };

  const started = Date.now();
  try {
    // 'use strict' で未宣言代入なども正直にエラーにする
    new Function(`'use strict';\n${code}`)();
    post({ type: 'done', id, durationMs: Date.now() - started });
  } catch (err) {
    const name = err instanceof Error ? err.name : 'Error';
    const message = err instanceof Error ? err.message : String(err);
    post({ type: 'error', id, name, message, ...extractLine(err) });
  } finally {
    self.console = original;
  }
};

/** スタックトレースから利用者コードの行番号を推定する（new Function は1行のラッパを足している） */
function extractLine(err: unknown): { line?: number } {
  if (!(err instanceof Error) || !err.stack) return {};
  const m = err.stack.match(/<anonymous>:(\d+):\d+/);
  if (!m) return {};
  const line = Number(m[1]) - 1; // 'use strict' の行ぶんを引く
  return line > 0 ? { line } : {};
}
