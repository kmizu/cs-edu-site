import { StreamLanguage } from '@codemirror/language';
import { KEYWORDS, PARTICLES } from '../../engine/niwa/token';

/** にわ語のシンタックスハイライト（軽量なStreamLanguage定義） */
export const niwaLanguage = StreamLanguage.define({
  name: 'niwa',
  token(stream) {
    if (stream.eatSpace()) return null;

    // コメント
    if (stream.match(/^[※#].*/)) return 'comment';

    // 文字列
    if (stream.match(/^「[^」]*」?/)) return 'string';

    // 数
    if (stream.match(/^[0-9０-９]+(?:[.．][0-9０-９]+)?/)) return 'number';

    // 記号
    if (stream.match(/^[+\-*/×÷]/)) return 'operator';
    if (stream.match(/^[{}｛｝()（）]/)) return 'bracket';
    if (stream.match(/^。/)) return 'punctuation';

    // 語
    const m = stream.match(/^[\p{L}\p{N}_ー々]+/u);
    if (m) {
      const word = typeof m === 'boolean' ? '' : m[0]!;
      if (KEYWORDS.has(word)) return 'keyword';
      if (PARTICLES.has(word)) return 'meta';
      return 'variableName';
    }

    stream.next();
    return null;
  },
});
