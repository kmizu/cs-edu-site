import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

/** 庭のデザイントークンに馴染むエディタテーマ */
export const gardenTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--c-editor-bg)',
    color: 'var(--c-ink)',
    fontSize: '16px', // iOS Safariのフォーカス時ズームを防ぐため16px以上
    borderRadius: 'var(--radius-md)',
  },
  '.cm-content': {
    fontFamily: 'var(--font-code)',
    padding: '12px 0',
    lineHeight: '1.8',
    caretColor: 'var(--c-aka)',
  },
  '.cm-line': { padding: '0 12px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-cursor': { borderLeftColor: 'var(--c-aka)', borderLeftWidth: '2px' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    background: 'color-mix(in srgb, var(--c-moss) 22%, transparent) !important',
  },
  '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--c-moss) 6%, transparent)' },
  '.cm-gutters': {
    backgroundColor: 'var(--c-editor-gutter)',
    color: 'var(--c-ink-3)',
    border: 'none',
    borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
    fontFamily: 'var(--font-code)',
    fontSize: '13px',
  },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--c-moss)' },
  '.cm-lintRange-error': {
    backgroundImage: 'none',
    textDecoration: 'underline wavy var(--c-aka) 1.5px',
    textUnderlineOffset: '4px',
  },
});

export const gardenHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.keyword, color: 'var(--c-moss)', fontWeight: '600' },
    { tag: tags.meta, color: 'var(--c-ink-3)' }, // 助詞は静かに
    { tag: tags.string, color: 'var(--c-aka)' },
    { tag: tags.number, color: 'var(--c-mizu)' },
    { tag: tags.comment, color: 'var(--c-ink-3)', fontStyle: 'italic' },
    { tag: tags.variableName, color: 'var(--c-ink)' },
    { tag: tags.operator, color: 'var(--c-ink-2)' },
    { tag: [tags.bracket, tags.punctuation], color: 'var(--c-ink-2)' },
    // JavaScript用
    { tag: tags.function(tags.variableName), color: 'var(--c-mizu)' },
    { tag: tags.definition(tags.variableName), color: 'var(--c-ink)' },
    { tag: tags.propertyName, color: 'var(--c-mizu)' },
    { tag: tags.bool, color: 'var(--c-moss)' },
  ]),
);
