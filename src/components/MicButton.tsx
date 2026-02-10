"use client";

interface MicButtonProps {
  isListening: boolean;
  isDark: boolean;
  onToggle: () => void;
}

/**
 * A simple mic toggle button.
 * Red + pulsing when active, themed when idle.
 */
export default function MicButton({
  isListening,
  isDark,
  onToggle,
}: MicButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={`
        flex items-center gap-2 rounded-full px-6 py-3
        text-sm font-semibold transition-all duration-200
        cursor-pointer select-none
        ${
          isListening
            ? "bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600"
            : isDark
              ? "bg-white text-gray-900 shadow-md hover:bg-gray-100"
              : "bg-gray-900 text-white shadow-md hover:bg-gray-800"
        }
      `}
    >
      {/* Mic / Stop icon */}
      {isListening ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-5 w-5"
        >
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
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
      )}

      {isListening ? "Stop" : "Start talking"}

      {/* Pulsing dot when recording */}
      {isListening && (
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
        </span>
      )}
    </button>
  );
}
