"use client";

interface MicButtonProps {
  isListening: boolean;
  onToggle: () => void;
}

/**
 * A simple mic toggle button.
 * Red + pulsing when active, neutral when idle.
 */
export default function MicButton({ isListening, onToggle }: MicButtonProps) {
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
            : "bg-white text-gray-900 shadow-md hover:bg-gray-100"
        }
      `}
    >
      {/* Mic icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-5 w-5"
      >
        {isListening ? (
          // Stop icon (square)
          <rect x="6" y="6" width="12" height="12" rx="2" />
        ) : (
          // Mic icon
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Zm-1 14.93A7.006 7.006 0 0 1 5 9h2a5 5 0 0 0 10 0h2a7.006 7.006 0 0 1-6 6.93V20h4v2H7v-2h4v-4.07Z" />
        )}
      </svg>

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
