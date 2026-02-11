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

/** Recursively collect all node texts from a MindMapData tree. */
export function collectNodeTexts(nodes: MindMapNode[], out: Set<string> = new Set()): Set<string> {
  for (const n of nodes) {
    out.add(n.text)
    if (n.children) collectNodeTexts(n.children, out)
  }
  return out
}

/**
 * Convert a MindMapNode to a markmap TreeNode.
 * Returns [treeNode, hasNewDescendant] so parents can be highlighted too.
 */
function toTreeNode(node: MindMapNode, newTexts?: Set<string>): [TreeNode, boolean] {
  const isNew = newTexts?.has(node.text) ?? false

  // Build children first so we know if any descendant is new
  let hasNewDescendant = false
  const children: TreeNode[] = (node.children || []).map(c => {
    const [child, childHasNew] = toTreeNode(c, newTexts)
    if (childHasNew) hasNewDescendant = true
    return child
  })

  // Pick the right class: new node itself, or parent of a new node
  let content: string
  if (isNew) {
    content = `<span class="node-new">${node.text}</span>`
  } else if (hasNewDescendant) {
    content = `<span class="node-new-parent">${node.text}</span>`
  } else {
    content = node.text
  }

  const treeNode: TreeNode = { content, children }

  // Keep the "Recent" branch collapsed by default
  if (node.text.toLowerCase() === 'recent') {
    treeNode.payload = { fold: 1 }
  }

  return [treeNode, isNew || hasNewDescendant]
}

export function buildTree(
  mindmap: MindMapData,
  currentText: string,
  newTexts?: Set<string>,
): TreeNode {
  const children: TreeNode[] = (mindmap.children || []).map(c => {
    const [child] = toTreeNode(c, newTexts)
    return child
  })

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
