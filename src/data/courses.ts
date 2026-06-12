export interface CourseInfo {
  key: 'kotoba' | 'tsukuru';
  no: number;
  title: string;
  tagline: string;
  description: string;
  total: number;
  /** 前提コース */
  prerequisite?: 'kotoba';
}

export const COURSES: CourseInfo[] = [
  {
    key: 'kotoba',
    no: 1,
    title: 'ことばとしてのプログラミング',
    tagline: '世界一誠実な読み手と、ことばを交わす',
    description:
      'プログラミングの経験はいりません。コンピュータという「読み手」に、曖昧さのない文を書く技術——その出発点から、JavaScriptで小さな作品を作るところまで歩きます。',
    total: 10,
  },
  {
    key: 'tsukuru',
    no: 2,
    title: 'じぶんの言語をつくる',
    tagline: '言語は、与えられるものではなく設計するもの',
    description:
      '電卓から始めて、変数、分岐、関数、そして自分だけの文法へ。コース1で使った「にわ語」の正体を、作る側から解き明かします。',
    total: 12,
    prerequisite: 'kotoba',
  },
];

export function courseByKey(key: string): CourseInfo | undefined {
  return COURSES.find((c) => c.key === key);
}
