import type { Conversation, MindMapData } from './types'

const STORAGE_KEY = 'tot_conversations'

/** Generate a short random id. */
function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** Auto-generate a title from top-level mind map topics. */
export function generateTitle(mindmap: MindMapData): string {
  const topics = mindmap.children.map(c => c.text).slice(0, 3)
  if (topics.length === 0) return 'Untitled'
  const title = topics.join(', ')
  return mindmap.children.length > 3 ? `${title}…` : title
}

/** Get all saved conversations, sorted newest first. */
export function listConversations(): Conversation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const convos: Conversation[] = JSON.parse(raw)
    return convos.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

/** Save a new conversation or update an existing one. Returns the conversation. */
export function saveConversation(
  mindmap: MindMapData,
  transcript: string,
  existingId?: string,
  thumbnail?: string,
): Conversation {
  const convos = listConversations()
  const now = Date.now()

  if (existingId) {
    const idx = convos.findIndex(c => c.id === existingId)
    if (idx !== -1) {
      convos[idx].mindmap = mindmap
      convos[idx].transcript = transcript
      convos[idx].title = generateTitle(mindmap)
      convos[idx].updatedAt = now
      if (thumbnail) convos[idx].thumbnail = thumbnail
      localStorage.setItem(STORAGE_KEY, JSON.stringify(convos))
      return convos[idx]
    }
  }

  const convo: Conversation = {
    id: uid(),
    title: generateTitle(mindmap),
    mindmap,
    transcript,
    thumbnail,
    createdAt: now,
    updatedAt: now,
  }
  convos.unshift(convo)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convos))
  return convo
}

/** Load a single conversation by id. */
export function loadConversation(id: string): Conversation | null {
  const convos = listConversations()
  return convos.find(c => c.id === id) ?? null
}

/** Update just the title of an existing conversation. */
export function updateConversationTitle(id: string, title: string): void {
  const convos = listConversations()
  const idx = convos.findIndex((c) => c.id === id)
  if (idx !== -1) {
    convos[idx].title = title
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convos))
  }
}

/** Delete a conversation by id. */
export function deleteConversation(id: string): void {
  const convos = listConversations().filter(c => c.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convos))
}

/**
 * Ask the AI to generate a clickbait title, then persist it.
 * Fire-and-forget — doesn't block the save flow.
 */
export async function generateAITitle(
  id: string,
  mindmap: MindMapData,
): Promise<string | null> {
  try {
    const res = await fetch('/api/title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mindmap }),
    })
    if (!res.ok) return null
    const { title } = await res.json()
    if (title && title !== 'Untitled') {
      updateConversationTitle(id, title)
      return title
    }
    return null
  } catch (err) {
    console.error('[ToT] AI title generation failed:', err)
    return null
  }
}
