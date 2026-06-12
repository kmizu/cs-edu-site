/**
 * algo — コース4「アルゴリズムのかたち」の教材エンジン。
 * アルゴリズムを実行しながら、1歩ごとの「場面」を記録する。
 * 場面の列を順に見せれば、手順のかたちが目に見える。
 */
export interface Frame {
  /** この場面での並び（毎場面コピー。あとから安全に再生できる） */
  array: number[];
  /** 光らせる位置（くらべている場所） */
  compare?: number[];
  /** いま見ている範囲 [lo, hi]（二分探索・マージの作業区間） */
  range?: [number, number];
  /** 見つかった位置（探索の決着） */
  found?: number | null;
  /** ここまでの比較回数 */
  comparisons: number;
  /** この場面の説明（日本語・短く） */
  note: string;
  /** 決着の場面か */
  done?: boolean;
}

export interface Trace {
  frames: Frame[];
  /** 比較した回数の合計（教材の核） */
  comparisons: number;
}

/** 場面を1枚つくる（配列は必ずコピー） */
export function frame(array: number[], partial: Omit<Frame, 'array'>): Frame {
  return { array: [...array], ...partial };
}
