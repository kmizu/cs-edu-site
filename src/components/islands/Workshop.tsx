import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  decodeLang,
  DEFAULT_KEYWORDS,
  encodeLang,
  parseMini,
  runMini,
  STAGE_FUNC,
  type KeywordMap,
} from '../../engine/minilang';
import { miniProgramToTree } from './miniToTree';
import TreeView from './TreeView';

const SAMPLE = `fn fact(n) {
  if n < 2 {
    1
  } else {
    n * fact(n - 1)
  }
}
fact(5)`;

const KEYWORD_LABELS: Record<keyof KeywordMap, string> = {
  if: 'もしも',
  else: 'ちがえば',
  while: 'くりかえし',
  fn: '関数定義',
};

/**
 * ことばの工房 — 自分の言語を組み立てて、URLにして世に出す場所。
 * 言語名・キーワード表・コードがすべてリンクに符号化される。サーバは要らない。
 */
export default function Workshop() {
  const [name, setName] = useState('わたしの言語');
  const [keywords, setKeywords] = useState<KeywordMap>({ ...DEFAULT_KEYWORDS });
  const [code, setCode] = useState(SAMPLE);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loadedFrom, setLoadedFrom] = useState<string | null>(null);

  // URLハッシュから言語を復元（誰かの共有リンクで来た場合）
  useEffect(() => {
    const m = location.hash.match(/#lang=([A-Za-z0-9_-]+)/);
    if (!m) return;
    const lang = decodeLang(m[1]!);
    if (lang) {
      setName(lang.name);
      setKeywords(lang.keywords);
      setCode(lang.code);
      setLoadedFrom(lang.name);
    }
  }, []);

  const parsed = useMemo(() => parseMini(code, STAGE_FUNC, keywords), [code, keywords]);
  const result = useMemo(() => runMini(code, STAGE_FUNC, keywords), [code, keywords]);

  const makeLink = async () => {
    const encoded = encodeLang({ name, keywords, code });
    const url = `${location.origin}${location.pathname}#lang=${encoded}`;
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* クリップボードが使えない環境では、表示されたURLを手でコピーしてもらう */
    }
  };

  return (
    <div class="workshop">
      {loadedFrom && (
        <p class="workshop-loaded">
          リンクから「<strong>{loadedFrom}</strong>」を読み込みました。誰かが設計した言語が、いまあなたのブラウザで動いています。
        </p>
      )}

      <div class="workshop-meta">
        <label class="workshop-name">
          <span class="astviewer-label">言語の名前</span>
          <input type="text" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
        </label>
        <div class="minilab-keywords">
          <span class="astviewer-label">キーワード表</span>
          <div class="minilab-kw-grid">
            {(Object.keys(KEYWORD_LABELS) as (keyof KeywordMap)[]).map((k) => (
              <label key={k} class="minilab-kw">
                <span>{KEYWORD_LABELS[k]}</span>
                <input
                  type="text"
                  value={keywords[k]}
                  onInput={(e) => {
                    const v = (e.target as HTMLInputElement).value.trim();
                    if (v) setKeywords({ ...keywords, [k]: v });
                  }}
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      <div class="astviewer minilab">
        <div class="astviewer-input">
          <label>
            <span class="astviewer-label">{name} のプログラム</span>
            <textarea
              value={code}
              rows={Math.max(4, code.split('\n').length)}
              spellcheck={false}
              onInput={(e) => setCode((e.target as HTMLTextAreaElement).value)}
            />
          </label>
        </div>

        <div class="astviewer-tree">
          <span class="astviewer-label">構造の木</span>
          {parsed.ok ? (
            <TreeView root={miniProgramToTree(parsed.program)} />
          ) : (
            <p class="astviewer-error">まだ木になりません — {parsed.error.message}</p>
          )}
        </div>

        <div class="minilab-result">
          <span class="astviewer-label">評価された値</span>
          {result.ok ? (
            result.values.length > 0 ? (
              <div class="minilab-values">
                {result.values.map((v, i) => (
                  <span key={i} class={`minilab-value ${typeof v === 'boolean' ? 'is-bool' : ''}`}>
                    {String(v)}
                  </span>
                ))}
              </div>
            ) : (
              <p class="minilab-error">（この実行は、見せる値を残しませんでした）</p>
            )
          ) : (
            <p class="minilab-error">
              {result.error.message}
              {result.error.hint && <span class="minilab-hint">{result.error.hint}</span>}
            </p>
          )}
        </div>
      </div>

      <div class="workshop-share">
        <button type="button" class="btn btn-primary" onClick={() => void makeLink()}>
          この言語を、リンクにして世に出す
        </button>
        {shareUrl && (
          <p class="workshop-url">
            {copied ? 'コピーしました。' : 'このURLが、あなたの言語です：'}
            <code>{shareUrl}</code>
          </p>
        )}
      </div>
    </div>
  );
}
