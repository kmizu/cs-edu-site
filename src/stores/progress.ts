import { persistentAtom } from '@nanostores/persistent';

export interface ProgressData {
  version: 1;
  lessons: Record<string, { done: boolean; at: string }>;
}

const EMPTY: ProgressData = { version: 1, lessons: {} };

export const progress = persistentAtom<ProgressData>('niwa:progress:v1', EMPTY, {
  encode: JSON.stringify,
  decode: (raw) => {
    try {
      const data = JSON.parse(raw) as ProgressData;
      return data.version === 1 ? data : EMPTY;
    } catch {
      return EMPTY;
    }
  },
});

export function markDone(lessonId: string, done: boolean): void {
  const current = progress.get();
  progress.set({
    ...current,
    lessons: {
      ...current.lessons,
      [lessonId]: { done, at: new Date().toISOString() },
    },
  });
}

export function isDone(lessonId: string): boolean {
  return progress.get().lessons[lessonId]?.done ?? false;
}

export function doneCount(courseKey: string): number {
  return Object.entries(progress.get().lessons).filter(
    ([id, v]) => id.startsWith(`${courseKey}/`) && v.done,
  ).length;
}
