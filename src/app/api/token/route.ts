import { NextResponse } from 'next/server'

/**
 * POST /api/token
 *
 * Creates a temporary AssemblyAI token for browser-side
 * streaming transcription. The real API key never leaves the server.
 */
export async function POST() {
  const apiKey = process.env.ASSEMBLYAI_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'ASSEMBLYAI_API_KEY is not configured' }, { status: 500 })
  }

  try {
    const response = await fetch('https://api.assemblyai.com/v2/realtime/token', {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expires_in: 480 }), // 8 minutes
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('AssemblyAI token error:', data)
      return NextResponse.json({ error: 'Failed to create token' }, { status: response.status })
    }

    return NextResponse.json({ token: data.token })
  } catch (err) {
    console.error('Token route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
