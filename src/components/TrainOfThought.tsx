"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranscription } from "@/hooks/useTranscription";
import SessionControls from "./SessionControls";
import MindMapView from "./MindMapView";
import ThemeToggle from "./ThemeToggle";
import SavedConversations from "./SavedConversations";
import {
  listConversations,
  deleteConversation,
} from "@/lib/storage";
import type { Conversation } from "@/lib/types";

/**
 * Main client component that wires together:
 *  - Real-time transcription (AssemblyAI)
 *  - LLM extraction (Claude)
 *  - Poppy command mode (wake word → AI commands)
 *  - Mind map visualization (Markmap)
 *  - Conversation persistence (localStorage)
 */
export default function TrainOfThought() {
  const {
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
  } = useTranscription();

  const [isDark, setIsDark] = useState(false);
  const [savedConvos, setSavedConvos] = useState<Conversation[]>([]);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  // Load saved conversations on mount, when returning to idle, or when AI title updates
  useEffect(() => {
    if (status === "idle") {
      setSavedConvos(listConversations());
    }
  }, [status, refreshCounter]);

  const handleLoadConvo = useCallback(
    (convo: Conversation) => {
      loadSaved(convo);
    },
    [loadSaved]
  );

  const handleDeleteConvo = useCallback((id: string) => {
    deleteConversation(id);
    setSavedConvos(listConversations());
  }, []);

  const isListening = status === "listening";
  const isPaused = status === "paused";
  const isIdle = status === "idle";
  const hasContent =
    mindmap.children.length > 0 || currentTranscript.trim() !== "";

  return (
    <div
      className={`relative flex h-screen w-screen flex-col overflow-hidden transition-colors duration-300 ${
        isDark ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* ── Theme toggle ────────────────────────────────── */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
      </div>

      {/* ── Poppy command indicator ──────────────────── */}
      {isProcessingCommand && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 rounded-full bg-violet-600/90 backdrop-blur px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/25 animate-pulse">
            <span className="text-base">🐾</span>
            <span>Poppy is thinking…</span>
          </div>
        </div>
      )}

      {/* ── Paused indicator ─────────────────────────── */}
      {isPaused && !isProcessingCommand && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
          <div
            className={`flex items-center gap-2 rounded-full backdrop-blur px-4 py-2 text-sm font-medium shadow-lg ${
              isDark
                ? "bg-amber-500/20 text-amber-300"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            <span className="text-base">⏸</span>
            <span>Paused</span>
          </div>
        </div>
      )}

      {/* ── Recall toast ────────────────────────────── */}
      {recallMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4">
          <div
            className={`relative rounded-2xl backdrop-blur px-5 py-4 shadow-xl transition-all ${
              isDark
                ? "bg-blue-950/90 ring-1 ring-blue-800/50 text-blue-100"
                : "bg-blue-50/95 ring-1 ring-blue-200 text-blue-900"
            }`}
          >
            <button
              onClick={dismissRecall}
              className={`absolute top-2 right-3 text-xs cursor-pointer ${
                isDark
                  ? "text-blue-400 hover:text-blue-200"
                  : "text-blue-400 hover:text-blue-600"
              }`}
            >
              ✕
            </button>
            <p className="text-sm leading-relaxed pr-4">{recallMessage}</p>
          </div>
        </div>
      )}

      {/* ── Mind map area / Home screen ───────────────── */}
      <div className="flex-1 relative overflow-y-auto">
        {hasContent ? (
          <MindMapView mindmap={mindmap} isDark={isDark} />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-full py-12">
            <div className="text-center space-y-3">
              <p className="text-5xl">🧠</p>
              <h1 className="text-2xl font-bold tracking-tight">
                Train of Thought
              </h1>
              <p
                className={`text-sm max-w-xs ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Hit start and begin talking. Your ideas will appear as a mind
                map in real time — organized by topic.
              </p>
              <p
                className={`text-xs max-w-xs mt-2 ${
                  isDark ? "text-gray-500" : "text-gray-400"
                }`}
              >
                Say{" "}
                <span className="text-violet-500 font-semibold">
                  &quot;Poppy&quot;
                </span>{" "}
                to ask questions or give commands.
              </p>
            </div>

            {/* ── Saved conversations grid ─────────────── */}
            {isIdle && (
              <SavedConversations
                conversations={savedConvos}
                isDark={isDark}
                onLoad={handleLoadConvo}
                onDelete={handleDeleteConvo}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Live transcript bar ──────────────────────── */}
      {isListening && currentTranscript.trim() && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 max-w-lg">
          <div
            className={`rounded-full backdrop-blur px-5 py-2 text-sm shadow-lg ${
              currentTranscript.toLowerCase().includes("poppy")
                ? "bg-violet-800/80 text-violet-100 ring-1 ring-violet-400/50"
                : isDark
                  ? "bg-gray-800/80 text-gray-300"
                  : "bg-white/80 text-gray-700 ring-1 ring-gray-200"
            }`}
          >
            {currentTranscript}
          </div>
        </div>
      )}

      {/* ── Controls ─────────────────────────────────── */}
      <div className="flex items-center justify-center py-6">
        <SessionControls
          status={status}
          isDark={isDark}
          fullTranscript={fullTranscript}
          onStart={start}
          onPause={pause}
          onResume={resume}
          onEnd={end}
        />
      </div>
    </div>
  );
}
