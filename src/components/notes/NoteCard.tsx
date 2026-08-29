import React from "react";
import { NoteItem } from "../../types";
import {
  BookOpen,
  Sparkles,
  Star,
  Clock,
  GraduationCap,
  ArrowRight,
  Trash2,
  Download,
  Share2,
} from "lucide-react";

interface NoteCardProps {
  note: NoteItem;
  onOpen: (note: NoteItem) => void;
  onAskMishraJi: (prompt: string, subject?: string, noteContext?: any) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onOpen,
  onAskMishraJi,
  onToggleFavorite,
  onDelete,
}) => {
  // Estimated reading time
  const wordCount = note.content.trim().split(/\s+/).filter(Boolean).length;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 180));

  // Extract snippet
  const snippet = note.content
    .replace(/^#+\s+.+$/gm, "")
    .replace(/[*_`]/g, "")
    .trim()
    .slice(0, 130);

  // Subject theme styling
  const getSubjectColor = (subject: string) => {
    const s = subject.toLowerCase();
    if (s.includes("math") || s.includes("calc") || s.includes("algebra") || s.includes("phys")) {
      return {
        spine: "bg-indigo-600",
        badge: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
        glow: "hover:border-indigo-300 hover:shadow-indigo-500/10",
      };
    }
    if (s.includes("bio") || s.includes("chem") || s.includes("med") || s.includes("anat")) {
      return {
        spine: "bg-emerald-600",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        glow: "hover:border-emerald-300 hover:shadow-emerald-500/10",
      };
    }
    if (s.includes("comp") || s.includes("code") || s.includes("data") || s.includes("ai")) {
      return {
        spine: "bg-sky-600",
        badge: "bg-sky-50 text-sky-700 border-sky-200/80",
        glow: "hover:border-sky-300 hover:shadow-sky-500/10",
      };
    }
    if (s.includes("hist") || s.includes("lit") || s.includes("phil") || s.includes("law")) {
      return {
        spine: "bg-amber-600",
        badge: "bg-amber-50 text-amber-700 border-amber-200/80",
        glow: "hover:border-amber-300 hover:shadow-amber-500/10",
      };
    }
    return {
      spine: "bg-cyan-600",
      badge: "bg-cyan-50 text-cyan-700 border-cyan-200/80",
      glow: "hover:border-cyan-300 hover:shadow-cyan-500/10",
    };
  };

  const colors = getSubjectColor(note.subject);

  return (
    <div
      onClick={() => onOpen(note)}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-pointer ${colors.glow}`}
    >
      {/* 1. Left Book Spine Accent */}
      <div className={`absolute top-0 bottom-0 left-0 w-2 sm:w-2.5 ${colors.spine}`} />

      {/* 2. Top Header & Subject Badges */}
      <div className="pl-5 sm:pl-6 p-5 sm:p-6 pb-2">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${colors.badge}`}
            >
              {note.subject}
            </span>
            {note.academicLevel && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {note.academicLevel.split(" ")[0]}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(note.id);
              }}
              className={`p-1.5 rounded-lg transition ${
                note.isFavorite
                  ? "text-amber-500 hover:bg-amber-50"
                  : "text-slate-300 hover:text-amber-400 hover:bg-slate-50"
              }`}
              title={note.isFavorite ? "Favorited" : "Favorite note"}
            >
              <Star className={`h-4 w-4 ${note.isFavorite ? "fill-amber-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Note Title */}
        <h3 className="text-base font-extrabold text-slate-900 line-clamp-2 leading-snug group-hover:text-sky-700 transition">
          {note.topic}
        </h3>

        {/* Snippet */}
        <p className="mt-2 text-xs text-slate-500 line-clamp-2 leading-relaxed">
          {snippet || "Comprehensive revision module with structured principles, formulas, and definitions."}
        </p>
      </div>

      {/* 3. Footer Metadata & Quick Actions */}
      <div className="pl-5 sm:pl-6 px-5 sm:px-6 pb-4 pt-3 border-t border-slate-100/90 mt-2 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-400" />
            <span>{readingTimeMin} min read</span>
          </div>
          <span>•</span>
          <span className="text-sky-700 font-semibold flex items-center gap-0.5">
            <Sparkles className="h-2.5 w-2.5 text-sky-500" />
            Mishra Ji
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(note);
            }}
            className="flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 group-hover:bg-sky-600 group-hover:text-white transition shadow-2xs"
          >
            <span>Read</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
