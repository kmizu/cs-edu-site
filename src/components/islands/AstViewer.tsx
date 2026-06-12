import { useMemo, useState } from 'preact/hooks';
import { parse, tokenize } from '../../engine/niwa';
import { programToTree } from './astToTree';
import TreeView from './TreeView';

interface Props {
  initialCode: string;
  /** トークン列も見せるか */
  showTokens?: boolean;
}

const KIND_LABELS: Record<string, string> = {
  number: '数',
  string: '文字列',
  word: 'ことば',
  particle: '助詞',
  keyword: '合図',
  op: '計算',
  lbrace: '{',
  rbrace: '}',
  lparen: '(',
  rparen: ')',
  newline: '区切り',
};

/**
 * コードを打つと、その場で「木」が育つビュー。
 * 「コードと木は同じもの」を体感させるための装置。
 */
export default function AstViewer({ initialCode, showTokens = false }: Props) {
  const [code, setCode] = useState(initialCode);

  const result = useMemo(() => parse(code), [code]);
  const tokens = useMemo(() => (showTokens ? tokenize(code) : null), [code, showTokens]);

  return (
    <div class="astviewer">
      <div class="astviewer-input">
        <label>
          <span class="astviewer-label">コード（自由に書きかえてみてください）</span>
          <textarea
            value={code}
            rows={Math.max(3, code.split('\n').length)}
            spellcheck={false}
            onInput={(e) => setCode((e.target as HTMLTextAreaElement).value)}
          />
        </label>
      </div>

      {showTokens && tokens && tokens.ok && (
        <div class="astviewer-tokens">
          <span class="astviewer-label">ことばの粒（トークン）</span>
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

      <div class="astviewer-tree">
        <span class="astviewer-label">構造の木</span>
        {result.ok ? (
          <TreeView root={programToTree(result.program)} />
        ) : (
          <p class="astviewer-error">
            まだ木になりません — {result.error.message}
          </p>
        )}
      </div>
    </div>
  );
}
