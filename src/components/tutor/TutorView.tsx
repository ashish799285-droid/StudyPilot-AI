import React, { useState, useRef, useEffect } from "react";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import { api, ChatAttachmentPayload } from "../../services/api";
import Markdown from "react-markdown";
import {
  Send,
  Sparkles,
  BotMessageSquare,
  User,
  Plus,
  Trash2,
  BookOpen,
  GraduationCap,
  RotateCcw,
  Lightbulb,
  CheckCircle2,
  Copy,
  Check,
  Zap,
  Paperclip,
  Upload,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  FileCode,
  File,
  X,
  AlertCircle,
} from "lucide-react";
import { parseUploadedDocument, AttachedDocument } from "../../utils/documentParser";
import { AttachmentPreviewList } from "./AttachmentPreviewList";

interface TutorViewProps {
  initialPrompt?: string;
  initialSubject?: string;
}

export const TutorView: React.FC<TutorViewProps> = ({
  initialPrompt,
  initialSubject,
}) => {
  const { user, recordStudySession } = useAuth();
  const {
    chatSessions,
    activeSession,
    createChatSession,
    selectChatSession,
    addMessageToActiveSession,
    deleteChatSession,
    clearChatSession,
  } = useData();

  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(initialSubject || "General");
  const [academicLevel, setAcademicLevel] = useState("Undergraduate");
  const [tutorTone, setTutorTone] = useState("Encouraging & Socratic");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Document Upload States
  const [attachments, setAttachments] = useState<AttachedDocument[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages, loading]);

  useEffect(() => {
    if (initialPrompt && (!activeSession || activeSession.messages.length === 0)) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  // Handle file selections
  const handleFilesSelected = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploadError(null);

    const fileArray = Array.from(files);

    // Initial placeholder items showing "parsing"
    const newItems: AttachedDocument[] = fileArray.map((file) => ({
      id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      file,
      name: file.name,
      size: file.size,
      formattedSize: `${Math.round(file.size / 1024)} KB`,
      extension: file.name.split(".").pop()?.toLowerCase() || "",
      category: "other",
      status: "parsing",
    }));

    setAttachments((prev) => [...prev, ...newItems]);

    // Parse all files concurrently
    const parsedResults = await Promise.all(
      fileArray.map((file) => parseUploadedDocument(file))
    );

    // Replace the temporary parsing items with the parsed results
    setAttachments((prev) => {
      const remaining = prev.filter(
        (p) => !newItems.some((n) => n.id === p.id)
      );
      return [...remaining, ...parsedResults];
    });
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleClearAttachments = () => {
    setAttachments([]);
    setUploadError(null);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    const readyAttachments = attachments.filter((a) => a.status === "ready");

    // Allow sending if either text exists OR ready attachments exist
    if ((!text && readyAttachments.length === 0) || loading) return;

    const messageText = text || (readyAttachments.length > 0
      ? `Please analyze the attached study ${readyAttachments.length === 1 ? "document" : "documents"} and provide key takeaways, concepts, and a study summary.`
      : "");

    // Prepare attachment metadata for session history
    const attachmentMetadata = readyAttachments.map((a) => ({
      name: a.name,
      formattedSize: a.formattedSize,
      category: a.category,
    }));

    // Ensure we have an active session
    let currentSession = activeSession;
    if (!currentSession) {
      currentSession = await createChatSession(
        selectedSubject,
        academicLevel,
        readyAttachments.length > 0
          ? `Study Session: ${readyAttachments[0].name}`
          : messageText
      );
    }

    await addMessageToActiveSession({
      role: "user",
      content: messageText,
      attachments: attachmentMetadata.length > 0 ? attachmentMetadata : undefined,
    });

    // Prepare API attachment payload
    const apiAttachments: ChatAttachmentPayload[] = readyAttachments.map((a) => ({
      name: a.name,
      category: a.category,
      isMultimodal: a.isMultimodal,
      mimeType: a.mimeType,
      base64: a.base64,
      textContent: a.textContent,
    }));

    // Reset input and clear attachments
    setInputMessage("");
    setAttachments([]);
    setLoading(true);

    try {
      // Build messages history payload
      const history = [
        ...(currentSession?.messages || []).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user" as const, content: messageText },
      ];

      const reply = await api.sendChatMessage(
        history,
        academicLevel,
        selectedSubject,
        tutorTone,
        apiAttachments
      );

      await addMessageToActiveSession({
        role: "assistant",
        content: reply,
      });

      // Award study minutes for engagement
      await recordStudySession(5);
    } catch (err: any) {
      console.error("AI Tutor chat error:", err);
      await addMessageToActiveSession({
        role: "assistant",
        content: `⚠️ ${err.message || "Gemini is experiencing unusually high demand right now. Please try again in a moment."}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const starterTopics = [
    { label: "Explain Feynman Technique", prompt: "Explain how I can use the Feynman Technique to study effectively for high-difficulty STEM exams." },
    { label: "Step-by-Step Math Walkthrough", prompt: "Can you walk me step-by-step through solving quadratic equations with complex roots?" },
    { label: "Document Synthesis & Summary", prompt: "Upload your syllabus, lecture slides, or reading notes to generate flashcards and a high-yield summary." },
    { label: "Memory Mnemonics", prompt: "What are the most effective memory mnemonics for memorizing amino acid structures and their chemical properties?" },
  ];

  const getChatDocIcon = (category?: string) => {
    switch (category) {
      case "pdf":
        return <FileText className="h-3.5 w-3.5 text-rose-300" />;
      case "word":
        return <FileText className="h-3.5 w-3.5 text-blue-300" />;
      case "spreadsheet":
        return <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-300" />;
      case "presentation":
        return <Presentation className="h-3.5 w-3.5 text-amber-300" />;
      case "image":
        return <ImageIcon className="h-3.5 w-3.5 text-purple-300" />;
      case "text":
        return <FileCode className="h-3.5 w-3.5 text-indigo-300" />;
      default:
        return <File className="h-3.5 w-3.5 text-slate-300" />;
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex h-[calc(100vh-6.5rem)] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden lg:flex-row"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-indigo-900/80 p-6 text-white backdrop-blur-xs transition-all pointer-events-none">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-white shadow-xl animate-bounce">
            <Upload className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-xl font-bold">Drop Study Documents Here</h3>
          <p className="mt-1 text-sm text-indigo-200">
            PDF, DOCX, PPTX, XLSX, TXT, RTF, ODT, Notes & Images supported
          </p>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.doc,.txt,.rtf,.csv,.xlsx,.xls,.pptx,.ppt,.odt,.ods,.odp,.md,.html,.json,.xml,.pages,.numbers,.key,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFilesSelected(e.target.files);
          e.target.value = "";
        }}
      />

      {/* 1. Left Conversation Sessions Sidebar */}
      <div className="hidden w-72 flex-col border-r border-slate-200 bg-slate-50/70 lg:flex">
        <div className="flex items-center justify-between border-b border-slate-200/80 p-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Study Conversations
          </span>
          <button
            type="button"
            onClick={() => createChatSession(selectedSubject, academicLevel)}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {chatSessions.map((session) => {
            const isActive = activeSession?.id === session.id;
            return (
              <div
                key={session.id}
                onClick={() => selectChatSession(session.id)}
                className={`group flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-xs transition-all ${
                  isActive
                    ? "bg-white text-indigo-900 font-semibold shadow-xs border border-indigo-100"
                    : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <BotMessageSquare
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <span className="truncate">{session.title || "Untitled Session"}</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChatSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition"
                  title="Delete chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Subject & Tutor Controls in Sidebar Footer */}
        <div className="border-t border-slate-200 bg-white p-3.5 space-y-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Academic Level
            </label>
            <select
              value={academicLevel}
              onChange={(e) => setAcademicLevel(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
            >
              <option value="High School">High School (Grades 9-12)</option>
              <option value="Undergraduate">College / Undergraduate</option>
              <option value="Graduate / Pre-Med">Graduate / Pre-Med / Advanced</option>
              <option value="Explain Like I am 5 (ELI5)">Simplified / ELI5 Intuitive</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Teaching Style
            </label>
            <select
              value={tutorTone}
              onChange={(e) => setTutorTone(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
            >
              <option value="Encouraging & Socratic">Socratic (Guides thinking)</option>
              <option value="Direct & Formulaic">Direct & Rigorous</option>
              <option value="Visual & Analogy Heavy">Analogy & Intuition First</option>
              <option value="Exam Strategy & Trap Spotter">Exam Strategy & Traps</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Main Chat Area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-white">
        {/* Top Chat Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <BotMessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  {activeSession?.title || "AI Study Tutor"}
                </h3>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                  Gemini Flash Grounded
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Tutor Level: {academicLevel} • Multi-format Document Analysis Enabled
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/60 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
              title="Attach study documents"
            >
              <Paperclip className="h-3.5 w-3.5" />
              <span>Attach Docs</span>
            </button>

            <button
              type="button"
              onClick={() => activeSession && clearChatSession(activeSession.id)}
              title="Clear messages in this chat"
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
            <button
              type="button"
              onClick={() => createChatSession(selectedSubject, academicLevel)}
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 lg:hidden transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/30">
          {!activeSession || activeSession.messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6 max-w-xl mx-auto">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200">
                <Sparkles className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900">
                What would you like to master today?
              </h2>
              <p className="mt-1 text-xs text-slate-500 max-w-md">
                Ask questions, paste homework problems, or attach your study documents (PDF, DOCX, PPTX, XLSX, Notes, Images) for AI tutoring.
              </p>

              {/* Upload Drop Callout */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 w-full cursor-pointer rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 p-4 transition hover:border-indigo-500 hover:bg-indigo-50 text-center shadow-2xs"
              >
                <div className="flex items-center justify-center gap-2 text-indigo-700 font-semibold text-xs">
                  <Upload className="h-4 w-4" />
                  <span>Click or drag & drop documents to study with Gemini</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Supports PDF, DOCX, PPTX, XLSX, RTF, TXT, Markdown & Images
                </p>
              </div>

              {/* Quick Prompt Cards */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
                {starterTopics.map((starter, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={loading}
                    onClick={() => handleSendMessage(starter.prompt)}
                    className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 transition hover:border-indigo-300 hover:bg-indigo-50/40 text-left shadow-2xs group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-xs font-bold text-indigo-700 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {starter.label}
                    </span>
                    <span className="mt-1 text-[11px] text-slate-500 line-clamp-2">
                      {starter.prompt}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            activeSession.messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs mt-0.5">
                      <BotMessageSquare className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`relative group max-w-[85%] rounded-2xl p-4 text-sm shadow-2xs leading-relaxed ${
                      isUser
                        ? "bg-indigo-600 text-white rounded-br-xs"
                        : "bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs"
                    }`}
                  >
                    {/* User Attached Document Chips in Bubble */}
                    {isUser && msg.attachments && msg.attachments.length > 0 && (
                      <div className="mb-2.5 flex flex-wrap gap-1.5">
                        {msg.attachments.map((att, attIdx) => (
                          <div
                            key={attIdx}
                            className="flex items-center gap-1.5 rounded-md bg-indigo-700/80 px-2 py-1 text-[11px] text-indigo-100 border border-indigo-500/50"
                          >
                            {getChatDocIcon(att.category)}
                            <span className="font-medium max-w-[160px] truncate" title={att.name}>
                              {att.name}
                            </span>
                            <span className="text-[9px] text-indigo-300 font-mono">
                              ({att.formattedSize})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="markdown-body space-y-2 text-slate-800 prose prose-indigo max-w-none text-sm">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    )}

                    {!isUser && (
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 rounded-md bg-slate-100 p-1 text-slate-500 hover:bg-slate-200 transition"
                        title="Copy response"
                      >
                        {copiedMessageId === msg.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {isUser && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700 mt-0.5 font-bold text-xs">
                      {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                <Sparkles className="h-4 w-4 animate-spin" />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
                <div className="h-2 w-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="h-2 w-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="h-2 w-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="ml-2 text-xs font-medium text-slate-500">
                  {attachments.length > 0 ? "Gemini is analyzing attached documents & synthesizing answer..." : "Gemini is reasoning & synthesizing..."}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar with Attachment Preview */}
        <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
          {/* Attachment Preview Chips */}
          <AttachmentPreviewList
            attachments={attachments}
            onRemove={handleRemoveAttachment}
            onClearAll={handleClearAttachments}
          />

          <div className="flex items-end gap-2 rounded-xl border border-slate-300 bg-slate-50/50 p-1.5 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 transition-all shadow-xs">
            {/* Paperclip Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition shrink-0"
              title="Attach PDF, Word, PowerPoint, Excel, or Text Document"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                attachments.length > 0
                  ? "Ask anything about the attached document(s), or press Send to generate a comprehensive study overview..."
                  : "Ask your AI tutor a question, paste homework text, or attach study documents (PDF, DOCX, PPTX, XLSX, Notes, Images)..."
              }
              rows={2}
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
            />

            <button
              type="button"
              id="tutor-btn-send"
              disabled={(!inputMessage.trim() && attachments.filter((a) => a.status === "ready").length === 0) || loading}
              onClick={() => handleSendMessage()}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span className="truncate">
              {attachments.length > 0
                ? `${attachments.length} file(s) attached • Drag & drop more or ask question`
                : "Attach PDFs, DOCX, PPTX, XLSX, TXT or drag & drop files • Shift+Enter for new line"}
            </span>
            <span className="shrink-0 hidden sm:inline">StudyPilot AI • Created by — Mishra Ji</span>
          </div>
        </div>
      </div>
    </div>
  );
};
