import { useMemo, useState } from 'preact/hooks';
import {
  checkTypes,
  DEFAULT_KEYWORDS,
  parseMini,
  runMini,
  STAGE_CALC,
  STAGES,
  tokenizeMini,
  type KeywordMap,
} from '../../engine/minilang';
import { miniProgramToTree } from './miniToTree';
import TreeView from './TreeView';

interface Props {
  initialCode: string;
  /** 言語の成長段階: number | add | calc | var | bool | loop | func | type */
  stage: string;
  showTokens?: boolean;
  showTree?: boolean;
  /** キーワード表を編集できるようにする（レッスン11「文法は、きみが決める」用） */
  editableKeywords?: boolean;
  keywords?: KeywordMap;
  /** 「型の目」パネル（コース6用）。実行の前に型検査の結果を見せる */
  checkTypes?: boolean;
}

const KIND_LABELS: Record<string, string> = {
  number: '数',
  op: '計算',
  cmp: 'くらべ',
  ident: '名前',
  keyword: '合図',
  eq: '=',
  lparen: '(',
  rparen: ')',
  lbrace: '{',
  rbrace: '}',
  comma: ',',
};

const KEYWORD_LABELS: Record<keyof KeywordMap, string> = {
  if: 'もしも',
  else: 'ちがえば',
  while: 'くりかえし',
  fn: '関数定義',
};

/**
 * コース2の実験室。コードを打つと、
 * ① ことばの粒 → ② 構造の木 → ③ 値 が同時にライブ更新される。
 */
export default function MiniLangLab({
  initialCode,
  stage,
  showTokens = true,
  showTree = true,
  editableKeywords = false,
  keywords: initialKeywords,
  checkTypes: showTypeCheck = false,
}: Props) {
  const [code, setCode] = useState(initialCode);
  const [keywords, setKeywords] = useState<KeywordMap>(initialKeywords ?? DEFAULT_KEYWORDS);
  const features = STAGES[stage] ?? STAGE_CALC;

  const tokens = useMemo(() => tokenizeMini(code, keywords), [code, keywords]);
  const parsed = useMemo(() => parseMini(code, features, keywords), [code, features, keywords]);
  const typeCheck = useMemo(
    () => (showTypeCheck && parsed.ok ? checkTypes(parsed.program) : undefined),
    [showTypeCheck, parsed],
  );
  const typesOk = !showTypeCheck || (typeCheck?.ok ?? false);
  const result = useMemo(() => runMini(code, features, keywords), [code, features, keywords]);

  return (
    <div class="astviewer minilab">
      {editableKeywords && (
        <div class="minilab-keywords">
          <span class="astviewer-label">キーワード表（あなたの言語の見た目を決める）</span>
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
      )}

      <div class="astviewer-input">
        <label>
          <span class="astviewer-label">あなたの言語に話しかける</span>
          <textarea
            value={code}
            rows={Math.max(2, code.split('\n').length)}
            spellcheck={false}
            onInput={(e) => setCode((e.target as HTMLTextAreaElement).value)}
          />
        </label>
      </div>

      {showTokens && tokens.ok && (
        <div class="astviewer-tokens">
          <span class="astviewer-label">① ことばの粒（トークン）</span>
          <div class="token-strip">
            {tokens.tokens
              .filter((t) => t.kind !== 'eof' && t.kind !== 'newline')
              .map((t, i) => (
                <span key={i} class={`token-pill token-${t.kind}`}>
                  <span class="token-text">{t.text}</span>
                  <span class="token-kind">{KIND_LABELS[t.kind] ?? t.kind}</span>
                </span>
              ))}
          </div>
        </div>
      )}

      {showTree && (
        <div class="astviewer-tree">
          <span class="astviewer-label">② 構造の木</span>
          {parsed.ok ? (
            <TreeView root={miniProgramToTree(parsed.program)} />
          ) : (
            <p class="astviewer-error">まだ木になりません — {parsed.error.message}</p>
          )}
        </div>
      )}

      {showTypeCheck && (
        <div class="minilab-typecheck">
          <span class="astviewer-label">型の目（実行する前の検査）</span>
          {!parsed.ok ? (
            <p class="minilab-error">（まだ木になっていないので、型はこれから）</p>
          ) : typeCheck?.ok ? (
            <div>
              <p class="minilab-types-ok">型のまちがいは、見つかりませんでした。</p>
              {typeCheck.bindings.length > 0 && (
                <div class="minilab-types">
                  {typeCheck.bindings.map((b) => (
                    <span key={b.name} class="minilab-typebind">
                      <code>{b.name}</code>
                      <span class="minilab-typename">{b.type}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p class="minilab-error minilab-typeerror">
              {typeCheck?.error.message}
              {typeCheck?.error.hint && <span class="minilab-hint">{typeCheck.error.hint}</span>}
            </p>
          )}
        </div>
      )}

      <div class="minilab-result">
        <span class="astviewer-label">{showTypeCheck ? '評価された値' : '③ 評価された値'}</span>
        {!typesOk && parsed.ok ? (
          <p class="minilab-error">（型の目が止めたので、実行していません）</p>
        ) : result.ok ? (
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
  );
}
