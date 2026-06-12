/**
 * エラー翻訳レイヤ。
 * JavaScriptの英語エラーに、日本語の「読み解き」を添える。
 * 翻訳して置き換えるのではなく併記する——英語エラーを読む力も育てたいから。
 */

export interface JaAnnotation {
  /** エラーの読み解き */
  reading: string;
  /** 次の一歩 */
  hint?: string;
}

interface Rule {
  pattern: RegExp;
  annotate(match: RegExpMatchArray): JaAnnotation;
}

const RULES: Rule[] = [
  {
    pattern: /(.+) is not defined/,
    annotate: (m) => ({
      reading: `「${m[1]}」という名前を、コンピュータはまだ知りません。`,
      hint: '定義（名づけ）はこの行より前にありますか？ つづりは合っていますか？大文字と小文字も区別されます。',
    }),
  },
  {
    pattern: /Unexpected token '?(.+?)'?$/,
    annotate: (m) => ({
      reading: `読んでいる途中で、予想していなかった記号「${m[1]}」に出会いました。`,
      hint: 'かっこ ( ) { } や引用符 " " の閉じ忘れが、いちばんよくある原因です。',
    }),
  },
  {
    pattern: /Unexpected end of input/,
    annotate: () => ({
      reading: 'まだ続きがあるはずなのに、コードが終わってしまいました。',
      hint: '開いたかっこが、どこかで閉じられていないようです。',
    }),
  },
  {
    pattern: /(.+) is not a function/,
    annotate: (m) => ({
      reading: `「${m[1]}」は関数ではないのに、関数のように呼び出されています。`,
      hint: '名前のつづりを確かめるか、その値に ( ) を付けてよいか考えてみてください。',
    }),
  },
  {
    pattern: /Cannot read propert(?:y|ies) (?:of (undefined|null))?\s*\(reading '(.+)'\)/,
    annotate: (m) => ({
      reading: `中身のないもの（${m[1] ?? 'undefined'}）から「${m[2]}」を取り出そうとしました。`,
      hint: 'その手前の値が、思っているものになっているか console.log で確かめてみてください。',
    }),
  },
  {
    pattern: /Maximum call stack size exceeded/,
    annotate: () => ({
      reading: '関数が自分自身を呼び続けて、戻ってこられなくなりました。',
      hint: '「いつ止まるか」の条件が、関数のなかに書かれていますか？',
    }),
  },
  {
    pattern: /Invalid or unexpected token/,
    annotate: () => ({
      reading: 'コンピュータが読めない文字がまじっています。',
      hint: '全角の記号（＋ や （） や ”）が入っていないか確かめてください。コードの記号は半角です。',
    }),
  },
  {
    pattern: /Assignment to constant variable/,
    annotate: () => ({
      reading: 'const で名づけた値を、付け替えようとしました。',
      hint: '付け替えたい値は let で名づけます。',
    }),
  },
];

export function annotateError(message: string): JaAnnotation | null {
  for (const rule of RULES) {
    const m = message.match(rule.pattern);
    if (m) return rule.annotate(m);
  }
  return null;
}
