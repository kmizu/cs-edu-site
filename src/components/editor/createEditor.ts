import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching } from '@codemirror/language';
import { setDiagnostics } from '@codemirror/lint';
import { EditorState, Prec } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder,
} from '@codemirror/view';
import type { Span } from '../../engine/niwa/token';
import { niwaLanguage } from './niwaSupport';
import { gardenHighlight, gardenTheme } from './theme';

export interface EditorHandle {
  view: EditorView;
  getCode(): string;
  setCode(code: string): void;
  /** エラーの波線を出す。nullで消す。 */
  setError(error: { span: Span; message: string } | null): void;
  destroy(): void;
}

export interface CreateEditorOptions {
  parent: HTMLElement;
  doc: string;
  language: 'niwa' | 'js';
  onChange?: (code: string) => void;
  onRun?: () => void;
  placeholder?: string;
}

export async function createEditor(opts: CreateEditorOptions): Promise<EditorHandle> {
  const langExt =
    opts.language === 'niwa'
      ? niwaLanguage
      : (await import('@codemirror/lang-javascript')).javascript();

  const runKeymap = Prec.highest(
    keymap.of([
      {
        key: 'Mod-Enter',
        run: () => {
          opts.onRun?.();
          return true;
        },
      },
    ]),
  );

  const state = EditorState.create({
    doc: opts.doc,
    extensions: [
      runKeymap,
      lineNumbers(),
      history(),
      drawSelection(),
      bracketMatching(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      langExt,
      gardenTheme,
      gardenHighlight,
      EditorView.lineWrapping,
      ...(opts.placeholder ? [placeholder(opts.placeholder)] : []),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) opts.onChange?.(update.state.doc.toString());
      }),
    ],
  });

  const view = new EditorView({ state, parent: opts.parent });

  return {
    view,
    getCode: () => view.state.doc.toString(),
    setCode: (code) => {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
    },
    setError: (error) => {
      if (!error) {
        view.dispatch(setDiagnostics(view.state, []));
        return;
      }
      const docLen = view.state.doc.length;
      const from = Math.min(error.span.start, docLen);
      const to = Math.min(Math.max(error.span.end, from + 1), docLen);
      view.dispatch(
        setDiagnostics(view.state, [
          { from, to: Math.max(from, to), severity: 'error', message: error.message },
        ]),
      );
    },
    destroy: () => view.destroy(),
  };
}
