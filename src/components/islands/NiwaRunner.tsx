import { useEffect, useRef, useState } from 'preact/hooks';
import type { NiwaError } from '../../engine/niwa';
import { run } from '../../engine/niwa';
import type { EditorHandle } from '../editor/createEditor';
import { createCanvasRenderer, type CanvasRenderer } from './renderCanvas';
import { countRun, loadDraft, saveDraft } from './storage';

interface Props {
  initialCode: string;
  /** キャンバスの高さ(px)。0で非表示（テキストだけのレッスン用） */
  canvasHeight?: number;
  /** 下書きをlocalStorageに残すためのキー（レッスン内の各ブロックで一意に） */
  storageKey?: string;
  /** 最初から一度実行した状態で見せる */
  autorun?: boolean;
}

export default function NiwaRunner({
  initialCode,
  canvasHeight = 300,
  storageKey,
  autorun = false,
}: Props) {
  const editorParent = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editor = useRef<EditorHandle | null>(null);
  const renderer = useRef<CanvasRenderer | null>(null);

  const [ready, setReady] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const [error, setError] = useState<NiwaError | null>(null);
  const [hasDrawing, setHasDrawing] = useState(false);

  const execute = () => {
    if (!editor.current) return;
    const code = editor.current.getCode();
    countRun();
    const result = run(code);
    if (!result.ok) {
      setError(result.error);
      setOutput([]);
      editor.current.setError({ span: result.error.span, message: result.error.message });
      return;
    }
    setError(null);
    editor.current.setError(null);
    setOutput(result.output);
    setHasDrawing(result.drawing.length > 0);
    if (canvasRef.current) {
      if (!renderer.current) renderer.current = createCanvasRenderer(canvasRef.current);
      renderer.current.render(result.drawing);
    }
  };

  const executeRef = useRef(execute);
  executeRef.current = execute;

  const reset = () => {
    editor.current?.setCode(initialCode);
    editor.current?.setError(null);
    setError(null);
    setOutput([]);
    setHasDrawing(false);
    renderer.current?.render([]);
    if (storageKey) saveDraft(storageKey, null);
  };

  useEffect(() => {
    let disposed = false;
    const draft = storageKey ? loadDraft(storageKey) : null;

    void import('../editor/createEditor').then(async ({ createEditor }) => {
      if (disposed || !editorParent.current) return;
      editor.current = await createEditor({
        parent: editorParent.current,
        doc: draft ?? initialCode,
        language: 'niwa',
        onRun: () => executeRef.current(),
        onChange: (code) => {
          if (storageKey) saveDraft(storageKey, code === initialCode ? null : code);
        },
      });
      setReady(true);
      if (autorun) executeRef.current();
    });

    // テーマ切替で墨色が変わるので描き直す
    const observer = new MutationObserver(() => renderer.current?.redraw());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      disposed = true;
      observer.disconnect();
      renderer.current?.stop();
      editor.current?.destroy();
    };
  }, []);

  return (
    <div class="runner" data-lang="niwa">
      <div class="runner-bar">
        <span class="runner-lang">にわ語</span>
        <div class="runner-actions">
          <button type="button" class="runner-reset" onClick={reset}>
            もとに戻す
          </button>
          <button type="button" class="runner-run" onClick={execute} disabled={!ready}>
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
            </svg>
            実行する
          </button>
        </div>
      </div>
      <div class="runner-editor" ref={editorParent}>
        {!ready && <pre class="runner-skeleton">{initialCode}</pre>}
      </div>
      {canvasHeight > 0 && (
        <div class="runner-canvas-wrap" style={{ height: `${canvasHeight}px` }}>
          <canvas ref={canvasRef} class="runner-canvas" aria-label="にわ語の描いた絵" />
          {!hasDrawing && !error && <p class="runner-canvas-empty">ここに絵があらわれます</p>}
        </div>
      )}
      {output.length > 0 && (
        <div class="runner-output" role="log">
          {output.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
      {error && (
        <div class="runner-error" role="alert">
          <p class="runner-error-message">{error.message}</p>
          {error.hint && <p class="runner-error-hint">{error.hint}</p>}
        </div>
      )}
      <p class="runner-kbd-hint">
        <kbd>Ctrl</kbd>+<kbd>Enter</kbd> でも実行できます
      </p>
    </div>
  );
}
