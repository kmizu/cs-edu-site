/**
 * minilangのキーワード表。
 * レッスン11「文法は、きみが決める」で、学習者はこの表を差し替えて
 * 自分の言語の見た目を設計する。canonical（意味）とsurface（表記）の分離が肝。
 */
export interface KeywordMap {
  if: string;
  else: string;
  while: string;
  fn: string;
}

export const DEFAULT_KEYWORDS: KeywordMap = {
  if: 'if',
  else: 'else',
  while: 'while',
  fn: 'fn',
};

export type KeywordKind = keyof KeywordMap;

/** surface（表記）→ canonical（意味）の逆引き表を作る */
export function reverseKeywords(map: KeywordMap): Map<string, KeywordKind> {
  const rev = new Map<string, KeywordKind>();
  for (const key of Object.keys(map) as KeywordKind[]) {
    rev.set(map[key], key);
  }
  return rev;
}
