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
- Garbled/unclear transcription: "can see la", "doll hairs"
- Meta-talk about this app: "category wrong", "it's updating"
- Short fragments under 4 meaningful words
- Emotional expressions: "damn", "so good", "perfect"

When in doubt, DO NOT add. Only add clear, meaningful content.

## REQUIRED: "Recent" branch
The LAST child in the top-level array must ALWAYS be a branch with "text": "Recent".
This branch is a timeline of the most recent topics/points discussed, in descending order (newest first, oldest last).
- Each child is a short 1-4 word summary of a recent topic or point.
- Keep a MAX of 8 items. Drop the oldest when adding new ones.
- This branch is SEPARATE from the organized topic branches — it's a quick-glance reference so the user can instantly remember what was just discussed.
- When new transcript comes in, add the latest topic/point to the TOP of this branch's children.

## RECALL DETECTION
Sometimes people lose their train of thought mid-conversation. They might say things like:
- "Wait, what was I talking about?"
- "Where were we?"
- "What was that thing I just said?"
- "No, not that — the other thing"
- "What did we say about...?"
- Or any variation of trying to remember what was being discussed.

When you detect this:
1. Add a "recall" field to your JSON response with a SHORT, helpful, natural-language answer (1-2 sentences max). Talk like a helpful friend reminding them: "You were just talking about cutting Airtable costs and switching to annual billing."
2. If they say "no not that" or "the other thing", look further back in the Recent branch or the mindmap topics and try again with a different topic.
3. Keep the mindmap UNCHANGED when someone is just trying to recall — don't add their recall question as a topic.
4. If the transcript is NOT a recall question, do NOT include the "recall" field at all.

## JSON format
Return ONLY valid JSON. When there's no recall:
{
  "title": "Conversation",
  "children": [...]
}

When there IS a recall moment:
{
  "title": "Conversation",
  "children": [...],
  "recall": "You were just talking about refund totals and the $5,000 per refund calculation."
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
    const result = JSON.parse(jsonStr)

    if (!result.children || !Array.isArray(result.children)) {
      console.error('[extract] Bad shape:', raw)
      return NextResponse.json(currentMap)
    }

    // Pass through the full result (includes recall if present)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[extract] Error:', err)
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 })
  }
}
