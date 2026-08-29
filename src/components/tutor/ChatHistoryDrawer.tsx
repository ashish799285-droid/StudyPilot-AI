import React, { useState } from "react";
import { ChatSession } from "../../types";
import {
  MessageSquare,
  Plus,
  Trash2,
  X,
  Search,
  BookOpen,
  Calendar,
  Sparkles,
  BotMessageSquare,
} from "lucide-react";
import { MishraJiAvatar } from "./MishraJiAvatar";

interface ChatHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
}

export const ChatHistoryDrawer: React.FC<ChatHistoryDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);

  if (!isOpen) return null;

  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.title && s.title.toLowerCase().includes(q)) ||
      (s.subject && s.subject.toLowerCase().includes(q)) ||
      s.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  });

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "Recent";
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getSessionEmoji = (title?: string, subject?: string) => {
    const text = `${title || ""} ${subject || ""}`.toLowerCase();
    if (text.includes("math") || text.includes("calc") || text.includes("algebra")) return "🧮";
    if (text.includes("bio") || text.includes("chem") || text.includes("physics")) return "🔬";
    if (text.includes("code") || text.includes("python") || text.includes("react") || text.includes("java")) return "💻";
    if (text.includes("history") || text.includes("lit") || text.includes("write") || text.includes("essay")) return "✍️";
    if (text.includes("exam") || text.includes("quiz") || text.includes("test")) return "🎯";
    if (text.includes("regression") || text.includes("data") || text.includes("ml") || text.includes("ai")) return "📊";
    return "📚";
  };

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden">
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
      />

      {/* Drawer Panel */}
      <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 animate-in slide-in-from-right sm:border-l border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div className="flex items-center gap-2.5">
            <MishraJiAvatar mood="idle" size="sm" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Study History with Mishra Ji</h2>
              <p className="text-[11px] text-slate-500">
                {sessions.length} {sessions.length === 1 ? "study session" : "study sessions"} saved
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onNewChat();
                onClose();
              }}
              className="flex items-center gap-1 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-700 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Chat</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              title="Close history"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations by topic or keywords..."
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-hidden shadow-2xs"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {filteredSessions.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center p-6 text-slate-400">
              <MessageSquare className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">No study sessions found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {searchQuery ? "Try a different search term" : "Start a new conversation with Mishra Ji"}
              </p>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isActive = activeSessionId === session.id;
              const emoji = getSessionEmoji(session.title, session.subject);
              const messageCount = session.messages ? session.messages.length : 0;
              const lastMessage = session.messages && session.messages.length > 0
                ? session.messages[session.messages.length - 1].content
                : "";

              return (
                <div
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session.id);
                    onClose();
                  }}
                  className={`group relative flex cursor-pointer items-start justify-between rounded-2xl p-3 text-left transition-all ${
                    isActive
                      ? "bg-sky-50/80 border border-sky-200 text-sky-950 shadow-2xs"
                      : "bg-white border border-slate-100 hover:border-sky-100 hover:bg-slate-50/80"
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1 pr-2">
                    <span className="text-base shrink-0 mt-0.5">{emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className={`text-xs truncate font-semibold ${isActive ? "text-sky-900" : "text-slate-800"}`}>
                          {session.title || "Study Session"}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                          {formatDate(session.updatedAt || session.createdAt)}
                        </span>
                      </div>

                      {lastMessage && (
                        <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">
                          {lastMessage}
                        </p>
                      )}

                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                          {session.subject || "General"}
                        </span>
                        <span>•</span>
                        <span>{messageCount} {messageCount === 1 ? "message" : "messages"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSessionToDelete(session);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
                    title="Delete conversation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-3 bg-slate-50/70 flex items-center justify-between text-[11px] text-slate-500">
          <span>StudyPilot • Mishra Ji AI Study Room</span>
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="font-semibold text-sky-600 hover:text-sky-700"
          >
            + Start Fresh Room
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Delete this conversation?
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Your study session &ldquo;{sessionToDelete.title}&rdquo; with Mishra Ji will be permanently removed.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteSession(sessionToDelete.id);
                  setSessionToDelete(null);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 shadow-xs transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
