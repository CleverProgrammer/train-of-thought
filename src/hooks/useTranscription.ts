'use client'

import { useState, useRef, useCallback } from 'react'
import { startMicStream, SAMPLE_RATE } from '@/lib/audioUtils'
import type { MindMapData } from '@/lib/types'
import { EMPTY_MINDMAP } from '@/lib/types'
import { saveConversation, generateAITitle } from '@/lib/storage'
import { captureThumbnail } from '@/lib/captureThumbnail'

const WS_BASE = 'wss://api.assemblyai.com/v2/realtime/ws'

/**
 * Detect whether the transcript contains a "Poppy" wake word.
 */
function detectPoppyCommand(text: string): {
  isCommand: boolean
  commandText: string
} {
  const lower = text.toLowerCase()
  const poppyIndex = lower.indexOf('poppy')

  if (poppyIndex === -1) {
    return { isCommand: false, commandText: '' }
  }

  const afterPoppy = text.slice(poppyIndex + 5).trim()
  const commandText = afterPoppy.replace(/^[,.\s]+/, '').trim()

  return {
    isCommand: true,
    commandText: commandText || text,
  }
}

export type SessionStatus = 'idle' | 'listening' | 'paused'

/**
 * Hook that manages:
 *  1. Real-time transcription (AssemblyAI)
 *  2. LLM extraction pipeline (via /api/extract)
 *  3. Poppy command pipeline (via /api/command)
 *  4. Pause / Resume / End session controls
 *  5. Save / Load conversations (localStorage)
 *  6. Full transcript accumulation
 *  7. AI-powered recall detection (toast notifications)
 */
