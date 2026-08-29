import React, { useState, useMemo } from "react";
import { NoteItem } from "../../types";
import StudyPilotContentRenderer from "../common/StudyPilotContentRenderer";
import { MishraJiAvatar } from "../tutor/MishraJiAvatar";
import {
  exportAsMarkdown,
  exportAsPlainText,
  exportAsHTML,
  printOrSaveAsPDF,
} from "./NoteExportUtils";
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  Download,
  Copy,
  Check,
  Star,
  Trash2,
  Share2,
  Maximize2,
  Minimize2,
  FileText,
  Clock,
  Layers,
  GraduationCap,
  List,
  Type,
  ChevronDown,
  Calendar,
  Brain,
  Zap,
  Bookmark,
  ExternalLink,
} from "lucide-react";

interface DigitalNoteReaderProps {
  note: NoteItem;
  onBack: () => void;
  onAskMishraJi: (prompt: string, subject?: string, noteContext?: any) => void;
  onGenerateCards?: (note: NoteItem) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

type ReaderTheme = "academic" | "warm" | "slate";
type FontSize = "sm" | "base" | "lg" | "xl";

export const DigitalNoteReader: React.FC<DigitalNoteReaderProps> = ({
  note,
  onBack,
  onAskMishraJi,
  onGenerateCards,
  onToggleFavorite,
  onDelete,
}) => {
  const [copied, setCopied] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>("academic");
  const [fontSize, setFontSize] = useState<FontSize>("base");
  const [showToc, setShowToc] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showAskPromptModal, setShowAskPromptModal] = useState(false);
  const [customQuestion, setCustomQuestion] = useState("");

  // Calculate statistics
  const wordCount = useMemo(() => {
    return note.content.trim().split(/\s+/).filter(Boolean).length;
  }, [note.content]);

  const readingTimeMin = useMemo(() => {
    return Math.max(1, Math.ceil(wordCount / 180));
  }, [wordCount]);

