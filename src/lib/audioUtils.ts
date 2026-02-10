/**
 * Audio utilities for capturing microphone input
 * and converting it to PCM S16LE format for AssemblyAI.
 */

/** Convert Float32 audio samples to Int16 PCM (little-endian). */
export function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return int16
}

/** Sample rate we use for recording and streaming. */
export const SAMPLE_RATE = 16_000

/**
 * Start capturing microphone audio and send PCM chunks over a WebSocket.
 *
 * Returns a cleanup function that stops the mic and audio processing.
 */
export async function startMicStream(ws: WebSocket): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      sampleRate: SAMPLE_RATE,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
    },
  })

  const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE })
  const source = audioContext.createMediaStreamSource(stream)

  // ScriptProcessorNode is deprecated but simple; fine for v0.
  const processor = audioContext.createScriptProcessor(2048, 1, 1)

  source.connect(processor)
  processor.connect(audioContext.destination)

  processor.onaudioprocess = e => {
    if (ws.readyState !== WebSocket.OPEN) return
    const float32 = e.inputBuffer.getChannelData(0)
    const int16 = float32ToInt16(float32)
    ws.send(int16.buffer)
  }

  // Return cleanup function
  return () => {
    processor.disconnect()
    source.disconnect()
    audioContext.close()
    stream.getTracks().forEach(track => track.stop())
  }
}
