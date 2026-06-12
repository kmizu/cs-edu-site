import type { DrawCommand } from '../../engine/niwa';

/** 'ink' をテーマの墨色に解決する */
function resolveColor(color: string): string {
  if (color !== 'ink') return color;
  const v = getComputedStyle(document.documentElement).getPropertyValue('--c-ink').trim();
  return v || '#2a2823';
}

function bounds(commands: DrawCommand[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = 0,
    minY = 0,
    maxX = 0,
    maxY = 0;
  const see = (x: number, y: number, pad = 0) => {
    minX = Math.min(minX, x - pad);
    minY = Math.min(minY, y - pad);
    maxX = Math.max(maxX, x + pad);
    maxY = Math.max(maxY, y + pad);
  };
  for (const c of commands) {
    if (c.kind === 'line') {
      see(c.x1, c.y1);
      see(c.x2, c.y2);
    } else if (c.kind === 'circle') {
      see(c.x, c.y, c.r);
    } else {
      for (const p of c.points) see(p.x, p.y);
    }
  }
  return { minX, minY, maxX, maxY };
}

function drawOne(ctx: CanvasRenderingContext2D, c: DrawCommand): void {
  ctx.strokeStyle = resolveColor(c.color);
  ctx.lineWidth = c.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (c.kind === 'line') {
    ctx.moveTo(c.x1, c.y1);
    ctx.lineTo(c.x2, c.y2);
  } else if (c.kind === 'circle') {
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
  } else {
    const [first, ...rest] = c.points;
    if (!first) return;
    ctx.moveTo(first.x, first.y);
    for (const p of rest) ctx.lineTo(p.x, p.y);
    ctx.closePath();
  }
  ctx.stroke();
}

export interface CanvasRenderer {
  /** コマンド列を「育つように」順番に描く */
  render(commands: DrawCommand[]): void;
  /** 最後のコマンド列を（アニメーションなしで）描き直す。テーマ切替時に使う */
  redraw(): void;
  stop(): void;
}

export function createCanvasRenderer(canvas: HTMLCanvasElement): CanvasRenderer {
  let last: DrawCommand[] = [];
  let raf = 0;

  function setup(commands: DrawCommand[]): CanvasRenderingContext2D | null {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 600;
    const cssH = canvas.clientHeight || 320;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    // 原点を中央へ。大きい絵は収まるように縮小（小さい絵は等倍のまま）
    const b = bounds(commands);
    const margin = 24;
    const bw = Math.max(b.maxX - b.minX, 1);
    const bh = Math.max(b.maxY - b.minY, 1);
    const scale = Math.min(1, (cssW - margin * 2) / bw, (cssH - margin * 2) / bh);
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    ctx.translate(cssW / 2, cssH / 2);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    return ctx;
  }

  function stop(): void {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  return {
    render(commands) {
      stop();
      last = commands;
      const ctx = setup(commands);
      if (!ctx) return;

      // 全体で~600ms、1フレームに均等割りで描き足す
      const total = commands.length;
      const frames = Math.max(1, Math.min(36, total));
      const perFrame = Math.ceil(total / frames);
      let i = 0;
      const step = () => {
        const until = Math.min(total, i + perFrame);
        for (; i < until; i++) drawOne(ctx, commands[i]!);
        if (i < total) raf = requestAnimationFrame(step);
      };
      step();
    },
    redraw() {
      stop();
      const ctx = setup(last);
      if (!ctx) return;
      for (const c of last) drawOne(ctx, c);
    },
    stop,
  };
}
