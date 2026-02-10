"use client";

import { useState, useCallback } from "react";
import type { SessionStatus } from "@/hooks/useTranscription";

interface SessionControlsProps {
  status: SessionStatus;
  isDark: boolean;
  fullTranscript: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
}

/**
 * Session controls bar:
 *  - idle      → "Start talking"
 *  - listening → "Pause" + "Copy" + "End"
 *  - paused    → "Resume" + "Copy" + "End"
 */
export default function SessionControls({
  status,
  isDark,
  fullTranscript,
  onStart,
  onPause,
  onResume,
  onEnd,
}: SessionControlsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!fullTranscript) return;
    try {
      await navigator.clipboard.writeText(fullTranscript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("[ToT] Failed to copy transcript");
    }
  }, [fullTranscript]);

  if (status === "idle") {
    return (
      <button
        onClick={onStart}
        className={`
          flex items-center gap-2 rounded-full px-6 py-3
          text-sm font-semibold transition-all duration-200
          cursor-pointer select-none
          ${
            isDark
              ? "bg-white text-gray-900 shadow-md hover:bg-gray-100"
              : "bg-gray-900 text-white shadow-md hover:bg-gray-800"
          }
        `}
      >
        {/* Mic icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <rect x="9" y="1" width="6" height="14" rx="3" ry="3" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
        Start talking
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Pause / Resume button */}
      {status === "listening" ? (
        <button
          onClick={onPause}
          className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold
            bg-amber-500 text-white shadow-lg shadow-amber-500/30 hover:bg-amber-600
            transition-all duration-200 cursor-pointer select-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4"
          >
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
          Pause
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
          </span>
        </button>
      ) : (
        <button
          onClick={onResume}
          className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold
            bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600
            transition-all duration-200 cursor-pointer select-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4"
          >
            <polygon points="5,3 19,12 5,21" />
          </svg>
          Resume
        </button>
      )}

      {/* Copy transcript button */}
      {fullTranscript && (
        <button
          onClick={handleCopy}
          className={`flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold
            transition-all duration-200 cursor-pointer select-none ${
              copied
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                : isDark
                  ? "bg-gray-800 text-gray-300 hover:bg-gray-700 ring-1 ring-gray-700"
                  : "bg-white text-gray-700 hover:bg-gray-100 ring-1 ring-gray-200"
            }`}
        >
          {copied ? (
            // Checkmark icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            // Copy icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
          {copied ? "Copied!" : "Copy transcript"}
        </button>
      )}

      {/* End button */}
      <button
        onClick={onEnd}
        className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold
          bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600
          transition-all duration-200 cursor-pointer select-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-4 w-4"
        >
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
        End
      </button>
    </div>
  );
}
