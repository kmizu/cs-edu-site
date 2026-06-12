import { useStore } from '@nanostores/preact';
import { useRef, useState } from 'preact/hooks';
import { COURSES } from '../../data/courses';
import { progress, type ProgressData } from '../../stores/progress';
import { getRunCount } from './storage';

function Plant({ grown }: { grown: boolean }) {
  return (
    <svg viewBox="0 0 24 24" class={`garden-plant ${grown ? 'is-grown' : ''}`} aria-hidden="true">
      {grown ? (
        <path
          d="M12 21 V10 M12 13 C12 8 7 7 4.5 8 C5.5 12 10 14 12 13 M12 10 C12 5 17 3.5 19.5 4.5 C18.5 9.5 14 11 12 10"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
      ) : (
        <circle cx="12" cy="17" r="2" fill="currentColor" />
      )}
    </svg>
  );
}

/** あなたの庭：進捗と記録と、庭の引っ越し（エクスポート/インポート） */
export default function Garden() {
  const data = useStore(progress);
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');

  const runs = getRunCount();
  const doneIds = Object.entries(data.lessons)
    .filter(([, v]) => v.done)
    .map(([id]) => id);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gengo-no-niwa-progress.json';
    a.click();
    URL.revokeObjectURL(url);
    setMessage('庭の記録を書き出しました。別のブラウザで「持ちこむ」と、続きから歩けます。');
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as ProgressData;
        if (parsed.version !== 1 || typeof parsed.lessons !== 'object') {
          throw new Error('format');
        }
        progress.set(parsed);
        setMessage('庭の引っ越しが終わりました。おかえりなさい。');
      } catch {
        setMessage('このファイルは、庭の記録として読めませんでした。');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div class="garden">
      {COURSES.map((course) => {
        const done = doneIds.filter((id) => id.startsWith(`${course.key}/`)).length;
        return (
          <section class="garden-course" key={course.key}>
            <h2>
              コース{course.no} {course.title}
            </h2>
            <div class="garden-bed">
              {Array.from({ length: course.total }, (_, i) => {
                const grown = doneIds.includes(
                  `${course.key}/${String(i + 1).padStart(2, '0')}`,
                );
                return <Plant key={i} grown={grown} />;
              })}
            </div>
            <p class="garden-count">
              {done} / {course.total} レッスンが植わっています
            </p>
          </section>
        );
      })}

      <section class="garden-stats">
        <h2>庭しごとの記録</h2>
        <p>
          このブラウザでコードを実行した回数：<strong>{runs}</strong> 回
        </p>
        <p class="garden-note">
          記録はぜんぶ、あなたのブラウザの中だけにあります。この庭は、あなたが誰かを知りません。
        </p>
      </section>

      <section class="garden-move">
        <h2>庭の引っ越し</h2>
        <p class="garden-note">
          別のパソコンやブラウザに移るときは、記録を書き出して持ちこめます。
        </p>
        <div class="garden-actions">
          <button type="button" class="btn btn-ghost" onClick={exportData}>
            記録を書き出す
          </button>
          <button type="button" class="btn btn-ghost" onClick={() => fileInput.current?.click()}>
            記録を持ちこむ
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (f) importData(f);
            }}
          />
        </div>
        {message && <p class="garden-message">{message}</p>}
      </section>
    </div>
  );
}
