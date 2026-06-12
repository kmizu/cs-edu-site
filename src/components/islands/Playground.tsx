import { useState } from 'preact/hooks';
import CodeRunner from './CodeRunner';
import NiwaRunner from './NiwaRunner';

const NIWA_SAMPLE = `いろ を むらさき にする
12 かい くりかえす {
  ほし を かく
  30 すすむ
  みぎ へ 30 まわる
}`;

const JS_SAMPLE = `// ここは自由帳。なんでも書いて、実行してみてください
const name = "ことば";
for (let i = 1; i <= name.length; i++) {
  console.log("★".repeat(i) + " " + name[i - 1]);
}`;

/** あそびば：にわ語とJavaScriptを切り替えて、自由に書ける場所 */
export default function Playground() {
  const [tab, setTab] = useState<'niwa' | 'js'>('niwa');

  return (
    <div class="playground">
      <div class="playground-tabs" role="tablist" aria-label="言語の切り替え">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'niwa'}
          class={tab === 'niwa' ? 'is-active' : ''}
          onClick={() => setTab('niwa')}
        >
          にわ語
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'js'}
          class={tab === 'js' ? 'is-active' : ''}
          onClick={() => setTab('js')}
        >
          JavaScript
        </button>
      </div>

      <div style={{ display: tab === 'niwa' ? 'block' : 'none' }}>
        <NiwaRunner initialCode={NIWA_SAMPLE} canvasHeight={380} storageKey="playground-niwa" />
      </div>
      <div style={{ display: tab === 'js' ? 'block' : 'none' }}>
        <CodeRunner initialCode={JS_SAMPLE} storageKey="playground-js" />
      </div>
    </div>
  );
}
