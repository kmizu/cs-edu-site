/**
 * JSサンドボックス（ホスト側）。
 * 原則：「タイムアウト = Workerをterminateして作り直す」。
 * Worker内部から無限ループは止められないため、外からkillするのが唯一確実な方法。
 * タイムアウトの計測は、Workerの起動完了（readyメッセージ）後に始める——
 * 起動の遅さを利用者コードのせいにしないため。
 */
import type { ConsoleLevel, JsRunResult, WorkerToHost } from './protocol';

const DEFAULT_TIMEOUT_MS = 2000;
const SPAWN_TIMEOUT_MS = 15_000;

export interface RunOptions {
  timeoutMs?: number;
  onConsole?: (level: ConsoleLevel, text: string) => void;
}

interface WorkerHandle {
  worker: Worker;
  ready: Promise<void>;
}

export class JsSandbox {
  private handle: WorkerHandle | null = null;
  private runId = 0;

  private spawn(): WorkerHandle {
    if (this.handle) return this.handle;

    const worker = new Worker(new URL('./sandbox.worker.ts', import.meta.url), {
      type: 'module',
    });
    const ready = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('サンドボックスの起動に時間がかかりすぎました。')),
        SPAWN_TIMEOUT_MS,
      );
      const onMessage = (e: MessageEvent<WorkerToHost>) => {
        if (e.data.type === 'ready') {
          clearTimeout(timer);
          worker.removeEventListener('message', onMessage);
          resolve();
        }
      };
      worker.addEventListener('message', onMessage);
    });

    this.handle = { worker, ready };
    return this.handle;
  }

  /** Workerを温めておく（初回実行のもたつき防止） */
  warmup(): void {
    this.spawn();
  }

  async run(code: string, options: RunOptions = {}): Promise<JsRunResult> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const id = ++this.runId;
    const handle = this.spawn();

    try {
      await handle.ready;
    } catch {
      this.dispose();
      return { ok: false, timedOut: true, durationMs: 0 };
    }

    const { worker } = handle;
    const started = Date.now();

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        // 暴走中のWorkerは殺して、次回のために作り直せるようにする
        worker.removeEventListener('message', onMessage);
        worker.terminate();
        this.handle = null;
        resolve({ ok: false, timedOut: true, durationMs: Date.now() - started });
      }, timeoutMs);

      const onMessage = (e: MessageEvent<WorkerToHost>) => {
        const msg = e.data;
        if (msg.type === 'ready' || msg.id !== id) return;

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
    this.handle?.worker.terminate();
    this.handle = null;
  }
}
