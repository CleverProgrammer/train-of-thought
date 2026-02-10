/**
 * Recursive mindmap structure — AI decides the depth.
 *
 *   Conversation          (depth 0)
 *   ├── Finances          (depth 1)
 *   │   ├── Notion        (depth 2)
 *   │   │   ├── Cut costs (depth 3)
 *   │   │   │   ├── Remove Elsa   (depth 4)
 *   │   │   │   └── Remove Camryn (depth 4)
 *   │   │   └── Switch annual
 */

export interface MindMapNode {
  text: string
  children?: MindMapNode[]
}

export interface MindMapData {
  title: string
  children: MindMapNode[]
}

export const EMPTY_MINDMAP: MindMapData = {
  title: 'Conversation',
  children: [],
}
