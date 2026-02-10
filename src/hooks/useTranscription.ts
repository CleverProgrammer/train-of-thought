'use client'

import { useState, useRef, useCallback } from 'react'
import { startMicStream, SAMPLE_RATE } from '@/lib/audioUtils'

/**
 * AssemblyAI v2 Real-Time WebSocket endpoint.
 * v2 is used because the browser temporary-token flow is
 * fully supported here (v3 tokens use a different mechanism).
 */
const WS_BASE = 'wss://api.assemblyai.com/v2/realtime/ws'

/**
 * Hook that manages real-time transcription via AssemblyAI streaming.
 *
 * Returns:
 *  - segments:          completed transcript turns (FinalTranscript)
 *  - currentTranscript: in-progress text (PartialTranscript)
 *  - isListening:       whether the mic is active
 *  - start / stop:      control functions
 */
export function useTranscription() {
  const [segments, setSegments] = useState<string[]>([])
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const cleanupMicRef = useRef<(() => void) | null>(null)

  /* ── cleanup helper ─────────────────────────────────── */
  const cleanup = useCallback(() => {
    cleanupMicRef.current?.()
    cleanupMicRef.current = null

    const ws = wsRef.current
    if (ws) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ terminate_session: true }))
      }
      ws.close()
      wsRef.current = null
    }
  }, [])

  /* ── start streaming ────────────────────────────────── */
  const start = useCallback(async () => {
    try {
      // 1. Get temporary token from our API route
      const res = await fetch('/api/token', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to get token')
      const { token } = await res.json()

      // 2. Build WebSocket URL (v2 real-time)
      const params = new URLSearchParams({
        sample_rate: String(SAMPLE_RATE),
        token,
      })
      const ws = new WebSocket(`${WS_BASE}?${params}`)
      wsRef.current = ws

      // 3. On open → start mic
      ws.onopen = async () => {
        console.log('[ToT] WebSocket connected')
        setIsListening(true)
        try {
          const stopMic = await startMicStream(ws)
          cleanupMicRef.current = stopMic
          console.log('[ToT] Mic streaming started')
        } catch (err) {
          console.error('[ToT] Mic access denied:', err)
          cleanup()
        }
      }

      // 4. Handle incoming transcription events (v2 message format)
      ws.onmessage = event => {
        const data = JSON.parse(event.data)

        switch (data.message_type) {
          case 'SessionBegins':
            console.log('[ToT] Session started:', data.session_id)
            break

          case 'PartialTranscript':
            // Partial results — text may still change
            if (data.text) {
              setCurrentTranscript(data.text)
            }
            break

          case 'FinalTranscript':
            // Finalized text — won't change
            if (data.text?.trim()) {
              setSegments(prev => [...prev, data.text])
              setCurrentTranscript('')
            }
            break

          case 'SessionTerminated':
            console.log('[ToT] Session terminated by server')
            break

          default:
            break
        }
      }

      ws.onerror = err => {
        console.error('[ToT] WebSocket error:', err)
      }

      ws.onclose = event => {
        console.log('[ToT] WebSocket closed:', event.code, event.reason)
        setIsListening(false)
      }
    } catch (err) {
      console.error('[ToT] Failed to start transcription:', err)
      cleanup()
    }
  }, [cleanup])

  /* ── stop streaming ─────────────────────────────────── */
  const stop = useCallback(() => {
    cleanup()
    setIsListening(false)
    setCurrentTranscript('')
  }, [cleanup])

  return {
    segments,
    currentTranscript,
    isListening,
    start,
    stop,
  }
}
