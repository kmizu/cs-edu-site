/** console出力の値を、安全に人へ見せる文字列にする（循環参照・巨大値に耐える） */

const MAX_LENGTH = 10_000;
const MAX_DEPTH = 4;
const MAX_ITEMS = 100;

function formatOne(value: unknown, depth: number, seen: WeakSet<object>): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  switch (typeof value) {
    case 'string':
      return depth === 0 ? value : JSON.stringify(value);
    case 'number':
    case 'boolean':
    case 'bigint':
      return String(value);
    case 'symbol':
      return value.toString();
    case 'function':
      return `[関数 ${value.name || '(無名)'}]`;
  }

  // ここからはオブジェクト
  const obj = value as object;
  if (seen.has(obj)) return '[循環参照]';
  if (depth >= MAX_DEPTH) return Array.isArray(obj) ? '[…]' : '{…}';
  seen.add(obj);

  try {
    if (Array.isArray(obj)) {
      const items = obj.slice(0, MAX_ITEMS).map((v) => formatOne(v, depth + 1, seen));
      const more = obj.length > MAX_ITEMS ? `, …ほか${obj.length - MAX_ITEMS}件` : '';
      return `[${items.join(', ')}${more}]`;
    }
    if (obj instanceof Error) {
      return `${obj.name}: ${obj.message}`;
    }
    if (obj instanceof Date) {
      return obj.toISOString();
    }
    if (obj instanceof Map) {
      const items = [...obj.entries()]
        .slice(0, MAX_ITEMS)
        .map(([k, v]) => `${formatOne(k, depth + 1, seen)} => ${formatOne(v, depth + 1, seen)}`);
      return `Map {${items.join(', ')}}`;
    }
    if (obj instanceof Set) {
      const items = [...obj.values()].slice(0, MAX_ITEMS).map((v) => formatOne(v, depth + 1, seen));
      return `Set {${items.join(', ')}}`;
    }
    const entries = Object.entries(obj as Record<string, unknown>)
      .slice(0, MAX_ITEMS)
      .map(([k, v]) => `${k}: ${formatOne(v, depth + 1, seen)}`);
    return `{${entries.join(', ')}}`;
  } finally {
    seen.delete(obj);
  }
}

export function formatValue(value: unknown): string {
  const s = formatOne(value, 0, new WeakSet());
  return s.length > MAX_LENGTH ? `${s.slice(0, MAX_LENGTH)} …（長すぎるため省略）` : s;
}

export function formatArgs(args: unknown[]): string {
  return args.map((a) => formatValue(a)).join(' ');
}
