import type { Expr, Program, Stmt } from '../../engine/niwa';
import type { TreeNode } from './TreeView';

const OP_NAMES: Record<string, string> = {
  '+': 'たし算 +',
  '-': 'ひき算 −',
  '*': 'かけ算 ×',
  '/': 'わり算 ÷',
};

const CMP_NAMES = { gt: 'より おおきい', lt: 'より ちいさい', eq: 'と おなじ' } as const;

function exprToTree(e: Expr): TreeNode {
  switch (e.type) {
    case 'num':
      return { label: String(e.value), chip: '数' };
    case 'str':
      return { label: `「${e.value}」`, chip: '文字列' };
    case 'ident':
      return { label: e.name, chip: '名前' };
    case 'binop':
      return {
        label: OP_NAMES[e.op] ?? e.op,
        chip: '式',
        children: [exprToTree(e.left), exprToTree(e.right)],
      };
    case 'compare':
      return {
        label: CMP_NAMES[e.op],
        chip: 'くらべ',
        children: [exprToTree(e.left), exprToTree(e.right)],
      };
  }
}

function stmtToTree(s: Stmt): TreeNode {
  switch (s.type) {
    case 'draw':
      return { label: 'かく', chip: '文', children: [exprToTree(s.shape)] };
    case 'say':
      return { label: 'いう', chip: '文', children: [exprToTree(s.value)] };
    case 'move':
      return { label: 'すすむ', chip: '文', children: [exprToTree(s.distance)] };
    case 'turn':
      return {
        label: `${s.direction === 'right' ? 'みぎ' : 'ひだり'}へ まわる`,
        chip: '文',
        children: [exprToTree(s.angle)],
      };
    case 'name':
      return { label: `「${s.name}」と よぶ`, chip: '名づけ', children: [exprToTree(s.value)] };
    case 'assign':
      return { label: `「${s.name}」を 〜にする`, chip: '付け替え', children: [exprToTree(s.value)] };
    case 'repeat':
      return {
        label: 'くりかえす',
        chip: '文',
        children: [
          { label: '回数', children: [exprToTree(s.count)] },
          { label: 'なかみ', children: s.body.map(stmtToTree) },
        ],
      };
    case 'if': {
      const children: TreeNode[] = [
        { label: '条件', children: [exprToTree(s.cond)] },
        { label: 'ならば', children: s.then.map(stmtToTree) },
      ];
      if (s.else) children.push({ label: 'ちがえば', children: s.else.map(stmtToTree) });
      return { label: 'もし', chip: '文', children };
    }
    case 'def':
      return { label: `「${s.name}」とは`, chip: '定義', children: s.body.map(stmtToTree) };
    case 'call':
      return { label: s.name, chip: '呼び出し' };
  }
}

export function programToTree(p: Program): TreeNode {
  return { label: 'プログラム', children: p.body.map(stmtToTree) };
}
