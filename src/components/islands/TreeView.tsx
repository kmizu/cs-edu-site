/** 構文木の汎用表示。にわ語にもminilangにも使える純粋な描画部品 */

export interface TreeNode {
  label: string;
  /** ノードの種類を示す小さな札（例：文・式・数） */
  chip?: string;
  children?: TreeNode[];
}

function Node({ node }: { node: TreeNode }) {
  return (
    <li class="tree-node">
      <span class="tree-label">
        {node.chip && <span class="tree-chip">{node.chip}</span>}
        {node.label}
      </span>
      {node.children && node.children.length > 0 && (
        <ul class="tree-children">
          {node.children.map((c, i) => (
            <Node key={i} node={c} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function TreeView({ root }: { root: TreeNode }) {
  return (
    <ul class="tree-root">
      <Node node={root} />
    </ul>
  );
}
