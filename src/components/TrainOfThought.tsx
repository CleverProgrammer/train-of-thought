"use client";

import { useTranscription } from "@/hooks/useTranscription";
import MicButton from "./MicButton";
import MindMapView from "./MindMapView";

/**
 * Main client component that wires together:
 *  - Real-time transcription (AssemblyAI)
 *  - LLM extraction (GPT-4o-mini)
 *  - Mind map visualization (Markmap)
 */
export default function TrainOfThought() {
  const { mindmap, currentTranscript, isListening, start, stop } =
    useTranscription();

  const hasContent =
    mindmap.children.length > 0 || currentTranscript.trim() !== "";

  return (
    <div className="relative flex h-screen w-screen flex-col bg-gray-950 text-white overflow-hidden">
      {/* ── Mind map area ─────────────────────────────── */}
      <div className="flex-1 relative">
        {hasContent ? (
          <MindMapView mindmap={mindmap} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-3">
              <p className="text-5xl">🧠</p>
              <h1 className="text-2xl font-bold tracking-tight">
                Train of Thought
              </h1>
              <p className="text-sm text-gray-400 max-w-xs">
                Hit start and begin talking. Your ideas will appear as a mind
                map in real time — organized by topic.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Live transcript bar ──────────────────────── */}
      {isListening && currentTranscript.trim() && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 max-w-lg">
          <div className="rounded-full bg-gray-800/80 backdrop-blur px-5 py-2 text-sm text-gray-300 shadow-lg">
            {currentTranscript}
          </div>
        </div>
      )}

      {/* ── Controls ─────────────────────────────────── */}
      <div className="flex items-center justify-center py-6">
        <MicButton
          isListening={isListening}
          onToggle={isListening ? stop : start}
        />
      </div>
    </div>
  );
}
