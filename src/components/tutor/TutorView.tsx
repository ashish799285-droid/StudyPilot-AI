import React, { useState, useRef, useEffect } from "react";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import { useEnvironment } from "../../context/EnvironmentContext";
import { api, ChatAttachmentPayload } from "../../services/api";
import StudyPilotContentRenderer from "../common/StudyPilotContentRenderer";
import {
  Send,
  Sparkles,
  Paperclip,
  Upload,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  FileCode,
  File,
  Copy,
  Check,
  Trash2,
  Plus,
  Volume2,
  VolumeX,
  BookOpen,
  ArrowDown,
  Layers,
} from "lucide-react";
import { parseUploadedDocument, AttachedDocument } from "../../utils/documentParser";
import { AttachmentPreviewList } from "./AttachmentPreviewList";
import { MishraJiAvatar, MishraJiMood } from "./MishraJiAvatar";
import { StudyRoomBackdrop, StudyRoomTime } from "./StudyRoomBackdrop";
import { TutorRoomHeader } from "./TutorRoomHeader";
import { ChatHistoryDrawer } from "./ChatHistoryDrawer";
import { StudyRoomEmptyState } from "./StudyRoomEmptyState";

interface TutorViewProps {
  initialPrompt?: string;
  initialSubject?: string;
  initialNoteContext?: any;
}

