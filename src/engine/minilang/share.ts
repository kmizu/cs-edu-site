/**
 * 言語のURL共有（レッスン12「言語に名前をつけて、世に出す」）。
 * 言語名・キーワード表・サンプルコードをURLハッシュに収まる文字列へ符号化する。
 * サーバ不要——あなたの言語は、リンクそのものに棲む。
 */
import { DEFAULT_KEYWORDS, type KeywordMap } from './keywords';

export interface SharedLang {
  name: string;
  keywords: KeywordMap;
  code: string;
}

/** UTF-8 → base64url */
export function encodeLang(lang: SharedLang): string {
  const json = JSON.stringify(lang);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeLang(encoded: string): SharedLang | null {
  try {
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<SharedLang>;

    if (typeof parsed.name !== 'string' || typeof parsed.code !== 'string') return null;
    const kw = parsed.keywords;
    if (
      !kw ||
      typeof kw !== 'object' ||
      (Object.keys(DEFAULT_KEYWORDS) as (keyof KeywordMap)[]).some(
        (k) => typeof kw[k] !== 'string' || kw[k].length === 0,
      )
    ) {
      return null;
    }
    return { name: parsed.name, keywords: kw as KeywordMap, code: parsed.code };
  } catch {
    return null;
  }
}
