import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { MindMapData } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are Poppy, an AI assistant embedded in a live mind map app called "Train of Thought".

The user spoke a sentence containing the wake word "Poppy". Your job is to figure out what they want and update the mind map accordingly.

## Detect intent

1. **QUESTION** — "Poppy, what's 50 times 5000?" / "Poppy, how many days in a year?"
   → Compute the answer. Add a node with the answer placed contextually under the most relevant existing topic. If no topic fits, create a clear new one. Format: the question as a parent node, the answer as its child.

2. **COMMAND** — "Poppy, move refunds under finances" / "Poppy, rename Marketing to Growth"
   → Modify the mind map structure as requested (move, rename, delete, merge, reorganize nodes).

3. **NOT A COMMAND** — "Poppy" is just mentioned in conversation, e.g. "I work at Poppy" / "Poppy the company is growing"
   → Treat as regular conversation. Add meaningful content to the mind map the same way new topics would be added. Return the JSON with a special flag: "passthrough": true

## Rules
- Keep every node 1-4 words.
- Preserve all existing nodes unless explicitly asked to modify/remove them.
- For QUESTIONS: just add the ANSWER as a single node. Do NOT add the question itself as a node — only the answer.
  - Math: just the result, e.g. "$250,000" not "50 × $5,000 = $250,000"
  - Factual: just the answer, e.g. "365 days" not "Days in a year → 365 days"
- Place answers contextually when possible — if the conversation is about refunds and they ask about refund totals, nest the answer under the refunds topic. If no relevant topic exists, create a short one.
- You decide the nesting depth. Quality over quantity.
- Keep it clean and minimal. The user wants answers, not a transcript of their question.
- The mindmap has a "Recent" branch (always the last child). When you add/answer something, also add it to the top of the "Recent" branch (max 8 items, drop oldest). Preserve this branch.

## JSON format
{
  "title": "Conversation",
  "children": [
    {
      "text": "Topic name",
      "children": [
        { "text": "Subtopic" },
        { "text": "Key point", "children": [{ "text": "Detail" }] }
      ]
    },
    {
      "text": "Recent",
      "children": [
        { "text": "Latest thing" },
        { "text": "Previous thing" }
      ]
    }
  ]
}

Return ONLY valid JSON. No markdown fences, no explanation outside the JSON.`

export async function POST(request: Request) {
  try {
    const { commandText, fullText, currentMap } = (await request.json()) as {
      commandText: string
      fullText: string
      currentMap: MindMapData
    }

    if (!commandText?.trim() && !fullText?.trim()) {
      return NextResponse.json(currentMap)
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Current mindmap:\n${JSON.stringify(currentMap)}\n\nFull transcript: "${fullText}"\n\nExtracted command/question: "${commandText}"`,
        },
      ],
      temperature: 0.2,
    })

    const textBlock = message.content.find(b => b.type === 'text')
    const raw = textBlock?.text || '{}'
    const jsonStr = raw.replace(/```json\n?|\n?```/g, '').trim()
    const result = JSON.parse(jsonStr)

    // If the LLM flagged this as passthrough (not actually a command),
    // tell the caller so it can route to normal extraction instead
    if (result.passthrough) {
      return NextResponse.json({ passthrough: true, currentMap })
    }

    if (!result.children || !Array.isArray(result.children)) {
      console.error('[command] Bad shape:', raw)
      return NextResponse.json(currentMap)
    }

    return NextResponse.json(result as MindMapData)
  } catch (err) {
    console.error('[command] Error:', err)
    return NextResponse.json({ error: 'Command failed' }, { status: 500 })
  }
}
