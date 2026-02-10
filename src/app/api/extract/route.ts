import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { MindMapData } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You maintain a mindmap of a live conversation. You decide the depth. QUALITY OVER QUANTITY.

Good branch example:
  Programming languages → JavaScript, Python, SQL

The tree is recursive. Every node has "text" (1-4 words) and optional "children".

WHAT TO ADD — only these:
- Named things (products, people, places)
- Facts & numbers ("$300/mo", "17% savings")
- Decisions ("Cut Airtable", "Switch annual")
- Real topics being discussed ("Programming languages", "Fitness goals")

WHAT TO REJECT — return mindmap UNCHANGED:
- Reactions: "no way", "wow", "that's crazy"
- Filler: "yeah", "okay", "um", "anyway", "let's go"
- Questions without substance: "why?", "really?", "what?"
- Garbled/unclear transcription: "can see la", "doll hairs"
- Meta-talk about this app: "category wrong", "it's updating"
- Short fragments under 4 meaningful words
- Emotional expressions: "damn", "so good", "perfect"

When in doubt, DO NOT add. Only add clear, meaningful content.

JSON format:
{
  "title": "Conversation",
  "children": [
    {
      "text": "Topic name",
      "children": [
        { "text": "Subtopic" },
        { "text": "Key point", "children": [{ "text": "Detail" }] }
      ]
    }
  ]
}`

export async function POST(request: Request) {
  try {
    const { newText, currentMap } = (await request.json()) as {
      newText: string
      currentMap: MindMapData
    }

    if (!newText?.trim()) {
      return NextResponse.json(currentMap)
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Current mindmap:\n${JSON.stringify(currentMap)}\n\nNew transcript:\n"${newText}"`,
        },
      ],
      temperature: 0.2,
    })

    const textBlock = message.content.find(b => b.type === 'text')
    const raw = textBlock?.text || '{}'
    const jsonStr = raw.replace(/```json\n?|\n?```/g, '').trim()
    const result = JSON.parse(jsonStr) as MindMapData

    if (!result.children || !Array.isArray(result.children)) {
      console.error('[extract] Bad shape:', raw)
      return NextResponse.json(currentMap)
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[extract] Error:', err)
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 })
  }
}
