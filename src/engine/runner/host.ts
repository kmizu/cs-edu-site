/**
 * JSサンドボックス（ホスト側）。
 * 原則：「タイムアウト = Workerをterminateして作り直す」。
 * Worker内部から無限ループは止められないため、外からkillするのが唯一確実な方法。
 */
import type { ConsoleLevel, JsRunResult, WorkerToHost } from './protocol';

const DEFAULT_TIMEOUT_MS = 2000;

export interface RunOptions {
  timeoutMs?: number;
  onConsole?: (level: ConsoleLevel, text: string) => void;
}

export class JsSandbox {
  private worker: Worker | null = null;
  private runId = 0;

  private spawn(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./sandbox.worker.ts', import.meta.url), {
        type: 'module',
      });
    }
    return this.worker;
  }

  /** Workerを温めておく（初回実行のもたつき防止） */
  warmup(): void {
    this.spawn();
  }

  run(code: string, options: RunOptions = {}): Promise<JsRunResult> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const id = ++this.runId;
    const worker = this.spawn();
    const started = Date.now();

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        // 暴走中のWorkerは殺して、次回のために新しく作り直す
        worker.removeEventListener('message', onMessage);
        worker.terminate();
        this.worker = null;
        resolve({ ok: false, timedOut: true, durationMs: Date.now() - started });
      }, timeoutMs);

      const onMessage = (e: MessageEvent<WorkerToHost>) => {
        const msg = e.data;
        if (msg.id !== id) return;

        if (msg.type === 'console') {
          options.onConsole?.(msg.level, msg.text);
          return;
        }

        clearTimeout(timer);
        worker.removeEventListener('message', onMessage);

        if (msg.type === 'done') {
          resolve({ ok: true, timedOut: false, durationMs: msg.durationMs });
        } else {
          resolve({
            ok: false,
            timedOut: false,
            durationMs: Date.now() - started,
            error: { name: msg.name, message: msg.message, ...(msg.line ? { line: msg.line } : {}) },
          });
        }
      };

      worker.addEventListener('message', onMessage);
      worker.postMessage({ type: 'run', id, code });
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