  // Extract headings for Table of Contents
  const tableOfContents = useMemo(() => {
    const lines = note.content.split("\n");
    const headings: { text: string; level: number; id: string }[] = [];
    lines.forEach((line) => {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        headings.push({ text, level, id });
      }
    });
    return headings;
  }, [note.content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(note.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickAsk = (type: "explain" | "quiz" | "summary" | "mnemonic" | "custom") => {
    let prompt = "";
    switch (type) {
      case "explain":
        prompt = `Hey Mishra Ji, I'm reviewing my study module on "${note.topic}" (${note.subject}). Can you break down the most complex intuition and core principles in this note with a vivid real-world analogy?`;
        break;
      case "quiz":
        prompt = `Hey Mishra Ji, can you test my mastery of "${note.topic}" with 3 challenging active-recall questions based directly on these study notes?`;
        break;
      case "summary":
        prompt = `Hey Mishra Ji, could you provide a high-yield "cheat sheet" summary and top 5 key takeaways for "${note.topic}" from my revision notes?`;
        break;
      case "mnemonic":
        prompt = `Hey Mishra Ji, what are some creative and memorable mnemonics to help me remember the key formulas, definitions, and concepts in this "${note.topic}" module?`;
        break;
      case "custom":
        if (!customQuestion.trim()) return;
        prompt = `Regarding my revision notes on "${note.topic}": ${customQuestion.trim()}`;
        break;
    }

    setShowAskPromptModal(false);
    onAskMishraJi(prompt, note.subject, note);
  };

  const getThemeStyles = () => {
    switch (readerTheme) {
      case "warm":
        return {
          wrapper: "bg-[#fcf8f2] text-[#2c2416]",
          card: "bg-[#fffdf9] border-[#e8dfcf] shadow-sm",
          headerBorder: "border-[#ede4d5]",
          toc: "bg-[#f7f2e7] border-[#e8dfcf] text-[#4a3f2c]",
          codeBlock: "bg-[#f2ece0] text-[#362e1e]",
          accentPill: "bg-[#edd6b6] text-[#633a00]",
        };
      case "slate":
        return {
          wrapper: "bg-slate-950 text-slate-100",
          card: "bg-slate-900 border-slate-800 shadow-xl",
          headerBorder: "border-slate-800",
          toc: "bg-slate-900/90 border-slate-800 text-slate-300",
          codeBlock: "bg-slate-950 text-slate-200",
          accentPill: "bg-sky-950 text-sky-300 border border-sky-800/60",
        };
      case "academic":
      default:
        return {
          wrapper: "bg-gradient-to-b from-sky-50/40 via-slate-50 to-slate-50 text-slate-900",
          card: "bg-white border-sky-100/80 shadow-md",
          headerBorder: "border-sky-100",
          toc: "bg-sky-50/60 border-sky-200/70 text-sky-950",
          codeBlock: "bg-slate-900 text-slate-100",
          accentPill: "bg-sky-100/90 text-sky-800 border border-sky-200",
        };
    }
  };

  const themeStyles = getThemeStyles();

  const getFontSizeClass = () => {
    switch (fontSize) {
      case "sm":
        return "text-xs sm:text-sm leading-relaxed";
      case "lg":
        return "text-base sm:text-lg leading-relaxed";
      case "xl":
        return "text-lg sm:text-xl leading-relaxed";
      case "base":
      default:
        return "text-sm sm:text-base leading-relaxed";
    }
  };

  return (
    <div
      className={`min-h-[calc(100vh-8rem)] rounded-3xl p-4 sm:p-8 transition-colors duration-200 ${themeStyles.wrapper}`}
    >
      {/* 1. Reader Navigation Top Bar */}
      <div className="mx-auto max-w-5xl mb-6 flex flex-wrap items-center justify-between gap-3 border-b pb-4 border-slate-200/80">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white/90 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Library Shelf</span>
        </button>

        {/* Reader Customization Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Font Size Selector */}
          <div className="flex items-center rounded-xl border border-slate-200/90 bg-white/90 p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setFontSize("sm")}
              className={`px-2 py-1 text-[11px] font-bold rounded-lg transition ${
                fontSize === "sm" ? "bg-sky-500 text-white shadow-2xs" : "text-slate-600 hover:bg-slate-100"
              }`}
              title="Small text"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setFontSize("base")}
              className={`px-2 py-1 text-xs font-bold rounded-lg transition ${
                fontSize === "base" ? "bg-sky-500 text-white shadow-2xs" : "text-slate-600 hover:bg-slate-100"
              }`}
              title="Medium text"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setFontSize("lg")}
              className={`px-2 py-1 text-xs font-bold rounded-lg transition ${
                fontSize === "lg" ? "bg-sky-500 text-white shadow-2xs" : "text-slate-600 hover:bg-slate-100"
              }`}
              title="Large text"
            >
              A+
            </button>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center rounded-xl border border-slate-200/90 bg-white/90 p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setReaderTheme("academic")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                readerTheme === "academic"
                  ? "bg-sky-600 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Academic Sky
            </button>
            <button
              type="button"
              onClick={() => setReaderTheme("warm")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                readerTheme === "warm"
                  ? "bg-amber-700 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Parchment
            </button>
            <button
              type="button"
              onClick={() => setReaderTheme("slate")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                readerTheme === "slate"
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Dark Slate
            </button>
          </div>

          {/* Focus Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsFocusMode(!isFocusMode)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition shadow-2xs ${
              isFocusMode
                ? "bg-sky-600 text-white border-sky-600"
                : "border-slate-200/90 bg-white/90 text-slate-700 hover:bg-slate-100"
            }`}
            title="Focus mode (hide sidebars & distraction)"
          >
            {isFocusMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isFocusMode ? "Exit Focus" : "Focus Mode"}</span>
          </button>
        </div>
      </div>

      {/* 2. Main Reader Grid Container */}
      <div className={`mx-auto max-w-5xl ${isFocusMode ? "max-w-4xl" : "grid grid-cols-1 lg:grid-cols-12 gap-8"}`}>
        {/* Table of Contents Side Panel (Desktop) */}
        {!isFocusMode && tableOfContents.length > 0 && showToc && (
          <aside className="lg:col-span-3 space-y-4">
            <div
              className={`sticky top-6 rounded-2xl p-4 border backdrop-blur-md shadow-xs ${themeStyles.toc}`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-current/10">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <List className="h-3.5 w-3.5 text-sky-600" />
                  <span>Document Outline</span>
                </div>
                <span className="text-[10px] font-semibold opacity-70">
                  {tableOfContents.length} Sections
                </span>
              </div>

              <nav className="mt-3 max-h-[65vh] overflow-y-auto space-y-1 text-xs">
                {tableOfContents.map((h, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(h.id);
                      if (el) {
                        el.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    style={{ paddingLeft: `${(h.level - 1) * 12 + 8}px` }}
                    className="w-full text-left py-1.5 pr-2 rounded-lg font-medium hover:bg-sky-500/10 transition truncate text-current opacity-80 hover:opacity-100"
                    title={h.text}
                  >
                    {h.text}
                  </button>
                ))}
              </nav>

              {/* Mini Mishra Ji Prompt Launcher */}
              <div className="mt-4 pt-3 border-t border-current/10 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowAskPromptModal(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white px-3 py-2 text-xs font-bold shadow-xs transition active:scale-95"
                >
                  <Sparkles className="h-3.5 w-3.5 text-sky-200" />
                  <span>Ask Mishra Ji</span>
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Main Document Body */}
        <article
          className={`${
            !isFocusMode && tableOfContents.length > 0 && showToc ? "lg:col-span-9" : "col-span-12"
          } rounded-3xl border p-6 sm:p-12 transition-all ${themeStyles.card}`}
        >
          {/* Header Brand Section */}
          <header className={`border-b pb-6 mb-8 ${themeStyles.headerBorder}`}>
            {/* Top Brand Banner: StudyPilot + Created by Mishra Ji */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-md shadow-sky-500/20 font-black">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black tracking-wider uppercase text-sky-600">
                      StudyPilot
                    </span>
                    <span className="text-xs text-slate-300">•</span>
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200/60">
                      Revision Module
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mt-0.5">
                    <span>Created by</span>
                    <span className="text-sky-700 font-extrabold flex items-center gap-1">
                      Mishra Ji
                      <Sparkles className="h-3 w-3 text-sky-500 inline" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Ask Mishra Ji CTA */}
                <button
                  type="button"
                  id="reader-btn-ask-mishraji"
                  onClick={() => setShowAskPromptModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-700 transition active:scale-95"
                >
                  <Sparkles className="h-3.5 w-3.5 text-sky-200" />
                  <span>Ask Mishra Ji</span>
                </button>

                {/* Generate Flashcards */}
                {onGenerateCards && (
                  <button
                    type="button"
                    onClick={() => onGenerateCards(note)}
                    className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
                    title="Generate revision flashcards from this note"
                  >
                    <Brain className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Make Flashcards</span>
                  </button>
                )}

                {/* Favorite Toggle */}
                <button
                  type="button"
                  onClick={() => onToggleFavorite(note.id)}
                  className={`rounded-xl border p-2 transition shadow-2xs ${
                    note.isFavorite
                      ? "border-amber-300 bg-amber-50 text-amber-500 hover:bg-amber-100"
                      : "border-slate-200/80 bg-white text-slate-400 hover:text-amber-500 hover:bg-slate-50"
                  }`}
                  title={note.isFavorite ? "Remove favorite" : "Mark as favorite"}
                >
                  <Star className={`h-4 w-4 ${note.isFavorite ? "fill-amber-400" : ""}`} />
                </button>

                {/* Copy Note */}
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 rounded-xl border border-slate-200/80 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
                  title="Copy full note content"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span className="hidden md:inline">{copied ? "Copied!" : "Copy"}</span>
                </button>

                {/* Download Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    id="reader-btn-download-menu"
                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export</span>
                    <ChevronDown className="h-3 w-3 text-slate-400" />
                  </button>

                  {showDownloadMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl z-30 animate-in fade-in-50 text-slate-800 space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          printOrSaveAsPDF(note);
                          setShowDownloadMenu(false);
                        }}
                        className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition"
                      >
                        <FileText className="h-3.5 w-3.5 text-rose-500" />
                        <span>Print / Save as PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          exportAsMarkdown(note);
                          setShowDownloadMenu(false);
                        }}
                        className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition"
                      >
                        <FileText className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Markdown (.md)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          exportAsHTML(note);
                          setShowDownloadMenu(false);
                        }}
                        className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition"
                      >
                        <FileText className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Web HTML Document</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          exportAsPlainText(note);
                          setShowDownloadMenu(false);
                        }}
                        className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition"
                      >
                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                        <span>Plain Text (.txt)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Delete Note */}
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-xl border border-rose-200 bg-rose-50/50 p-2 text-rose-600 hover:bg-rose-100 transition shadow-2xs"
                  title="Delete this revision note"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Note Title */}
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-current mt-2 mb-4 leading-snug">
              {note.topic}
            </h1>

            {/* Metadata Bar */}
            <div className="flex flex-wrap items-center gap-3 text-xs opacity-75">
              <span className={`rounded-full px-3 py-1 font-bold ${themeStyles.accentPill}`}>
                {note.subject}
              </span>
              <div className="flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5" />
                <span>{note.academicLevel || "Undergraduate"}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{readingTimeMin} min read ({wordCount} words)</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{new Date(note.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
            </div>
          </header>

          {/* Markdown Content Section */}
          <main className={`prose max-w-none ${getFontSizeClass()}`}>
            <div className="space-y-4">
              <StudyPilotContentRenderer
                content={note.content}
                academicTheme="reader"
              />
            </div>
          </main>

          {/* Bottom Review & Active Engagement Footer */}
          <footer className="mt-12 pt-8 border-t border-current/10 space-y-4">
            <div className="rounded-2xl bg-sky-500/10 border border-sky-500/20 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-left">
                <MishraJiAvatar mood="speaking" size="md" />
                <div>
                  <h4 className="text-sm font-extrabold text-sky-900">
                    Ready to test your retention with Mishra Ji?
                  </h4>
                  <p className="text-xs text-sky-700 mt-0.5">
                    Ask Mishra Ji to quiz you, break down a formula, or generate real-world practice examples.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAskPromptModal(true)}
                className="shrink-0 flex items-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 text-xs font-bold shadow-md transition active:scale-95"
              >
                <Sparkles className="h-4 w-4" />
                <span>Study with Mishra Ji</span>
              </button>
            </div>
          </footer>
        </article>
      </div>

      {/* 3. Ask Mishra Ji Prompt Launcher Modal */}
      {showAskPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-5 text-slate-900">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <MishraJiAvatar mood="focused" size="md" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Study with Mishra Ji
                  </h3>
                  <p className="text-xs text-slate-500">
                    Active Note: <strong className="text-sky-600 font-semibold">{note.topic}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAskPromptModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Quick Action Pills */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Choose a study mode:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickAsk("explain")}
                  className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-left hover:bg-amber-100/70 transition"
                >
                  <Zap className="h-4 w-4 text-amber-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-amber-900">Intuitive Explanation</div>
                    <div className="text-[10px] text-amber-700">Analogy & concept breakdown</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickAsk("quiz")}
                  className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-left hover:bg-rose-100/70 transition"
                >
                  <Brain className="h-4 w-4 text-rose-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-rose-900">Diagnostic Mini-Quiz</div>
                    <div className="text-[10px] text-rose-700">3 active-recall questions</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickAsk("summary")}
                  className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-left hover:bg-sky-100/70 transition"
                >
                  <FileText className="h-4 w-4 text-sky-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-sky-900">High-Yield Cheat Sheet</div>
                    <div className="text-[10px] text-sky-700">Key takeaways & formulas</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickAsk("mnemonic")}
                  className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-left hover:bg-emerald-100/70 transition"
                >
                  <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-emerald-900">Memory Mnemonics</div>
                    <div className="text-[10px] text-emerald-700">Retention tricks & acronyms</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Custom Question Input */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700">
                Or ask a specific question:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="e.g., Can you explain the derivation in section 3?"
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-hidden"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customQuestion.trim()) {
                      handleQuickAsk("custom");
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={!customQuestion.trim()}
                  onClick={() => handleQuickAsk("custom")}
                  className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-40 transition"
                >
                  Ask
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 text-slate-900">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete this study module?
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  &ldquo;{note.topic}&rdquo; will be removed from your digital library. This cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(note.id);
                  setShowDeleteConfirm(false);
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-xs transition"
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
