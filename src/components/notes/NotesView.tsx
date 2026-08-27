import React, { useState } from "react";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { NoteItem } from "../../types";
import Markdown from "react-markdown";
import {
  FileText,
  Sparkles,
  Search,
  Star,
  Trash2,
  Copy,
  Check,
  Download,
  Plus,
  BookOpen,
  Tag,
  Clock,
  Layers,
  GraduationCap,
  Eye,
  Edit3,
} from "lucide-react";

export const NotesView: React.FC = () => {
  const { notes, saveNote, updateNote, deleteNote, toggleNoteFavorite } = useData();
  const { recordStudySession } = useAuth();

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(
    notes.length > 0 ? notes[0].id : null
  );
  const [showGenerateModal, setShowGenerateModal] = useState(notes.length === 0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("All");
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);

  // Generator Form State
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("Computer Science");
  const [academicLevel, setAcademicLevel] = useState("College / Undergraduate");
  const [formatStyle, setFormatStyle] = useState("Comprehensive Master Notes");
  const [keySubtopics, setKeySubtopics] = useState("");
  const [includeExamples, setIncludeExamples] = useState(true);
  const [includeMnemonics, setIncludeMnemonics] = useState(true);
  const [includeQuizCheck, setIncludeQuizCheck] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle Note Generation
  const handleGenerateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError("Please enter a topic.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const generated = await api.generateNotes({
        topic,
        subject,
        academicLevel,
        formatStyle,
        keySubtopics,
        includeExamples,
        includeMnemonics,
        includeQuizCheck,
      });

      const tags = [subject, academicLevel.split(" ")[0]].filter(Boolean);
      const saved = await saveNote(generated.topic, generated.subject, academicLevel, generated.content, tags);
      setSelectedNoteId(saved.id);
      setShowGenerateModal(false);
      setTopic("");
      setKeySubtopics("");
      recordStudySession(10);
    } catch (err: any) {
      console.error("Notes generation failed:", err);
      setError(err.message || "Failed to generate notes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Filter notes
  const subjectsList = ["All", ...Array.from(new Set(notes.map((n) => n.subject)))];

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubjectFilter === "All" || n.subject === selectedSubjectFilter;
    const matchesFav = !showOnlyFavorites || n.isFavorite;
    return matchesSearch && matchesSubject && matchesFav;
  });

  const activeNote = notes.find((n) => n.id === selectedNoteId) || (filteredNotes.length > 0 ? filteredNotes[0] : null);

  const handleCopyActiveNote = () => {
    if (!activeNote) return;
    navigator.clipboard.writeText(activeNote.content);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2000);
  };

  const handleExportMarkdown = () => {
    if (!activeNote) return;
    const blob = new Blob([activeNote.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeNote.topic.toLowerCase().replace(/\s+/g, "_")}_notes.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              AI Notes Generator
            </h1>
            <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
              Structured Revision
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Turn complex topics into structured, high-yield study sheets with key concepts and mnemonics.
          </p>
        </div>

        <button
          type="button"
          id="notes-btn-generate"
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-700"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Generate New Note</span>
        </button>
      </div>

      {/* Main Container: Split View (Sidebar list + Reader) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* Left List Pane (4 cols) */}
        <div className="lg:col-span-4 flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {/* Filters & Search */}
          <div className="p-3.5 border-b border-slate-200 space-y-2.5 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes by keyword..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:border-purple-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-purple-500 focus:outline-hidden"
              >
                {subjectsList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition ${
                  showOnlyFavorites
                    ? "bg-amber-100 text-amber-800"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Star className={`h-3 w-3 ${showOnlyFavorites ? "fill-amber-500 text-amber-500" : ""}`} />
                <span>Starred</span>
              </button>
            </div>
          </div>

          {/* Notes list */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {filteredNotes.length > 0 ? (
              filteredNotes.map((note) => {
                const isSelected = activeNote?.id === note.id;
                return (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNoteId(note.id)}
                    className={`group relative cursor-pointer rounded-xl p-3 text-xs transition border ${
                      isSelected
                        ? "border-purple-300 bg-purple-50/50 shadow-xs"
                        : "border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50/70"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-purple-700 text-[10px] bg-purple-100 px-1.5 py-0.2 rounded">
                        {note.subject}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleNoteFavorite(note.id);
                        }}
                        className="text-slate-300 hover:text-amber-500"
                      >
                        <Star
                          className={`h-3.5 w-3.5 ${
                            note.isFavorite ? "fill-amber-400 text-amber-400" : ""
                          }`}
                        />
                      </button>
                    </div>

                    <h4 className="font-bold text-slate-900 text-xs line-clamp-1">
                      {note.topic}
                    </h4>

                    <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {note.content.replace(/#|\*|_|`/g, "")}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-1.5">
                      <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNote(note.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition"
                        title="Delete note"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                <FileText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                No notes found matching your filter.
              </div>
            )}
          </div>
        </div>

        {/* Right Reader Pane (8 cols) */}
        <div className="lg:col-span-8 flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {activeNote ? (
            <>
              {/* Note Top Bar */}
              <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50/50 px-5 py-3 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                      {activeNote.subject}
                    </span>
                    <span className="text-xs text-slate-500">
                      {activeNote.academicLevel}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mt-1">
                    {activeNote.topic}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyActiveNote}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {copiedNote ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Markdown</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleExportMarkdown}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleNoteFavorite(activeNote.id)}
                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
                  >
                    <Star
                      className={`h-4 w-4 ${
                        activeNote.isFavorite ? "fill-amber-400 text-amber-400" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Note Content Display */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white">
                <div className="markdown-body prose prose-indigo max-w-none text-slate-800 text-sm leading-relaxed space-y-4">
                  <Markdown>{activeNote.content}</Markdown>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-12 text-center">
              <BookOpen className="h-12 w-12 text-purple-400" />
              <h3 className="mt-3 text-base font-bold text-slate-900">No Note Selected</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-xs">
                Select a revision note from the list or generate a new note using Gemini.
              </p>
              <button
                type="button"
                onClick={() => setShowGenerateModal(true)}
                className="mt-4 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-700"
              >
                Generate Revision Note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Generator Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Generate AI Revision Notes</h3>
                  <p className="text-xs text-slate-500">Gemini structures high-yield concepts, formulas and examples</p>
                </div>
              </div>
              {notes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  ✕
                </button>
              )}
            </div>

            <form onSubmit={handleGenerateNote} className="mt-4 space-y-4 text-xs">
              {error && (
                <div className="rounded-xl bg-rose-50 p-3 text-rose-700 border border-rose-200">
                  {error}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Topic or Concept to Master
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. SN1 vs SN2 Mechanisms, Quicksort Invariants, Photosynthesis Light Reactions"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Subject / Field
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Organic Chemistry, Computer Science, Economics"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Academic Level
                  </label>
                  <select
                    value={academicLevel}
                    onChange={(e) => setAcademicLevel(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-hidden"
                  >
                    <option value="High School">High School (AP / IB / Standard)</option>
                    <option value="College / Undergraduate">College / Undergraduate</option>
                    <option value="Graduate / Pre-Med / Advanced">Graduate / Pre-Med / Advanced</option>
                    <option value="Quick Review Cheat-sheet">Quick Revision Cheat-sheet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Specific Subtopics or Focus Areas (Optional)
                </label>
                <input
                  type="text"
                  value={keySubtopics}
                  onChange={(e) => setKeySubtopics(e.target.value)}
                  placeholder="e.g. Include carbocation stability, transition state diagrams, solvent effects"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                <span className="block font-semibold text-slate-700">Include in Notes:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeExamples}
                      onChange={(e) => setIncludeExamples(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-slate-700">Real Examples</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeMnemonics}
                      onChange={(e) => setIncludeMnemonics(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-slate-700">Mnemonics</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeQuizCheck}
                      onChange={(e) => setIncludeQuizCheck(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-slate-700">Self-Checks</span>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                {notes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-spin" />
                      <span>Synthesizing Notes with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Generate Notes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
