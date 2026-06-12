import { useStore } from '@nanostores/preact';
import { markDone, progress } from '../../stores/progress';

interface Props {
  lessonId: string;
  nextHref?: string;
  nextTitle?: string;
}

/** レッスン末尾の「読み終えた」ボタン。押すと庭に植物がひとつ育つ。 */
export default function LessonComplete({ lessonId, nextHref, nextTitle }: Props) {
  const data = useStore(progress);
  const done = data.lessons[lessonId]?.done ?? false;

  return (
    <div class={`lesson-complete ${done ? 'is-done' : ''}`}>
      {done ? (
        <>
          <p class="lesson-complete-msg">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path
                d="M12 21 V10 M12 13 C12 8 7 7 4.5 8 C5.5 12 10 14 12 13 M12 10 C12 5 17 3.5 19.5 4.5 C18.5 9.5 14 11 12 10"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
            このレッスンは、あなたの庭に植わりました。
          </p>
          <div class="lesson-complete-actions">
            <button type="button" class="lesson-undone" onClick={() => markDone(lessonId, false)}>
              まだ途中にする
            </button>
            {nextHref && (
              <a class="btn btn-primary" href={nextHref}>
                つぎへ：{nextTitle ?? 'つぎのレッスン'}
              </a>
            )}
          </div>
        </>
      ) : (
        <button type="button" class="btn btn-primary" onClick={() => markDone(lessonId, true)}>
          このレッスンを読み終えた
        </button>
      )}
    </div>
  );
}
