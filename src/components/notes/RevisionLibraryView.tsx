import React, { useState, useMemo } from "react";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import { NoteItem } from "../../types";
import { NoteCard } from "./NoteCard";
import { DigitalNoteReader } from "./DigitalNoteReader";
import { GenerateNoteModal } from "./GenerateNoteModal";
import { GenerateCardsModal } from "../revision/GenerateCardsModal";
import { MishraJiAvatar } from "../tutor/MishraJiAvatar";
import { StudyPilotEnvironment } from "../common/StudyPilotEnvironment";
import {
  Library,
  BookOpen,
  Sparkles,
  Search,
  Star,
  Plus,
  Filter,
  ArrowUpDown,
  Layers,
  GraduationCap,
  Clock,
  BookMarked,
  FolderOpen,
} from "lucide-react";

interface RevisionLibraryViewProps {
  onAskMishraJi?: (prompt: string, subject?: string, noteContext?: any) => void;
}

export const RevisionLibraryView: React.FC<RevisionLibraryViewProps> = ({ onAskMishraJi }) => {
  const { notes, saveNote, updateNote, deleteNote, toggleNoteFavorite } = useData();
  const { recordStudySession, user } = useAuth();

  const [activeReadingNoteId, setActiveReadingNoteId] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showFlashcardsModal, setShowFlashcardsModal] = useState(false);
  const [selectedNoteForCards, setSelectedNoteForCards] = useState<NoteItem | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "alpha" | "readingTime">("recent");

  // Subject list extracted from all user notes
  const subjectsList = useMemo(() => {
    const subs = Array.from(new Set(notes.map((n) => n.subject).filter(Boolean)));
    return ["All", "Favorites", ...subs];
  }, [notes]);

  // Statistics
  const totalWords = useMemo(() => {
    return notes.reduce((acc, n) => acc + (n.content.trim().split(/\s+/).filter(Boolean).length || 0), 0);
  }, [notes]);

  const totalEstReadingHours = useMemo(() => {
    return (totalWords / (180 * 60)).toFixed(1);
  }, [totalWords]);

  const favoritesCount = useMemo(() => {
    return notes.filter((n) => n.isFavorite).length;
  }, [notes]);

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => {
        const matchesSearch =
          !searchQuery.trim() ||
          n.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.subject.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesSubject =
          selectedSubjectFilter === "All"
            ? true
            : selectedSubjectFilter === "Favorites"
            ? n.isFavorite
            : n.subject === selectedSubjectFilter;

        return matchesSearch && matchesSubject;
      })
      .sort((a, b) => {
        if (sortBy === "recent") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === "alpha") {
          return a.topic.localeCompare(b.topic);
        }
        if (sortBy === "readingTime") {
          const wordsA = a.content.split(/\s+/).length;
          const wordsB = b.content.split(/\s+/).length;
          return wordsB - wordsA;
        }
        return 0;
      });
  }, [notes, searchQuery, selectedSubjectFilter, sortBy]);

  const activeReadingNote = useMemo(() => {
    if (!activeReadingNoteId) return null;
    return notes.find((n) => n.id === activeReadingNoteId) || null;
  }, [notes, activeReadingNoteId]);

  const handleOpenReader = (note: NoteItem) => {
    setActiveReadingNoteId(note.id);
    recordStudySession(5);
  };

  const handleOpenFlashcardsModal = (note: NoteItem) => {
    setSelectedNoteForCards(note);
    setShowFlashcardsModal(true);
  };

  const handleLaunchTutorFromLibrary = (prompt: string, subject?: string, noteContext?: any) => {
    if (onAskMishraJi) {
      onAskMishraJi(prompt, subject, noteContext);
    }
  };

  // If a note is currently open in reader mode, render the full DigitalNoteReader
  if (activeReadingNote) {
    return (
      <DigitalNoteReader
        note={activeReadingNote}
        onBack={() => setActiveReadingNoteId(null)}
        onAskMishraJi={handleLaunchTutorFromLibrary}
        onGenerateCards={handleOpenFlashcardsModal}
        onToggleFavorite={toggleNoteFavorite}
        onDelete={(id) => {
          deleteNote(id);
          setActiveReadingNoteId(null);
        }}
      />
    );
  }

  return (
    <StudyPilotEnvironment roomType="library">
      <div className="space-y-8 pb-16 animate-in fade-in-50">
        {/* 1. Top Header Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-md shadow-sky-600/20">
              <Library className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  Revision Notes Library
                </h1>
                <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 border border-sky-200/80">
                  Digital Study Bookshelf
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Structured academic study modules curated by <strong>Mishra Ji</strong> for deep retention and fast recall.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          id="btn-open-generate-module"
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-600/20 hover:bg-sky-700 transition active:scale-95 shrink-0"
        >
          <Sparkles className="h-4 w-4 text-sky-200" />
          <span>New Study Module</span>
        </button>
      </div>

      {/* 2. Library Quick Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Study Modules</span>
            <BookOpen className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-black text-slate-900">{notes.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">In personal library</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Words</span>
            <Layers className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-black text-slate-900">
            {totalWords.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Synthesized content</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Subjects</span>
            <GraduationCap className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-black text-slate-900">
            {subjectsList.length > 2 ? subjectsList.length - 2 : 0}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Academic disciplines</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Favorited</span>
            <Star className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-black text-slate-900">{favoritesCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Priority review sheets</p>
        </div>
      </div>

      {/* 3. Search & Subject Shelf Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search library by topic, formulas, or concepts..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-hidden shadow-2xs"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-2xs">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-hidden text-xs cursor-pointer"
              >
                <option value="recent">Most Recent</option>
                <option value="oldest">Oldest First</option>
                <option value="alpha">Alphabetical (A-Z)</option>
                <option value="readingTime">Longest Read</option>
              </select>
            </div>
          </div>
        </div>

        {/* Subject Shelves Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {subjectsList.map((sub) => {
            const isSelected = selectedSubjectFilter === sub;
            return (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubjectFilter(sub)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition shadow-2xs ${
                  isSelected
                    ? "bg-sky-600 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {sub === "Favorites" && <Star className="h-3 w-3 fill-current" />}
                <span>{sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. The Digital Bookshelf Grid */}
      {filteredNotes.length === 0 ? (
        /* Empty Bookshelf State */
        <div className="rounded-3xl border border-slate-200/90 bg-white p-8 sm:p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-sky-50 text-sky-600 border border-sky-100 mb-4">
            <BookMarked className="h-7 w-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            {searchQuery || selectedSubjectFilter !== "All"
              ? "No study modules matched your filter"
              : "Your Revision Library is ready"}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs sm:text-sm text-slate-500 leading-relaxed">
            {searchQuery || selectedSubjectFilter !== "All"
              ? "Try clearing your search keyword or switching subject shelves."
              : "Generate comprehensive revision modules with Mishra Ji to organize your study library."}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-700 transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Generate First Note with Mishra Ji</span>
            </button>

            {(searchQuery || selectedSubjectFilter !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSubjectFilter("All");
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Populated Bookshelf Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onOpen={handleOpenReader}
              onAskMishraJi={handleLaunchTutorFromLibrary}
              onToggleFavorite={toggleNoteFavorite}
              onDelete={deleteNote}
            />
          ))}
        </div>
      )}

      {/* 5. Generate Note Modal */}
      <GenerateNoteModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        saveNote={saveNote}
        onNoteGenerated={(saved) => {
          setActiveReadingNoteId(saved.id);
        }}
      />

      {/* 6. Generate Flashcards Modal */}
      {showFlashcardsModal && selectedNoteForCards && (
        <GenerateCardsModal
          isOpen={showFlashcardsModal}
          onClose={() => {
            setShowFlashcardsModal(false);
            setSelectedNoteForCards(null);
          }}
          defaultTopic={selectedNoteForCards.topic}
          defaultSubject={selectedNoteForCards.subject}
          defaultContextText={selectedNoteForCards.content}
          defaultSourceName={selectedNoteForCards.topic}
          defaultSourceType="notes"
        />
      )}
        {/* End of Notes Library */}
      </div>
    </StudyPilotEnvironment>
  );
};