export function useTranscription() {
  const [mindmap, setMindmap] = useState<MindMapData>(EMPTY_MINDMAP)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [fullTranscript, setFullTranscript] = useState('')
  const [status, setStatus] = useState<SessionStatus>('idle')
  const [isProcessingCommand, setIsProcessingCommand] = useState(false)
  const [recallMessage, setRecallMessage] = useState<string | null>(null)
  const [refreshCounter, setRefreshCounter] = useState(0)

  // Track which conversation we're working on (for save/update)
  const conversationIdRef = useRef<string | null>(null)

  // Refs for WebSocket, mic, and extraction pipeline
  const wsRef = useRef<WebSocket | null>(null)
  const cleanupMicRef = useRef<(() => void) | null>(null)
  const mindmapRef = useRef<MindMapData>(EMPTY_MINDMAP)
  const fullTranscriptRef = useRef('')
  const pendingTextsRef = useRef<string[]>([])
  const extractingRef = useRef(false)
  const commandInFlightRef = useRef(false)
  const lastTimestampRef = useRef(0)
  const recallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── Show recall toast (auto-dismiss after 6s) ─────── */

  const showRecall = useCallback((message: string) => {
    // Clear any existing timer
    if (recallTimerRef.current) clearTimeout(recallTimerRef.current)
    setRecallMessage(message)
    recallTimerRef.current = setTimeout(() => {
      setRecallMessage(null)
      recallTimerRef.current = null
    }, 6000)
  }, [])

  const dismissRecall = useCallback(() => {
    if (recallTimerRef.current) clearTimeout(recallTimerRef.current)
    setRecallMessage(null)
    recallTimerRef.current = null
  }, [])

  /* ── Poppy command pipeline ──────────────────────── */

  const processCommand = useCallback(
    async (commandText: string, fullText: string) => {
      commandInFlightRef.current = true
      setIsProcessingCommand(true)
      try {
        console.log('[ToT] 🐾 Poppy command:', commandText)
        const res = await fetch('/api/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commandText,
            fullText,
            currentMap: mindmapRef.current,
          }),
        })

        if (res.ok) {
          const result = await res.json()

          if (result.passthrough) {
            console.log('[ToT] Poppy passthrough → routing to extraction')
            pendingTextsRef.current.push(fullText)
          } else {
            mindmapRef.current = result
            setMindmap(result)
            console.log('[ToT] 🐾 Poppy updated mindmap:', result.children.length, 'topics')
          }
        }
      } catch (err) {
        console.error('[ToT] Poppy command failed:', err)
      } finally {
        commandInFlightRef.current = false
        setIsProcessingCommand(false)
        // Now flush any extractions that queued up while command was in-flight
        processExtraction()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  /* ── LLM extraction pipeline ─────────────────────── */

  const processExtraction = useCallback(async () => {
    // Don't run extraction while a Poppy command is in-flight — the command
    // will update the mindmap and then flush pending extractions when it's done.
    if (commandInFlightRef.current) return
    if (extractingRef.current || pendingTextsRef.current.length === 0) return

    extractingRef.current = true
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
        const result = await res.json()

        // Check if the AI detected a recall moment
        if (result.recall) {
          console.log('[ToT] 🔔 Recall:', result.recall)
          showRecall(result.recall)
        }

        // The mindmap is always in the response (with or without recall)
        const updated: MindMapData = {
          title: result.title ?? 'Conversation',
          children: result.children ?? [],
        }
        mindmapRef.current = updated
        setMindmap(updated)
        console.log('[ToT] Mindmap updated:', updated.children.length, 'topics')
      }
    } catch (err) {
      console.error('[ToT] Extraction failed:', err)
    } finally {
      extractingRef.current = false
      if (pendingTextsRef.current.length > 0) {
        processExtraction()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRecall])

  /* ── cleanup streaming (mic + WS) ───────────────────── */

  const cleanupStreaming = useCallback(() => {
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

  /* ── connect WebSocket + mic ─────────────────────────── */

  const connectStreaming = useCallback(async () => {
    try {
      const res = await fetch('/api/token', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to get token')
      const { token } = await res.json()

      const params = new URLSearchParams({
        sample_rate: String(SAMPLE_RATE),
        token,
      })
      const ws = new WebSocket(`${WS_BASE}?${params}`)
      wsRef.current = ws

      ws.onopen = async () => {
        console.log('[ToT] WebSocket connected')
        setStatus('listening')
        try {
          const stopMic = await startMicStream(ws)
          cleanupMicRef.current = stopMic
          console.log('[ToT] Mic streaming started')
        } catch (err) {
          console.error('[ToT] Mic access denied:', err)
          cleanupStreaming()
          setStatus('idle')
        }
      }

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
              const text = data.text.trim()

              // Insert a light timestamp every ~15s
              const now = Date.now()
              let timestampPrefix = ''
              if (now - lastTimestampRef.current >= 15_000) {
                const t = new Date()
                const hh = t.getHours().toString().padStart(2, '0')
                const mm = t.getMinutes().toString().padStart(2, '0')
                timestampPrefix = `[${hh}:${mm}] `
                lastTimestampRef.current = now
              }

              // Accumulate raw transcript
              fullTranscriptRef.current +=
                (fullTranscriptRef.current ? ' ' : '') + timestampPrefix + text
              setFullTranscript(fullTranscriptRef.current)

              const words = text.split(/\s+/)

              if (words.length < 4) {
                console.log('[ToT] Skipped short fragment:', text)
                break
              }

              const textForAI = timestampPrefix + text
              const { isCommand, commandText } = detectPoppyCommand(text)

              if (isCommand) {
                processCommand(commandText, text)
              } else {
                pendingTextsRef.current.push(textForAI)
                processExtraction()
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
      }
    } catch (err) {
      console.error('[ToT] Failed to connect:', err)
      cleanupStreaming()
      throw err
    }
  }, [cleanupStreaming, processExtraction, processCommand])

  /* ── start (fresh session) ───────────────────────────── */

  const start = useCallback(async () => {
    mindmapRef.current = EMPTY_MINDMAP
    setMindmap(EMPTY_MINDMAP)
    setCurrentTranscript('')
    setFullTranscript('')
    fullTranscriptRef.current = ''
    setIsProcessingCommand(false)
    setRecallMessage(null)
    pendingTextsRef.current = []
    extractingRef.current = false
    conversationIdRef.current = null
    lastTimestampRef.current = 0

    try {
      await connectStreaming()
    } catch {
      setStatus('idle')
    }
  }, [connectStreaming])

  /* ── load a saved conversation (enters paused state) ─── */

  const loadSaved = useCallback(
    (convo: { id: string; mindmap: MindMapData; transcript?: string }) => {
      cleanupStreaming()
      mindmapRef.current = convo.mindmap
      setMindmap(convo.mindmap)
      fullTranscriptRef.current = convo.transcript ?? ''
      setFullTranscript(convo.transcript ?? '')
      setCurrentTranscript('')
      setIsProcessingCommand(false)
      setRecallMessage(null)
      pendingTextsRef.current = []
      extractingRef.current = false
      conversationIdRef.current = convo.id
      setStatus('paused')
      console.log('[ToT] Loaded conversation:', convo.id)
    },
    [cleanupStreaming],
  )

  /* ── pause (stop streaming, keep mindmap) ────────────── */

  const pause = useCallback(async () => {
    // Capture thumbnail BEFORE cleaning up (SVG is still in DOM)
    let thumbnail: string | null = null
    if (mindmapRef.current.children.length > 0) {
      thumbnail = await captureThumbnail()
    }

    cleanupStreaming()
    setStatus('paused')
    setCurrentTranscript('')

    if (mindmapRef.current.children.length > 0) {
      const saved = saveConversation(
        mindmapRef.current,
        fullTranscriptRef.current,
        conversationIdRef.current ?? undefined,
        thumbnail ?? undefined,
      )
      conversationIdRef.current = saved.id
      console.log('[ToT] Auto-saved on pause:', saved.id)

      // Fire-and-forget: generate a killer AI title in the background
      generateAITitle(saved.id, mindmapRef.current).then(title => {
        if (title) {
          console.log('[ToT] AI title:', title)
          setRefreshCounter(c => c + 1)
        }
      })
    }

    console.log('[ToT] Session paused')
  }, [cleanupStreaming])

  /* ── resume (reconnect, keep mindmap) ────────────────── */

  const resume = useCallback(async () => {
    setCurrentTranscript('')
    pendingTextsRef.current = []
    extractingRef.current = false

    try {
      await connectStreaming()
      console.log('[ToT] Session resumed')
    } catch {
      setStatus('paused')
    }
  }, [connectStreaming])

  /* ── end (stop everything, save, reset) ──────────────── */

  const end = useCallback(async () => {
    // Capture thumbnail BEFORE cleaning up (SVG is still in DOM)
    let thumbnail: string | null = null
    if (mindmapRef.current.children.length > 0) {
      thumbnail = await captureThumbnail()
    }

    cleanupStreaming()

    if (mindmapRef.current.children.length > 0) {
      const saved = saveConversation(
        mindmapRef.current,
        fullTranscriptRef.current,
        conversationIdRef.current ?? undefined,
        thumbnail ?? undefined,
      )
      console.log('[ToT] Conversation saved:', saved.id, saved.title)

      // Fire-and-forget: generate a killer AI title in the background
      generateAITitle(saved.id, mindmapRef.current).then(title => {
        if (title) {
          console.log('[ToT] AI title:', title)
          // Bump refresh counter so the parent re-reads saved convos
          setRefreshCounter(c => c + 1)
        }
      })
    }

    setStatus('idle')
    setCurrentTranscript('')
    setFullTranscript('')
    fullTranscriptRef.current = ''
    setIsProcessingCommand(false)
    setRecallMessage(null)
    mindmapRef.current = EMPTY_MINDMAP
    setMindmap(EMPTY_MINDMAP)
    pendingTextsRef.current = []
    extractingRef.current = false
    conversationIdRef.current = null
    console.log('[ToT] Session ended')
  }, [cleanupStreaming])

  return {
    mindmap,
    currentTranscript,
    fullTranscript,
    status,
    isProcessingCommand,
    recallMessage,
    refreshCounter,
    dismissRecall,
    start,
    pause,
    resume,
    end,
    loadSaved,
  }
}
