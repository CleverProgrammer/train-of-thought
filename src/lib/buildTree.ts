/**
 * Recursively converts MindMapData into markmap's tree format.
 * Depth is determined by the AI — we just walk the tree.
 */

import type { MindMapData, MindMapNode } from './types'

export interface TreeNode {
  content: string
  children: TreeNode[]
  payload?: { fold?: number }
}

/** Convert a MindMapNode (recursive) to a markmap TreeNode (recursive). */
function toTreeNode(node: MindMapNode): TreeNode {
  const treeNode: TreeNode = {
    content: node.text,
    children: (node.children || []).map(toTreeNode),
  }

  // Keep the "Recent" branch collapsed by default
  if (node.text.toLowerCase() === 'recent') {
    treeNode.payload = { fold: 1 }
  }

  return treeNode
}

export function buildTree(mindmap: MindMapData, currentText: string): TreeNode {
  const children: TreeNode[] = (mindmap.children || []).map(toTreeNode)

  if (currentText.trim()) {
    children.push({
      content: `<em style="opacity:0.5">💬 ${currentText}...</em>`,
      children: [],
    })
  }

  return {
    content: `<strong>🧠 ${mindmap.title}</strong>`,
    children,
  }
}
