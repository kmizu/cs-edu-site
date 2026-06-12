/** localStorageの薄いラッパ（プライベートモード等で失敗しても落とさない） */

const DRAFT_PREFIX = 'niwa:draft:';
const STATS_RUNS = 'niwa:stats:runs';

export function loadDraft(key: string): string | null {
  try {
    return localStorage.getItem(DRAFT_PREFIX + key);
  } catch {
    return null;
  }
}

export function saveDraft(key: string, code: string | null): void {
  try {
    if (code === null) localStorage.removeItem(DRAFT_PREFIX + key);
    else localStorage.setItem(DRAFT_PREFIX + key, code);
  } catch {
    /* 保存できない環境では下書きなしで動く */
  }
}

/** 庭しごとの記録：実行回数 */
export function countRun(): void {
  try {
    const n = Number(localStorage.getItem(STATS_RUNS) ?? '0');
    localStorage.setItem(STATS_RUNS, String(n + 1));
  } catch {
    /* noop */
  }
}

export function getRunCount(): number {
  try {
    return Number(localStorage.getItem(STATS_RUNS) ?? '0');
  } catch {
    return 0;
  }
}
