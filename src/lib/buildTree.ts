/**
 * Builds a markmap-compatible tree from transcript segments.
 *
 * Each completed segment becomes a child node of the root.
 * The current (in-progress) transcript is shown as an italicized node.
 */

export interface TreeNode {
  content: string
  children: TreeNode[]
}

export function buildTree(segments: string[], currentText: string): TreeNode {
  const children: TreeNode[] = segments
    .filter(s => s.trim())
    .map(s => ({
      content: s,
      children: [],
    }))

  // Show the in-progress transcript as a live node
  if (currentText.trim()) {
    children.push({
      content: `<em style="opacity:0.6">${currentText}...</em>`,
      children: [],
    })
  }

  return {
    content: '🧠 Train of Thought',
    children,
  }
}
