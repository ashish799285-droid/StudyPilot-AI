import React, { useState, useMemo } from "react";
import { RevisionCard, RevisionStatus } from "../../types";
import { useData } from "../../context/DataContext";
import { buildDailyRevisionQueue, toLocalDateString, getDaysDifference } from "../../utils/spacedRepetitionEngine";
import { RevisionSessionModal } from "./RevisionSessionModal";
import { GenerateCardsModal } from "./GenerateCardsModal";
import { EditCardModal } from "./EditCardModal";
import { RegenerateCardModal } from "./RegenerateCardModal";
import { RetentionInsightsPanel } from "./RetentionInsightsPanel";
import StudyPilotContentRenderer from "../common/StudyPilotContentRenderer";
import { StudyPilotEnvironment } from "../common/StudyPilotEnvironment";
import {
  Brain,
  Sparkles,
  Plus,
  Play,
  RotateCw,
  Search,
  Filter,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Award,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  Calendar,
  ArrowRight,
  TrendingUp,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";

export const RevisionView: React.FC = () => {
  const {
    revisionCards,
    deleteRevisionCard,
    deleteMultipleCards,
    toggleHideCard,
    activePlan,
  } = useData();

  // Active View Tab: "queue" | "library" | "insights"
  const [activeTab, setActiveTab] = useState<"queue" | "library" | "insights">("queue");

  // Modals state
  const [isSessionOpen, setIsSessionOpen] = useState<boolean>(false);
  const [sessionCards, setSessionCards] = useState<RevisionCard[]>([]);
  const [isGenerateOpen, setIsGenerateOpen] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [cardToEdit, setCardToEdit] = useState<RevisionCard | null>(null);
  const [isRegenerateOpen, setIsRegenerateOpen] = useState<boolean>(false);
  const [cardToRegenerate, setCardToRegenerate] = useState<RevisionCard | null>(null);

  // Search & Filtering for Library
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  const examDate = activePlan?.examDate;

  // Build daily queue using the spaced repetition engine
  const dailyQueue = useMemo(() => {
    return buildDailyRevisionQueue(revisionCards, examDate, 25);
  }, [revisionCards, examDate]);

  const allDueCards = useMemo(() => {
    return [...dailyQueue.priorityCards, ...dailyQueue.reinforceCards, ...dailyQueue.maintainCards];
  }, [dailyQueue]);

  // Unique subjects for filter
  const subjectsList = useMemo(() => {
    const set = new Set<string>();
    revisionCards.forEach((c) => {
      if (c.subject) set.add(c.subject);
    });
    return Array.from(set);
  }, [revisionCards]);

  // Filtered Cards for Library
  const filteredCards = useMemo(() => {
    const todayStr = toLocalDateString();
    return revisionCards.filter((card) => {
      // Search match
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        card.question.toLowerCase().includes(q) ||
        card.answer.toLowerCase().includes(q) ||
        card.topic.toLowerCase().includes(q) ||
        card.subject.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Subject match
      if (subjectFilter !== "all" && card.subject !== subjectFilter) return false;

      // Status match
      if (statusFilter === "all") return !card.isHidden;
      if (statusFilter === "hidden") return !!card.isHidden;
      if (statusFilter === "due") return !card.isHidden && (card.nextReviewDate <= todayStr || card.totalReviews === 0);
      if (statusFilter === "Needs Review") return !card.isHidden && card.status === "Needs Review";
      if (statusFilter === "Developing") return !card.isHidden && card.status === "Developing";
      if (statusFilter === "Strong") return !card.isHidden && card.status === "Strong";
      if (statusFilter === "Mastered") return !card.isHidden && (card.status === "Mastered" || card.isMastered);

      return true;
    });
  }, [revisionCards, searchQuery, statusFilter, subjectFilter]);

  // Launch revision session with specific or all due cards
  const startSessionWithCards = (cards: RevisionCard[]) => {
    if (cards.length === 0) return;
    setSessionCards(cards);
    setIsSessionOpen(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCardIds(filteredCards.map((c) => c.id));
    } else {
      setSelectedCardIds([]);
    }
  };

  const handleToggleSelectCard = (id: string) => {
    setSelectedCardIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedCardIds.length === 0) return;
    if (window.confirm(`Delete ${selectedCardIds.length} selected revision cards?`)) {
      await deleteMultipleCards(selectedCardIds);
      setSelectedCardIds([]);
    }
  };

  const handleOpenEdit = (card: RevisionCard) => {
    setCardToEdit(card);
    setIsEditOpen(true);
  };

  const handleOpenRegenerate = (card: RevisionCard) => {
    setCardToRegenerate(card);
    setIsRegenerateOpen(true);
  };

  const estimatedMinutes = Math.max(1, Math.ceil(allDueCards.length * 0.75));

  return (
    <StudyPilotEnvironment roomType="spaced">
      <div className="flex flex-col gap-8 pb-12">
        {/* 1. Header & Quick Controls */}
      <section className="flex flex-col sm:flex-row justify-between sm:items-end gap-6 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-widest text-indigo-600">
              SMART FORGETTING-CURVE ENGINE
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
              Active Recall
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tightest leading-none text-slate-900">
            SPACED REVISION
          </h1>
          <p className="text-sm sm:text-base font-medium text-slate-400 mt-1.5">
            Evidence-supported memory retrieval scheduled right before memory decay.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            id="btn-open-generate-cards"
            onClick={() => setIsGenerateOpen(true)}
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 text-slate-800 font-bold text-xs uppercase tracking-wider transition shadow-xs flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span>AI Generate Cards</span>
          </button>

          <button
            type="button"
            id="btn-open-create-card"
            onClick={() => {
              setCardToEdit(null);
              setIsEditOpen(true);
            }}
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider transition shadow-xs flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Card</span>
          </button>

          <button
            type="button"
            id="btn-start-daily-revision"
            disabled={allDueCards.length === 0}
            onClick={() => startSessionWithCards(allDueCards)}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider transition shadow-md shadow-indigo-100 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="h-4 w-4 fill-white" />
            <span>Start Revision ({allDueCards.length})</span>
          </button>
        </div>
      </section>

      {/* 2. Mode Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab("queue")}
          className={`pb-3 px-3 text-xs sm:text-sm font-black uppercase tracking-wider transition relative ${
            activeTab === "queue"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-slate-400 hover:text-slate-700"
          }`}
        >
          <span>Daily Queue</span>
          {allDueCards.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
              {allDueCards.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("library")}
          className={`pb-3 px-3 text-xs sm:text-sm font-black uppercase tracking-wider transition relative ${
            activeTab === "library"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-slate-400 hover:text-slate-700"
          }`}
        >
          <span>Card Library</span>
          <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
            {revisionCards.filter((c) => !c.isHidden).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("insights")}
          className={`pb-3 px-3 text-xs sm:text-sm font-black uppercase tracking-wider transition relative ${
            activeTab === "insights"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-slate-400 hover:text-slate-700"
          }`}
        >
          <span>Memory & Retention Analytics</span>
        </button>
      </div>

      {/* 3. Main Views */}

      {/* VIEW A: Daily Revision Queue */}
      {activeTab === "queue" && (
        <div className="space-y-6">
          {/* Exam Approaching Notice */}
          {dailyQueue.examApproachingMessage && (
            <div className="flex items-center gap-3 p-4 rounded-3xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold shadow-xs">
              <Flame className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-black uppercase tracking-wider text-amber-800">
                  EXAM RETENTION ACCELERATION
                </p>
                <p className="font-medium text-amber-950 mt-0.5">
                  {dailyQueue.examApproachingMessage}
                </p>
              </div>
            </div>
          )}

          {/* Quick Queue Launch Hero Banner */}
          <div className="rounded-3xl border border-indigo-100 bg-linear-to-r from-indigo-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-indigo-900/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-white/10 text-indigo-200 text-[10px] font-black uppercase tracking-wider backdrop-blur-xs">
                  TODAY'S RETRIEVAL TARGET
                </span>
                <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  ~{estimatedMinutes} mins estimated
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                {allDueCards.length > 0
                  ? `${allDueCards.length} Concepts Scheduled for Optimal Memory Retention`
                  : "All Revision Queues Cleared!"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                {allDueCards.length > 0
                  ? "Reviewing cards today reinforces synaptic connections right before memory decay occurs according to the Ebbinghaus forgetting curve."
                  : "Great work! You have completed all scheduled cards for today. You can review cards in library mode or generate new cards from your notes."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
              {allDueCards.length > 0 && (
                <button
                  type="button"
                  id="btn-hero-start-session"
                  onClick={() => startSessionWithCards(allDueCards)}
                  className="w-full sm:w-auto px-8 py-4 bg-white text-indigo-950 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-100 active:scale-[0.99] transition shadow-lg flex items-center justify-center gap-3"
                >
                  <Play className="h-4 w-4 fill-indigo-950" />
                  <span>Start Full Session ({allDueCards.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Queue Categories Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Category 1: Urgent Weak / Needs Review */}
            <div className="rounded-3xl border border-rose-200 bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Needs Review
                  </h3>
                </div>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  {dailyQueue.priorityCards.length} Cards
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Concepts that were forgotten in recent sessions or have critical weakness indicators.
              </p>
              <div className="space-y-2 pt-2 border-t border-slate-100">
                {dailyQueue.priorityCards.slice(0, 3).map((card) => (
                  <div
                    key={card.id}
                    onClick={() => startSessionWithCards([card])}
                    className="p-2.5 rounded-xl bg-rose-50/60 hover:bg-rose-100/70 cursor-pointer transition border border-rose-100 flex items-center justify-between"
                  >
                    <div className="truncate pr-2">
                      <p className="text-xs font-bold text-slate-900 truncate">{card.topic}</p>
                      <p className="text-[10px] text-rose-700 truncate">{card.question}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  </div>
                ))}
              </div>
              {dailyQueue.priorityCards.length > 0 && (
                <button
                  type="button"
                  onClick={() => startSessionWithCards(dailyQueue.priorityCards)}
                  className="w-full py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-rose-700 transition"
                >
                  Revise Weak Cards ({dailyQueue.priorityCards.length})
                </button>
              )}
            </div>

            {/* Category 2: Reinforce Developing */}
            <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Developing
                  </h3>
                </div>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {dailyQueue.reinforceCards.length} Cards
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Concepts currently building stability through 2–5 day repetition intervals.
              </p>
              <div className="space-y-2 pt-2 border-t border-slate-100">
                {dailyQueue.reinforceCards.slice(0, 3).map((card) => (
                  <div
                    key={card.id}
                    onClick={() => startSessionWithCards([card])}
                    className="p-2.5 rounded-xl bg-amber-50/60 hover:bg-amber-100/70 cursor-pointer transition border border-amber-100 flex items-center justify-between"
                  >
                    <div className="truncate pr-2">
                      <p className="text-xs font-bold text-slate-900 truncate">{card.topic}</p>
                      <p className="text-[10px] text-amber-800 truncate">{card.question}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  </div>
                ))}
              </div>
              {dailyQueue.reinforceCards.length > 0 && (
                <button
                  type="button"
                  onClick={() => startSessionWithCards(dailyQueue.reinforceCards)}
                  className="w-full py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-amber-700 transition"
                >
                  Reinforce Developing ({dailyQueue.reinforceCards.length})
                </button>
              )}
            </div>

            {/* Category 3: Maintain Long-Term */}
            <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Solid / Maintain
                  </h3>
                </div>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {dailyQueue.maintainCards.length} Cards
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Consolidated memory items scheduled for spaced validation checks.
              </p>
              <div className="space-y-2 pt-2 border-t border-slate-100">
                {dailyQueue.maintainCards.slice(0, 3).map((card) => (
                  <div
                    key={card.id}
                    onClick={() => startSessionWithCards([card])}
                    className="p-2.5 rounded-xl bg-emerald-50/60 hover:bg-emerald-100/70 cursor-pointer transition border border-emerald-100 flex items-center justify-between"
                  >
                    <div className="truncate pr-2">
                      <p className="text-xs font-bold text-slate-900 truncate">{card.topic}</p>
                      <p className="text-[10px] text-emerald-800 truncate">{card.question}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  </div>
                ))}
              </div>
              {dailyQueue.maintainCards.length > 0 && (
                <button
                  type="button"
                  onClick={() => startSessionWithCards(dailyQueue.maintainCards)}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-emerald-700 transition"
                >
                  Maintain ({dailyQueue.maintainCards.length})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW B: Card Library & Deck Management */}
      {activeTab === "library" && (
        <div className="space-y-6">
          {/* Controls Strip */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="relative w-full sm:w-80">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search questions, answers, topics..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-slate-50/50 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Subject Selector */}
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50/50 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">All Subjects ({revisionCards.length})</option>
                  {subjectsList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                {/* Status Selector */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50/50 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">Active Cards</option>
                  <option value="due">Due for Review</option>
                  <option value="Needs Review">Needs Review 🔴</option>
                  <option value="Developing">Developing 🟡</option>
                  <option value="Strong">Strong 🟢</option>
                  <option value="Mastered">Mastered 🏆</option>
                  <option value="hidden">Hidden Cards 👁️</option>
                </select>
              </div>
            </div>

            {/* Bulk Selection Bar (If any selected) */}
            {selectedCardIds.length > 0 && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-900 animate-fadeIn">
                <span>{selectedCardIds.length} cards selected</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const selected = revisionCards.filter((c) => selectedCardIds.includes(c.id));
                      startSessionWithCards(selected);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition"
                  >
                    Revise Selected
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition"
                  >
                    Delete Selected
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cards Grid */}
          {filteredCards.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-3">
              <Brain className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">No revision cards found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No cards match your filter criteria. Generate cards using AI or create a new card manually.
              </p>
              <button
                type="button"
                onClick={() => setIsGenerateOpen(true)}
                className="mt-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition inline-flex items-center gap-2"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI Generate Cards</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCards.map((card) => {
                const isSelected = selectedCardIds.includes(card.id);
                return (
                  <div
                    key={card.id}
                    className={`rounded-3xl border p-5 sm:p-6 transition-all flex flex-col justify-between space-y-4 ${
                      isSelected
                        ? "border-indigo-300 bg-indigo-50/30"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Card Meta */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectCard(card.id)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                          />
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
                            {card.subject}
                          </span>
                          <span className="text-xs font-bold text-slate-700 truncate max-w-[160px]">
                            {card.topic}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            card.status === "Mastered"
                              ? "bg-blue-100 text-blue-800"
                              : card.status === "Strong"
                              ? "bg-emerald-100 text-emerald-800"
                              : card.status === "Developing"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {card.status}
                        </span>
                      </div>

                      {/* Question (Front) */}
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Question Prompt
                        </p>
                        <div className="text-sm font-bold text-slate-900 mt-0.5 leading-snug">
                          <StudyPilotContentRenderer content={card.question} compact />
                        </div>
                      </div>

                      {/* Answer (Back) */}
                      <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Answer
                        </p>
                        <div className="text-xs text-slate-700 font-medium mt-0.5 leading-relaxed">
                          <StudyPilotContentRenderer content={card.answer} compact />
                        </div>
                      </div>

                      {/* Memory Anchor */}
                      {card.keyTakeaway && (
                        <div className="text-[11px] font-semibold text-amber-800 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-100/80">
                          <StudyPilotContentRenderer content={`🎯 ${card.keyTakeaway}`} compact />
                        </div>
                      )}
                    </div>

                    {/* Footer & Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="text-[11px] text-slate-400 font-medium">
                        Interval: <span className="font-bold text-slate-700">{card.repetitionIntervalDays}d</span> • Reviews:{" "}
                        <span className="font-bold text-slate-700">{card.totalReviews || 0}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startSessionWithCards([card])}
                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
                          title="Revise this card now"
                        >
                          <Play className="h-3.5 w-3.5 fill-indigo-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenRegenerate(card)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                          title="Regenerate with AI"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(card)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                          title="Edit card"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleHideCard(card.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                          title={card.isHidden ? "Unhide card" : "Hide card"}
                        >
                          {card.isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Delete this revision card?")) {
                              deleteRevisionCard(card.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete card"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW C: Retention Insights */}
      {activeTab === "insights" && (
        <RetentionInsightsPanel
          onStartSession={() => startSessionWithCards(allDueCards)}
          onOpenGenerateModal={() => setIsGenerateOpen(true)}
        />
      )}

      {/* Active Modals */}
      <RevisionSessionModal
        isOpen={isSessionOpen}
        onClose={() => setIsSessionOpen(false)}
        cardsQueue={sessionCards}
        onOpenEditCard={(c) => {
          setCardToEdit(c);
          setIsEditOpen(true);
        }}
        onOpenRegenerateCard={(c) => {
          setCardToRegenerate(c);
          setIsRegenerateOpen(true);
        }}
      />

      <GenerateCardsModal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
      />

      <EditCardModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        cardToEdit={cardToEdit}
      />

      <RegenerateCardModal
        isOpen={isRegenerateOpen}
        onClose={() => setIsRegenerateOpen(false)}
        card={cardToRegenerate}
      />
      </div>
    </StudyPilotEnvironment>
  );
};
