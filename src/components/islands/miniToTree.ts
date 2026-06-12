import type { MiniExpr, MiniProgram, MiniStmt } from '../../engine/minilang';
import type { TreeNode } from './TreeView';

const OP_NAMES: Record<string, string> = {
  '+': 'たす +',
  '-': 'ひく −',
  '*': 'かける ×',
  '/': 'わる ÷',
};

export function miniExprToTree(e: MiniExpr): TreeNode {
  switch (e.type) {
    case 'num':
      return { label: String(e.value), chip: '数' };
    case 'var':
      return { label: e.name, chip: '名前' };
    case 'bin':
      return {
        label: OP_NAMES[e.op]!,
        chip: '式',
        children: [miniExprToTree(e.left), miniExprToTree(e.right)],
      };
    case 'cmp':
      return {
        label: `くらべる ${e.op}`,
        chip: '式',
        children: [miniExprToTree(e.left), miniExprToTree(e.right)],
      };
    case 'call':
      return {
        label: `${e.name}(…)`,
        chip: '呼び出し',
        children: e.args.map(miniExprToTree),
      };
  }
}

export function miniStmtToTree(s: MiniStmt): TreeNode {
  switch (s.type) {
    case 'expr':
      return miniExprToTree(s.expr);
    case 'assign':
      return { label: `${s.name} =`, chip: '代入', children: [miniExprToTree(s.value)] };
    case 'if': {
      const children: TreeNode[] = [
        { label: '条件', children: [miniExprToTree(s.cond)] },
        { label: 'そのとき', children: s.then.map(miniStmtToTree) },
      ];
      if (s.else) children.push({ label: 'ちがえば', children: s.else.map(miniStmtToTree) });
      return { label: 'もしも', chip: '文', children };
    }
    case 'while':
      return {
        label: 'くりかえし',
        chip: '文',
        children: [
          { label: '続ける条件', children: [miniExprToTree(s.cond)] },
          { label: 'なかみ', children: s.body.map(miniStmtToTree) },
        ],
      };
    case 'fn':
      return {
        label: `${s.name}(${s.params.join(', ')}) の定義`,
        chip: '関数',
        children: s.body.map(miniStmtToTree),
      };
  }
}

export function miniProgramToTree(p: MiniProgram): TreeNode {
  if (p.body.length === 1) return miniStmtToTree(p.body[0]!);
  return { label: 'プログラム', children: p.body.map(miniStmtToTree) };
}
