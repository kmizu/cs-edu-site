import { err, type Result } from '../niwa/errors';
import type { Span } from '../niwa/token';
import { DEFAULT_KEYWORDS, reverseKeywords, type KeywordKind, type KeywordMap } from './keywords';

export type MiniTokenKind =
  | 'number'
  | 'op' // + - * /
  | 'cmp' // == != < > <= >=
  | 'lparen'
  | 'rparen'
  | 'lbrace'
  | 'rbrace'
  | 'comma'
  | 'colon' // : 型注釈（STAGE_TYPEで使用）
  | 'ident'
  | 'keyword' // if / else / while / fn（表記はKeywordMapで差し替え可能）
  | 'eq' // =
  | 'newline'
  | 'eof';

export interface MiniToken {
  kind: MiniTokenKind;
  text: string;
  value?: number;
  /** keywordのとき：意味（canonical）。表記が日本語でもここは if/else/while/fn */
  kw?: KeywordKind;
  span: Span;
}

export type MiniTokenizeResult = Result<{ tokens: MiniToken[] }>;

export function tokenizeMini(
  source: string,
  keywords: KeywordMap = DEFAULT_KEYWORDS,
): MiniTokenizeResult {
  const rev = reverseKeywords(keywords);
  const tokens: MiniToken[] = [];
  let i = 0;

  const push = (kind: MiniTokenKind, text: string, span: Span, extra?: Partial<MiniToken>) => {
    tokens.push({ kind, text, span, ...extra });
  };

  while (i < source.length) {
    const ch = source[i]!;

    if (ch === ' ' || ch === '\t' || ch === '　' || ch === '\r') {
      i++;
      continue;
    }
    if (ch === '\n') {
      const start = i++;
      if (tokens.at(-1)?.kind !== 'newline') push('newline', '\n', { start, end: i });
      continue;
    }
    if (ch === '#' || ch === '※') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      const start = i;
      let raw = '';
      while (i < source.length && /[0-9.]/.test(source[i]!)) raw += source[i++];
      const value = Number(raw);
      if (Number.isNaN(value)) return err(`「${raw}」を数として読めませんでした。`, { start, end: i });
      push('number', raw, { start, end: i }, { value });
      continue;
    }

    // 2文字の比較演算子を先に見る
    const two = source.slice(i, i + 2);
    if (two === '==' || two === '!=' || two === '<=' || two === '>=') {
      const start = i;
      i += 2;
      push('cmp', two, { start, end: i });
      continue;
    }
    if (ch === '<' || ch === '>') {
      const start = i++;
      push('cmp', ch, { start, end: i });
      continue;
    }
    if (ch === '=') {
      const start = i++;
      push('eq', '=', { start, end: i });
      continue;
    }

    if ('+-*/×÷'.includes(ch)) {
      const start = i++;
      const text = ch === '×' ? '*' : ch === '÷' ? '/' : ch;
      push('op', text, { start, end: i });
      continue;
    }
    if (ch === '(' || ch === '（') {
      const start = i++;
      push('lparen', '(', { start, end: i });
      continue;
    }
    if (ch === ')' || ch === '）') {
      const start = i++;
      push('rparen', ')', { start, end: i });
      continue;
    }
    if (ch === '{' || ch === '｛') {
      const start = i++;
      push('lbrace', '{', { start, end: i });
      continue;
    }
    if (ch === '}' || ch === '｝') {
      const start = i++;
      push('rbrace', '}', { start, end: i });
      continue;
    }
    if (ch === ',' || ch === '、') {
      const start = i++;
      push('comma', ',', { start, end: i });
      continue;
    }
    if (ch === ':' || ch === '：') {
      const start = i++;
      push('colon', ':', { start, end: i });
      continue;
    }

    if (/[\p{L}_]/u.test(ch)) {
      const start = i;
      let text = '';
      while (i < source.length && /[\p{L}\p{N}_]/u.test(source[i]!)) text += source[i++];
      const kw = rev.get(text);
      if (kw) push('keyword', text, { start, end: i }, { kw });
      else push('ident', text, { start, end: i });
      continue;
    }

    return err(`「${ch}」という記号は、この言語にはありません。`, { start: i, end: i + 1 });
  }

  tokens.push({ kind: 'eof', text: '', span: { start: i, end: i } });
  return { ok: true, tokens };
}
