'use client'

import { useState, useRef, useCallback } from 'react'
import { startMicStream, SAMPLE_RATE } from '@/lib/audioUtils'
import type { MindMapData } from '@/lib/types'
import { EMPTY_MINDMAP } from '@/lib/types'

const WS_BASE = 'wss://api.assemblyai.com/v2/realtime/ws'

/**
 * Hook that manages:
 *  1. Real-time transcription (AssemblyAI)
 *  2. LLM extraction pipeline (GPT-4o-mini via /api/extract)
 *
 * Returns the structured mindmap + live transcript + controls.
 */
export function useTranscription() {
  const [mindmap, setMindmap] = useState<MindMapData>(EMPTY_MINDMAP)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)

  // Refs for WebSocket, mic, and extraction pipeline
  const wsRef = useRef<WebSocket | null>(null)
  const cleanupMicRef = useRef<(() => void) | null>(null)
  const mindmapRef = useRef<MindMapData>(EMPTY_MINDMAP)
  const pendingTextsRef = useRef<string[]>([])
  const extractingRef = useRef(false)

  /* ── LLM extraction pipeline ─────────────────────── */

  const processExtraction = useCallback(async () => {
    // Don't start if already extracting or nothing to process
    if (extractingRef.current || pendingTextsRef.current.length === 0) return

    extractingRef.current = true
    // Grab all pending sentences and clear the buffer
    const texts = pendingTextsRef.current.splice(0)
    const combinedText = texts.join(' ')

    try {
      console.log('[ToT] Extracting:', combinedText)
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newText: combinedText,
          currentMap: mindmapRef.current,
        }),
      })

      if (res.ok) {
        const updated: MindMapData = await res.json()
        mindmapRef.current = updated
        setMindmap(updated)
        console.log('[ToT] Mindmap updated:', updated.topics.length, 'topics')
      }
    } catch (err) {
      console.error('[ToT] Extraction failed:', err)
    } finally {
      extractingRef.current = false
      // If new sentences arrived while we were extracting, process them
      if (pendingTextsRef.current.length > 0) {
        processExtraction()
      }
    }
  }, [])

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
    // Reset state for a fresh session
    mindmapRef.current = EMPTY_MINDMAP
    setMindmap(EMPTY_MINDMAP)
    setCurrentTranscript('')
    pendingTextsRef.current = []
    extractingRef.current = false

    try {
      // 1. Get temporary token
      const res = await fetch('/api/token', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to get token')
      const { token } = await res.json()

      // 2. Connect WebSocket
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

      // 4. Handle transcription events
      ws.onmessage = event => {
        const data = JSON.parse(event.data)

        switch (data.message_type) {
          case 'SessionBegins':
            console.log('[ToT] Session started:', data.session_id)
            break

          case 'PartialTranscript':
            if (data.text) setCurrentTranscript(data.text)
            break

          case 'FinalTranscript':
            if (data.text?.trim()) {
              setCurrentTranscript('')
              // Skip very short fragments — they're almost always noise
              const words = data.text.trim().split(/\s+/)
              if (words.length >= 4) {
                pendingTextsRef.current.push(data.text)
                processExtraction()
              } else {
                console.log('[ToT] Skipped short fragment:', data.text)
              }
            }
            break

          case 'SessionTerminated':
            console.log('[ToT] Session terminated')
            break
        }
      }

      ws.onerror = err => console.error('[ToT] WS error:', err)
      ws.onclose = e => {
        console.log('[ToT] WS closed:', e.code, e.reason)
        setIsListening(false)
      }
    } catch (err) {
      console.error('[ToT] Failed to start:', err)
      cleanup()
    }
  }, [cleanup, processExtraction])

  /* ── stop streaming ─────────────────────────────────── */

  const stop = useCallback(() => {
    cleanup()
    setIsListening(false)
    setCurrentTranscript('')
  }, [cleanup])

  return {
    mindmap,
    currentTranscript,
    isListening,
    start,
    stop,
  }
}
