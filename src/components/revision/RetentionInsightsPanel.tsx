import React from "react";
import { RevisionCard } from "../../types";
import { useData } from "../../context/DataContext";
import { getRetentionInsights, toLocalDateString } from "../../utils/spacedRepetitionEngine";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Award,
  Clock,
  RotateCcw,
  Trash2,
  HelpCircle,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

interface RetentionInsightsPanelProps {
  onStartSession?: () => void;
  onOpenGenerateModal?: () => void;
}

export const RetentionInsightsPanel: React.FC<RetentionInsightsPanelProps> = ({
  onStartSession,
  onOpenGenerateModal,
}) => {
  const { revisionCards, clearRevisionHistory, deleteAllRevisionCards, activePlan } = useData();

  const insights = getRetentionInsights(revisionCards);
  const visibleCards = revisionCards.filter((c) => !c.isHidden);
  const todayStr = toLocalDateString();

  // Status breakdown calculations
  const dueTodayCount = visibleCards.filter(
    (c) => c.nextReviewDate <= todayStr || c.totalReviews === 0
  ).length;

  const statusCounts = {
    mastered: visibleCards.filter((c) => c.status === "Mastered" || c.isMastered).length,
    strong: visibleCards.filter((c) => c.status === "Strong" && !c.isMastered).length,
    developing: visibleCards.filter((c) => c.status === "Developing").length,
    needsReview: visibleCards.filter((c) => c.status === "Needs Review").length,
  };

  return (
    <div className="space-y-6">
      {/* 1. Core Retention Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Active Cards */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              ACTIVE DECK
            </p>
            <Brain className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-3">
            <p className="text-3xl sm:text-4xl font-black text-slate-900 leading-none">
              {visibleCards.length}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">Total retrieval cards</p>
          </div>
        </div>

        {/* Due Today / Overdue */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              DUE FOR RETRIEVAL
            </p>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-3">
            <p className="text-3xl sm:text-4xl font-black text-amber-600 leading-none">
              {dueTodayCount}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {dueTodayCount > 0 ? "Ready for spaced review" : "Deck is up to date"}
            </p>
          </div>
        </div>

        {/* Retention / Accuracy Rate */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              RETRIEVAL ACCURACY
            </p>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <p className="text-3xl sm:text-4xl font-black text-emerald-600 leading-none">
              {insights.retentionRatePercent}%
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">Successful recall rate</p>
          </div>
        </div>

        {/* Mastered Long-Term Cards */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              LONG-TERM RETENTION
            </p>
            <Award className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-3">
            <p className="text-3xl sm:text-4xl font-black text-indigo-600 leading-none">
              {statusCounts.mastered}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Interval {">"} 21 days
            </p>
          </div>
        </div>
      </div>

      {/* 2. Retention Curve Distribution & Weak Concepts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Distribution Progress (7 cols) */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                MEMORY RETENTION DISTRIBUTION
              </p>
              <h3 className="text-lg font-black text-slate-900 mt-0.5">
                Forgetting Curve Protection
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {visibleCards.length} Total Cards
            </span>
          </div>

          {/* Horizontal multi-color bar */}
          <div className="space-y-2">
            <div className="h-4 w-full rounded-full bg-slate-100 flex overflow-hidden">
              {visibleCards.length > 0 ? (
                <>
                  <div
                    style={{
                      width: `${(statusCounts.mastered / visibleCards.length) * 100}%`,
                    }}
                    className="bg-blue-600"
                    title={`Mastered: ${statusCounts.mastered}`}
                  />
                  <div
                    style={{
                      width: `${(statusCounts.strong / visibleCards.length) * 100}%`,
                    }}
                    className="bg-emerald-500"
                    title={`Strong: ${statusCounts.strong}`}
                  />
                  <div
                    style={{
                      width: `${(statusCounts.developing / visibleCards.length) * 100}%`,
                    }}
                    className="bg-amber-400"
                    title={`Developing: ${statusCounts.developing}`}
                  />
                  <div
                    style={{
                      width: `${(statusCounts.needsReview / visibleCards.length) * 100}%`,
                    }}
                    className="bg-rose-500"
                    title={`Needs Review: ${statusCounts.needsReview}`}
                  />
                </>
              ) : (
                <div className="w-full bg-slate-200" />
              )}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="h-3 w-3 rounded-full bg-blue-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800">Mastered</p>
                  <p className="text-[10px] text-slate-400">{statusCounts.mastered} cards</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800">Strong</p>
                  <p className="text-[10px] text-slate-400">{statusCounts.strong} cards</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="h-3 w-3 rounded-full bg-amber-400 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800">Developing</p>
                  <p className="text-[10px] text-slate-400">{statusCounts.developing} cards</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="h-3 w-3 rounded-full bg-rose-500 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800">Needs Review</p>
                  <p className="text-[10px] text-slate-400">{statusCounts.needsReview} cards</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cognitive Science Principle Note */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              <span>Evidence-Supported Memory Architecture</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              StudyPilot schedules retrieval prompts at expanding intervals (SM-2 principle) right when memory decay begins. Active retrieval requires neural effort, which research confirms significantly increases long-term retention compared to passive rereading.
            </p>
          </div>
        </div>

        {/* Priority Weak Spots (5 cols) */}
        <div className="lg:col-span-5 rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              HIGH REINFORCEMENT PRIORITY
            </p>
            <h3 className="text-lg font-black text-slate-900 mt-0.5">
              Concepts Needing Focus
            </h3>
          </div>

          <div className="space-y-2.5 flex-1">
            {insights.weakTopics.length > 0 ? (
              insights.weakTopics.map((topic, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100 flex items-center justify-between"
                >
                  <div className="truncate pr-2">
                    <p className="text-xs font-bold text-rose-900 truncate">{topic.topic}</p>
                    <p className="text-[10px] text-rose-600 font-medium">{topic.subject}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-rose-200/80 text-rose-800 text-[10px] font-black shrink-0">
                    {topic.count} Issues ({topic.failureRate}% Fail)
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-1" />
                <p className="font-bold text-slate-700">No critical weak spots detected!</p>
                <p>All concepts are currently showing consistent retrieval.</p>
              </div>
            )}
          </div>

          {onStartSession && dueTodayCount > 0 && (
            <button
              type="button"
              onClick={onStartSession}
              className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-indigo-700 transition shadow-xs"
            >
              Revise Due Cards ({dueTodayCount})
            </button>
          )}
        </div>
      </div>

      {/* 3. Maintenance & Deck Hygiene */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-black text-slate-900">Deck Management & History Reset</h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Reset memory history to day 1 without deleting cards, or purge existing cards.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Reset repetition intervals for all cards back to day 1? Your cards will NOT be deleted.")) {
                  clearRevisionHistory();
                }
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider transition flex items-center gap-2"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset History</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm("Are you sure you want to delete all revision cards? This cannot be undone.")) {
                  deleteAllRevisionCards();
                }
              }}
              className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs uppercase tracking-wider transition flex items-center gap-2"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete All Cards</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
