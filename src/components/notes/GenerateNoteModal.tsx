import React, { useState } from "react";
import { api } from "../../services/api";
import { MishraJiAvatar } from "../tutor/MishraJiAvatar";
import {
  Sparkles,
  X,
  BookOpen,
  GraduationCap,
  Layers,
  Lightbulb,
  CheckCircle,
  HelpCircle,
  Brain,
  AlertCircle,
} from "lucide-react";

interface GenerateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNoteGenerated: (savedNote: any) => void;
  saveNote: (topic: string, subject: string, level: string, content: string, tags?: string[]) => Promise<any>;
}

export const GenerateNoteModal: React.FC<GenerateNoteModalProps> = ({
  isOpen,
  onClose,
  onNoteGenerated,
  saveNote,
}) => {
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("Computer Science");
  const [academicLevel, setAcademicLevel] = useState("College / Undergraduate");
  const [formatStyle, setFormatStyle] = useState("Comprehensive Master Module");
  const [keySubtopics, setKeySubtopics] = useState("");
  const [includeExamples, setIncludeExamples] = useState(true);
  const [includeMnemonics, setIncludeMnemonics] = useState(true);
  const [includeQuizCheck, setIncludeQuizCheck] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const subjects = [
    "Computer Science",
    "Mathematics",
    "Biology",
    "Physics",
    "Chemistry",
    "Economics & Finance",
    "History & Social Sciences",
    "Psychology & Neuroscience",
    "Literature & Philosophy",
    "General Studies",
  ];

  const levels = [
    "High School / AP",
    "College / Undergraduate",
    "Graduate / Advanced Research",
  ];

  const styles = [
    "Comprehensive Master Module",
    "High-Yield Exam Cram Sheet",
    "Formula, Derivations & Code Focus",
    "Intuitive Concept Primer & Analogies",
  ];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError("Please enter a topic or chapter to synthesize.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const generated = await api.generateNotes({
        topic: topic.trim(),
        subject,
        academicLevel,
        formatStyle,
        keySubtopics: keySubtopics.trim(),
        includeExamples,
        includeMnemonics,
        includeQuizCheck,
      });

      const tags = [subject, academicLevel.split(" ")[0]].filter(Boolean);
      const saved = await saveNote(
        generated.topic || topic.trim(),
        generated.subject || subject,
        academicLevel,
        generated.content,
        tags
      );

      onNoteGenerated(saved);
      onClose();
    } catch (err: any) {
      console.error("Failed to generate note:", err);
      setError(err?.message || "Failed to generate note with Mishra Ji. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 text-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-4 border-slate-100">
          <div className="flex items-center gap-3">
            <MishraJiAvatar mood={loading ? "thinking" : "focused"} size="md" />
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-bold text-slate-900">
                  New Study Module
                </h2>
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200">
                  Mishra Ji AI
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Mishra Ji will synthesize a structured, academic-grade revision module.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleGenerate} className="space-y-4">
          {/* Topic Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Topic or Concept to Master <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={loading}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Backpropagation in Neural Networks, Photosynthesis Calvin Cycle, Keynesian IS-LM Model"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Subject & Level Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Subject Field</label>
              <select
                disabled={loading}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-hidden"
              >
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Academic Depth</label>
              <select
                disabled={loading}
                value={academicLevel}
                onChange={(e) => setAcademicLevel(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-hidden"
              >
                {levels.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Format / Style */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Module Structure Style</label>
            <select
              disabled={loading}
              value={formatStyle}
              onChange={(e) => setFormatStyle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-hidden"
            >
              {styles.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Key Subtopics / Focus areas */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Specific Subtopics / Keywords <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              disabled={loading}
              value={keySubtopics}
              onChange={(e) => setKeySubtopics(e.target.value)}
              placeholder="e.g. Activation functions, vanishing gradient, cross-entropy loss derivation"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Enrichment Toggles */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Module Enhancements
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  disabled={loading}
                  checked={includeExamples}
                  onChange={(e) => setIncludeExamples(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Real Analogies</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  disabled={loading}
                  checked={includeMnemonics}
                  onChange={(e) => setIncludeMnemonics(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Mnemonics</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  disabled={loading}
                  checked={includeQuizCheck}
                  onChange={(e) => setIncludeQuizCheck(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Practice Check</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-confirm-generate-note"
              disabled={loading || !topic.trim()}
              className="flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-600/20 hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95"
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Mishra Ji is structuring notes...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Generate with Mishra Ji</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
