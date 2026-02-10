"use client";

import { useState } from "react";
import type { Conversation } from "@/lib/types";

interface SavedConversationsProps {
  conversations: Conversation[];
  isDark: boolean;
  onLoad: (convo: Conversation) => void;
  onDelete: (id: string) => void;
}

/** Format a timestamp as a friendly relative string. */
function timeAgo(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}


export default function SavedConversations({
  conversations,
  isDark,
  onLoad,
  onDelete,
}: SavedConversationsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (conversations.length === 0) return null;

  const handleCopyTranscript = async (
    e: React.MouseEvent,
    convo: Conversation
  ) => {
    e.stopPropagation();
    if (!convo.transcript) return;
    try {
      await navigator.clipboard.writeText(convo.transcript);
      setCopiedId(convo.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      console.error("[ToT] Failed to copy transcript");
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 px-4">
      <h2
        className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
          isDark ? "text-gray-500" : "text-gray-400"
        }`}
      >
        Continue a conversation
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {conversations.map((convo) => {
          const hasTranscript = !!convo.transcript;

          return (
            <button
              key={convo.id}
              onClick={() => onLoad(convo)}
              className={`group relative text-left rounded-xl overflow-hidden transition-all duration-150 cursor-pointer ${
                isDark
                  ? "bg-gray-900 hover:bg-gray-800 ring-1 ring-gray-800 hover:ring-gray-700"
                  : "bg-white hover:bg-gray-50 ring-1 ring-gray-200 hover:ring-gray-300 shadow-sm"
              }`}
            >
              {/* Thumbnail preview */}
              {convo.thumbnail && (
                <div
                  className={`w-full h-28 overflow-hidden ${
                    isDark ? "bg-gray-950" : "bg-gray-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={convo.thumbnail}
                    alt="Mind map preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              <div className="p-4">
                {/* Action buttons (top-right) */}
                <span className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {/* Copy transcript */}
                  {hasTranscript && (
                    <span
                      onClick={(e) => handleCopyTranscript(e, convo)}
                      className={`h-6 w-6 flex items-center justify-center rounded-full text-xs cursor-pointer ${
                        copiedId === convo.id
                          ? "bg-emerald-500/20 text-emerald-400"
                          : isDark
                            ? "bg-gray-900/80 hover:bg-gray-700 text-gray-500 hover:text-gray-300"
                            : "bg-white/80 hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                      }`}
                      title="Copy transcript"
                    >
                      {copiedId === convo.id ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-3 w-3"
                        >
                          <polyline points="20 6 9 17 4 12" />
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
                          className="h-3 w-3"
                        >
                          <rect
                            x="9"
                            y="9"
                            width="13"
                            height="13"
                            rx="2"
                            ry="2"
                          />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      )}
                    </span>
                  )}
                  {/* Delete */}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(convo.id);
                    }}
                    className={`h-6 w-6 flex items-center justify-center rounded-full text-xs cursor-pointer ${
                      isDark
                        ? "bg-gray-900/80 hover:bg-gray-700 text-gray-500 hover:text-gray-300"
                        : "bg-white/80 hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                    }`}
                    title="Delete conversation"
                  >
                    ✕
                  </span>
                </span>

                {/* Delete confirmation overlay */}
                {confirmDeleteId === convo.id && (
                  <div
                    className="absolute inset-0 z-20 flex items-center justify-center rounded-xl backdrop-blur-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      className={`text-center p-4 rounded-xl shadow-lg ${
                        isDark ? "bg-gray-900 ring-1 ring-gray-700" : "bg-white ring-1 ring-gray-200"
                      }`}
                    >
                      <p
                        className={`text-sm font-medium mb-3 ${
                          isDark ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        Delete this conversation?
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
                            isDark
                              ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(convo.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer bg-red-500 text-white hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Title */}
                <h3
                  className={`text-sm font-medium pr-14 leading-snug ${
                    isDark ? "text-gray-200" : "text-gray-800"
                  }`}
                >
                  {convo.title}
                </h3>

                {/* Timestamp */}
                <p
                  className={`text-xs mt-1 ${
                    isDark ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  {timeAgo(convo.updatedAt)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