export const TutorView: React.FC<TutorViewProps> = ({
  initialPrompt,
  initialSubject,
  initialNoteContext,
}) => {
  const { user, recordStudySession } = useAuth();
  const {
    notes,
    chatSessions,
    activeSession,
    createChatSession,
    selectChatSession,
    addMessageToActiveSession,
    deleteChatSession,
    clearChatSession,
    updateChatSessionTitle,
  } = useData();

  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(initialSubject || "General");
  const [academicLevel, setAcademicLevel] = useState("Undergraduate");
  const [tutorTone, setTutorTone] = useState("Encouraging & Socratic");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Use Global Environmental Atmosphere & Desk Lamp state
  const {
    atmosphere,
    atmosphereMode,
    setAtmosphereMode,
    lampOn,
    setLampOn,
    toggleLamp,
  } = useEnvironment();

  // Convert global atmosphere to StudyRoomTime
  const timeOfDay: StudyRoomTime =
    atmosphere === "night"
      ? "night"
      : atmosphere === "sunset"
      ? "evening"
      : "morning";

  const isAutoTime = atmosphereMode === "auto";

  const setTimeOfDay = (t: StudyRoomTime) => {
    if (t === "morning" || t === "afternoon") {
      setAtmosphereMode("morning");
    } else if (t === "evening") {
      setAtmosphereMode("sunset");
    } else {
      setAtmosphereMode("night");
    }
  };

  const setIsAutoTime = (auto: boolean) => {
    if (auto) {
      setAtmosphereMode("auto");
    }
  };

  // Mishra Ji's dynamic mood
  const [mishraJiMood, setMishraJiMood] = useState<MishraJiMood>("idle");

  // First name extraction for natural personalization
  const studentFirstName = user?.name
    ? user.name.trim().replace(/^(mr\.|mrs\.|ms\.|dr\.|prof\.)\s+/i, "").split(/\s+/)[0]
    : "";

  // In-flight request ID ref to safely discard responses if chat is cleared while generating
  const activeRequestIdRef = useRef<number>(0);

  // Document Upload States
  const [attachments, setAttachments] = useState<AttachedDocument[]>([]);
  const [isDragging, setIsDragging] = useState(false);

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

  // Clean up any ongoing TTS synthesis on unmount
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Handle file selections
  const handleFilesSelected = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

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

    const messageText =
      text ||
      (readyAttachments.length > 0
        ? `Please analyze the attached study ${
            readyAttachments.length === 1 ? "document" : "documents"
          } and provide key takeaways, concepts, and a study summary.`
        : "");

    // Prepare clean attachment metadata for session history
    const attachmentMetadata = readyAttachments.map((a) => ({
      name: a.name || "Document",
      formattedSize: a.formattedSize || "0 KB",
      category: a.category || "other",
    }));

    // Ensure we have an active session or create a new one
    let currentSession = activeSession;
    const isFirstMessage = !currentSession || !currentSession.messages || currentSession.messages.length === 0;

    if (!currentSession) {
      currentSession = await createChatSession(
        selectedSubject,
        academicLevel,
        readyAttachments.length > 0
          ? `Study: ${readyAttachments[0].name.slice(0, 24)}`
          : messageText.length > 30
          ? messageText.slice(0, 30) + "..."
          : messageText
      );
    }

    const sessionId = currentSession.id;

    await addMessageToActiveSession(
      {
        role: "user",
        content: messageText,
        ...(attachmentMetadata.length > 0 ? { attachments: attachmentMetadata } : {}),
      },
      sessionId
    );

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
    setMishraJiMood("thinking");

    // If this was the first message in the session, automatically generate an intelligent chat title in the background
    if (isFirstMessage && messageText) {
      api.generateChatTitle(messageText, selectedSubject).then((generatedTitle) => {
        if (generatedTitle && generatedTitle.trim()) {
          updateChatSessionTitle(sessionId, generatedTitle.trim());
        }
      }).catch((err) => console.error("Could not auto-generate chat title:", err));
    }

    const reqId = ++activeRequestIdRef.current;

    try {
      // Build messages history payload from previous messages
      const history = [
        ...(currentSession?.messages || []).map((m) => ({
          role: m.role,
          content: m.content || "",
        })),
        { role: "user" as const, content: messageText },
      ];

      const reply = await api.sendChatMessage(
        history,
        academicLevel,
        selectedSubject,
        tutorTone,
        apiAttachments,
        user?.name || undefined,
        timeOfDay,
        initialNoteContext,
        notes
      );

      // Discard reply if user cleared the chat or started another request during generation
      if (activeRequestIdRef.current !== reqId) return;

      await addMessageToActiveSession(
        {
          role: "assistant",
          content: reply,
        },
        sessionId
      );

      setMishraJiMood("speaking");
      setTimeout(() => setMishraJiMood("idle"), 4000);

      // Award study minutes for active engagement
      await recordStudySession(5);
    } catch (err: any) {
      if (activeRequestIdRef.current !== reqId) return;
      console.error("Mishra Ji chat error:", err);
      setMishraJiMood("idle");
      try {
        await addMessageToActiveSession(
          {
            role: "assistant",
            content: `⚠️ ${
              err?.message ||
              "Mishra Ji is experiencing unusually high demand right now. Please try asking again in a moment."
            }`,
          },
          sessionId
        );
      } catch (saveErr) {
        console.error("Failed to save error response to session:", saveErr);
      }
    } finally {
      if (activeRequestIdRef.current === reqId) {
        setLoading(false);
      }
    }
  };

  const handleNewChat = async () => {
    // Abort any pending generation
    activeRequestIdRef.current++;
    setLoading(false);
    setMishraJiMood("idle");
    setAttachments([]);
    setInputMessage("");

    await createChatSession(selectedSubject, academicLevel, "New Study Session");
  };

  const handleConfirmClearChat = async () => {
    if (!activeSession) return;
    activeRequestIdRef.current++;
    setLoading(false);
    setMishraJiMood("idle");
    setShowClearConfirm(false);
    setAttachments([]);

    try {
      await clearChatSession(activeSession.id);
    } catch (err) {
      console.error("Failed to clear chat session:", err);
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

  // Browser SpeechSynthesis toggle for Mishra Ji's voice
  const handleToggleSpeak = (id: string, text: string) => {
    if (!("speechSynthesis" in window)) return;

    if (speakingMessageId === id) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      setMishraJiMood("idle");
      return;
    }

    window.speechSynthesis.cancel();
    setSpeakingMessageId(id);
    setMishraJiMood("speaking");

    // Strip markdown formatting for cleaner speech
    const cleanText = text
      .replace(/[*_#`~[\]]/g, "")
      .replace(/\(https?:\/\/[^\s)]+\)/g, "")
      .replace(/<[^>]*>/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(
      (v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha"))
    ) || voices.find((v) => v.lang.startsWith("en"));

    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onend = () => {
      setSpeakingMessageId(null);
      setMishraJiMood("idle");
    };

    utterance.onerror = () => {
      setSpeakingMessageId(null);
      setMishraJiMood("idle");
    };

    window.speechSynthesis.speak(utterance);
  };

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
      className="relative flex h-[calc(100vh-6.5rem)] flex-col rounded-3xl border border-slate-200/90 bg-white shadow-lg overflow-hidden transition-all"
    >
      {/* 1. Dynamic Study Room Environment Backdrop (Lighting, Bookshelf, Window, Lamp) */}
      <StudyRoomBackdrop
        timeOfDay={timeOfDay}
        lampOn={lampOn}
        onToggleLamp={toggleLamp}
      />

      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-indigo-950/85 p-6 text-white backdrop-blur-sm transition-all pointer-events-none">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/30 text-indigo-200 shadow-2xl animate-bounce border border-indigo-400/40">
            <Upload className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-xl font-bold">Drop Study Documents into Mishra Ji&apos;s Room</h3>
          <p className="mt-1 text-sm text-indigo-200">
            PDF, DOCX, PPTX, XLSX, TXT, Notes & Images supported
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

      {/* 2. Tutor Room Header */}
      <TutorRoomHeader
        mishraJiMood={mishraJiMood}
        timeOfDay={timeOfDay}
        setTimeOfDay={setTimeOfDay}
        isAutoTime={isAutoTime}
        setIsAutoTime={setIsAutoTime}
        lampOn={lampOn}
        setLampOn={setLampOn}
        toggleLamp={toggleLamp}
        onNewChat={handleNewChat}
        onOpenHistory={() => setShowHistoryDrawer(true)}
        onClearChat={() => setShowClearConfirm(true)}
        hasMessages={!!activeSession && activeSession.messages && activeSession.messages.length > 0}
        academicLevel={academicLevel}
        setAcademicLevel={setAcademicLevel}
        tutorTone={tutorTone}
        setTutorTone={setTutorTone}
        selectedSubject={selectedSubject}
        sessionTitle={activeSession?.title}
        totalConversationsCount={chatSessions.length}
      />

      {/* 3. Main Chat Stream */}
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          {!activeSession || !activeSession.messages || activeSession.messages.length === 0 ? (
            <StudyRoomEmptyState
              studentFirstName={studentFirstName}
              timeOfDay={timeOfDay}
              onSelectPrompt={handleSendMessage}
              onUploadClick={() => fileInputRef.current?.click()}
              loading={loading}
            />
          ) : (
            activeSession.messages.map((msg) => {
              const isUser = msg.role === "user";
              const isSpeaking = speakingMessageId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 sm:gap-3.5 ${isUser ? "justify-end" : "justify-start"} animate-in fade-in-50 duration-200`}
                >
                  {/* Left Avatar for Mishra Ji */}
                  {!isUser && (
                    <div className="shrink-0 mt-0.5">
                      <MishraJiAvatar
                        mood={isSpeaking ? "speaking" : "idle"}
                        size="md"
                      />
                    </div>
                  )}

                  <div
                    className={`relative group max-w-[90%] sm:max-w-[82%] rounded-3xl p-4 sm:p-5 text-sm leading-relaxed shadow-sm transition-all ${
                      isUser
                        ? "bg-indigo-600 text-white rounded-br-xs shadow-indigo-600/10"
                        : "bg-white/95 text-slate-800 border border-slate-200/90 rounded-tl-xs backdrop-blur-md shadow-slate-200/40"
                    }`}
                  >
                    {/* Header Label inside Mishra Ji Message */}
                    {!isUser && (
                      <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                          <span>Mishra Ji</span>
                          <span className="rounded-md bg-indigo-50 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-700">
                            StudyPilot Tutor
                          </span>
                        </div>

                        {/* Speech & Copy Action Buttons */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                          {"speechSynthesis" in window && (
                            <button
                              type="button"
                              onClick={() => handleToggleSpeak(msg.id, msg.content)}
                              className={`rounded-lg p-1 transition ${
                                isSpeaking
                                  ? "bg-indigo-100 text-indigo-700 animate-pulse"
                                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              }`}
                              title={isSpeaking ? "Stop voice" : "Read aloud with Mishra Ji's voice"}
                            >
                              {isSpeaking ? (
                                <VolumeX className="h-3.5 w-3.5" />
                              ) : (
                                <Volume2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                            title="Copy response"
                          >
                            {copiedMessageId === msg.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* User Attached Document Chips in Bubble */}
                    {isUser && msg.attachments && msg.attachments.length > 0 && (
                      <div className="mb-2.5 flex flex-wrap gap-1.5">
                        {msg.attachments.map((att, attIdx) => (
                          <div
                            key={attIdx}
                            className="flex items-center gap-1.5 rounded-lg bg-indigo-700/80 px-2.5 py-1 text-[11px] text-indigo-100 border border-indigo-500/40"
                          >
                            {getChatDocIcon(att.category)}
                            <span className="font-medium max-w-[180px] truncate" title={att.name}>
                              {att.name}
                            </span>
                            <span className="text-[9px] text-indigo-300 font-mono">
                              ({att.formattedSize})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Message Body */}
                    {isUser ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    ) : (
                      <div className="space-y-2 text-slate-800 text-sm leading-relaxed">
                        <StudyPilotContentRenderer content={msg.content} />
                      </div>
                    )}
                  </div>

                  {/* Right Avatar for User */}
                  {isUser && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-800 mt-0.5 font-bold text-xs shadow-xs border border-indigo-200">
                      {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Mishra Ji Thinking State */}
          {loading && (
            <div className="flex gap-3 justify-start animate-in fade-in-50">
              <div className="shrink-0 mt-0.5">
                <MishraJiAvatar mood="thinking" size="md" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-xs">
                <div className="flex gap-1">
                  <div className="h-2 w-2 rounded-full bg-sky-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="h-2 w-2 rounded-full bg-sky-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="h-2 w-2 rounded-full bg-sky-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="ml-1 text-xs font-semibold text-slate-600">
                  {attachments.length > 0
                    ? "Mishra Ji is analyzing your attached notes & synthesizing..."
                    : "Mishra Ji is thinking..."}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 4. Input Bar with Attachment Preview */}
        <div className="border-t border-slate-200/80 bg-white/95 backdrop-blur-md p-3 sm:p-4 transition-all">
          {/* Attachment Preview Chips */}
          <AttachmentPreviewList
            attachments={attachments}
            onRemove={handleRemoveAttachment}
            onClearAll={handleClearAttachments}
          />

          <div className="flex items-end gap-2 rounded-2xl border border-slate-300/80 bg-slate-50/60 p-2 focus-within:border-sky-500 focus-within:bg-white focus-within:ring-3 focus-within:ring-sky-100 transition-all shadow-xs">
            {/* Paperclip Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-sky-50 hover:text-sky-600 transition shrink-0"
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
                  ? "Ask Mishra Ji anything about your attached notes, or press Send..."
                  : `Ask Mishra Ji anything${studentFirstName ? `, ${studentFirstName}` : ""}, paste a homework problem, or drop study notes...`
              }
              rows={2}
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden leading-relaxed"
            />

            <button
              type="button"
              id="tutor-btn-send"
              disabled={(!inputMessage.trim() && attachments.filter((a) => a.status === "ready").length === 0) || loading}
              onClick={() => handleSendMessage()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white shadow-xs transition hover:bg-sky-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span className="truncate">
              {attachments.length > 0
                ? `${attachments.length} file(s) attached • Press Send to study with Mishra Ji`
                : "Shift+Enter for new line • Drag & drop PDFs, slides, or notes anytime"}
            </span>
            <span className="shrink-0 hidden sm:inline font-medium text-slate-500">
              StudyPilot Room • Mishra Ji AI
            </span>
          </div>
        </div>
      </div>

      {/* 5. Chat History Slide-Over Drawer */}
      <ChatHistoryDrawer
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        sessions={chatSessions}
        activeSessionId={activeSession?.id || null}
        onSelectSession={selectChatSession}
        onNewChat={handleNewChat}
        onDeleteSession={deleteChatSession}
      />

      {/* 6. Clear Chat Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Clear this study conversation?
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  All messages and Mishra Ji&apos;s responses in this study room will be cleared. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                id="btn-cancel-clear-chat"
                onClick={() => setShowClearConfirm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-clear-chat"
                onClick={handleConfirmClearChat}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-xs transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
