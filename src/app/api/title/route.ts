import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { MindMapData } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You title conversation sessions based on their mind map.

Priority #1: CLARITY. If someone reads the title, they should instantly know what the conversation was about. No guessing.

Priority #2: Keep it simple and natural. Write it like a human would casually describe the convo to a friend. "Oh that was the one where we talked about ___."

Priority #3: Make it catchy when you can — but NEVER sacrifice clarity for cleverness. A clear, boring title beats a clever, confusing one every single time.

Rules:
- Summarize the MAIN topic or theme of the conversation.
- If the convo covered one clear thing, just say what it was.
- If it covered multiple things, pick the most dominant one or combine them naturally.
- Keep it short-ish but don't force it. Natural length.
- No quotes around it, no emojis.
- Return ONLY the title text. Nothing else.`

export async function POST(request: Request) {
  try {
    const { mindmap } = (await request.json()) as { mindmap: MindMapData }

    if (!mindmap?.children?.length) {
      return NextResponse.json({ title: 'Untitled' })
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 100,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Generate a clickbait title for this conversation:\n${JSON.stringify(mindmap)}`,
        },
      ],
      temperature: 0.9,
    })

    const textBlock = message.content.find(b => b.type === 'text')
    let title = textBlock?.text?.trim() || 'Untitled'

    // Strip any wrapping quotes the model might add
    title = title.replace(/^["']|["']$/g, '')

    return NextResponse.json({ title })
  } catch (err) {
    console.error('[title] Error:', err)
    return NextResponse.json({ title: 'Untitled' })
  }
}
