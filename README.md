# 言語の庭 — ことばを育てて、言語をつくる

**https://kmizu.github.io/cs-edu-site/**

登録不要・広告なし・ずっと無料の、CS・プログラミング言語教育サイト。
プログラミングを「ことば」として教え、最後は読者が自分のプログラミング言語を設計する側にまわります。

## 特徴

- **言語学的アプローチ** — 「変数は箱」のような、あとで壊れるたとえを使わない。文法・名前・意味という「ことば」の語彙で、最初から正しい絵を描く
- **にわ語** — 日本語キーワードの教材用タートルグラフィックス言語。`まる を かく` から始まり、エラーも日本語で「誠実な読み手の返事」として返す
- **ブラウザ完結** — エディタ・実行・構文木の可視化まで、すべてクライアントサイド。バックエンドなし、アカウントなし。進捗はlocalStorageに保存（JSONで引っ越し可能）
- **コース2「じぶんの言語をつくる」** — 電卓から始めて、字句解析→構文解析→評価という言語処理系の心臓部を、作る側の視点で学ぶ

## コース

| コース | 内容 | 状態 |
|---|---|---|
| 1. ことばとしてのプログラミング | にわ語→JavaScript転換まで全10レッスン | 公開中 |
| 2. じぶんの言語をつくる | 電卓→エラー設計→環境→真偽→while→関数→文法のカスタマイズ→言語の公開、全12レッスン | 公開中 |

修了者は [ことばの工房](https://kmizu.github.io/cs-edu-site/workshop/) で自分の言語を設計し、URLに符号化して共有できます。

## 技術

- [Astro 6](https://astro.build/) + MDX + Preact islands + nanostores
- CodeMirror 6（日本語IME・モバイル対応）
- にわ語/minilang: 純TypeScriptのtree-walkingインタプリタ（fuel方式の暴走防止）
- JS実行: Web Workerサンドボックス（タイムアウトkill＋エラーの日本語注釈レイヤ）
- Vitest（エンジン coverage 80%+）+ Playwright E2E
- GitHub Actions → GitHub Pages

## 開発

```bash
pnpm install
pnpm dev            # 開発サーバ
pnpm test:unit      # エンジンのユニットテスト
pnpm test:e2e       # PlaywrightのE2E（要: pnpm exec playwright install chromium）
pnpm build          # 本番ビルド
```

レッスンは `src/content/lessons/{kotoba,tsukuru}/` のMDX。エンジンは `src/engine/`（DOM非依存の純TS）。

## ライセンス

コードはMIT、教材テキストはCC BY-SA 4.0。
