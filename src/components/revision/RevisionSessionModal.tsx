import React, { useState, useEffect } from "react";
import { RevisionCard, RecallRating, RevisionSessionResult } from "../../types";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import StudyPilotContentRenderer from "../common/StudyPilotContentRenderer";
import MishraJiScoreReactionBanner from "../common/MishraJiScoreReactionBanner";
import {
  X,
  RotateCw,
  Sparkles,
  Edit3,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Brain,
  HelpCircle,
  Flame,
  Award,
  Layers,
  ChevronRight,
} from "lucide-react";

interface RevisionSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardsQueue: RevisionCard[];
  onOpenEditCard?: (card: RevisionCard) => void;
  onOpenRegenerateCard?: (card: RevisionCard) => void;
}

export const RevisionSessionModal: React.FC<RevisionSessionModalProps> = ({
  isOpen,
  onClose,
  cardsQueue,
  onOpenEditCard,
  onOpenRegenerateCard,
}) => {
  const { user } = useAuth();
  const { recordCardReview, toggleHideCard, activePlan } = useData();
  const firstName = user?.name ? user.name.split(" ")[0] : "Student";

  const [queue, setQueue] = useState<RevisionCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; rating: RecallRating } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Session Results Tracking
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [isSessionComplete, setIsSessionComplete] = useState<boolean>(false);
  const [sessionResults, setSessionResults] = useState<{
    totalReviewed: number;
    forgotCount: number;
    difficultCount: number;
    goodCount: number;
    easyCount: number;
    reviewedCards: { card: RevisionCard; rating: RecallRating }[];
  }>({
    totalReviewed: 0,
    forgotCount: 0,
    difficultCount: 0,
    goodCount: 0,
    easyCount: 0,
    reviewedCards: [],
  });

  useEffect(() => {
    if (isOpen) {
      setQueue([...cardsQueue]);
      setCurrentIndex(0);
      setIsAnswerRevealed(false);
      setIsSessionComplete(false);
      setSessionStartTime(Date.now());
      setFeedbackToast(null);
      setSessionResults({
        totalReviewed: 0,
        forgotCount: 0,
        difficultCount: 0,
        goodCount: 0,
        easyCount: 0,
        reviewedCards: [],
      });
    }
  }, [isOpen, cardsQueue]);

  const currentCard = queue[currentIndex] || null;

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isOpen || isSessionComplete || !currentCard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if student is typing in an input/textarea
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsAnswerRevealed((prev) => !prev);
      } else if (isAnswerRevealed) {
        if (e.key === "1") {
          e.preventDefault();
          handleRateRecall("forgot");
        } else if (e.key === "2") {
          e.preventDefault();
          handleRateRecall("difficult");
        } else if (e.key === "3") {
          e.preventDefault();
          handleRateRecall("good");
        } else if (e.key === "4") {
          e.preventDefault();
          handleRateRecall("easy");
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSessionComplete, currentCard, isAnswerRevealed]);

  if (!isOpen) return null;

  const handleRateRecall = async (rating: RecallRating) => {
    if (!currentCard || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const examDate = activePlan?.examDate;
      const res = await recordCardReview(currentCard.id, rating, examDate);

      // Update session statistics
      setSessionResults((prev) => ({
        totalReviewed: prev.totalReviewed + 1,
        forgotCount: rating === "forgot" ? prev.forgotCount + 1 : prev.forgotCount,
        difficultCount: rating === "difficult" ? prev.difficultCount + 1 : prev.difficultCount,
        goodCount: rating === "good" ? prev.goodCount + 1 : prev.goodCount,
        easyCount: rating === "easy" ? prev.easyCount + 1 : prev.easyCount,
        reviewedCards: [...prev.reviewedCards, { card: currentCard, rating }],
      }));

      // Show brief feedback toast
      setFeedbackToast({ message: res.feedbackMessage, rating });

      setTimeout(() => {
        setFeedbackToast(null);
        if (currentIndex + 1 < queue.length) {
          setCurrentIndex((prev) => prev + 1);
          setIsAnswerRevealed(false);
        } else {
          setIsSessionComplete(true);
        }
        setIsSubmitting(false);
      }, 550);
    } catch (err) {
      console.error("Failed to record card review:", err);
      setIsSubmitting(false);
    }
  };

  const handleRestartMissed = () => {
    const missedCards = sessionResults.reviewedCards
      .filter((r) => r.rating === "forgot" || r.rating === "difficult")
      .map((r) => r.card);

    if (missedCards.length > 0) {
      setQueue(missedCards);
      setCurrentIndex(0);
      setIsAnswerRevealed(false);
      setIsSessionComplete(false);
      setSessionResults({
        totalReviewed: 0,
        forgotCount: 0,
        difficultCount: 0,
        goodCount: 0,
        easyCount: 0,
        reviewedCards: [],
      });
    }
  };

  const durationMinutes = Math.max(1, Math.round((Date.now() - sessionStartTime) / 60000));
  const successPercentage =
    sessionResults.totalReviewed > 0
      ? Math.round(
          ((sessionResults.goodCount + sessionResults.easyCount) / sessionResults.totalReviewed) * 100
        )
      : 0;

  return (
    <div
      id="revision-session-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 sm:p-6 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-indigo-600">
                  ACTIVE RECALL SESSION
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  SM-2 Engine
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500">
                {!isSessionComplete && queue.length > 0
                  ? `Card ${currentIndex + 1} of ${queue.length} • Prioritized for optimal retention`
                  : "Session Complete"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            aria-label="Close session"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Tracker Line */}
        {!isSessionComplete && queue.length > 0 && (
          <div className="h-1.5 w-full bg-slate-100 shrink-0">
            <div
              className="h-full bg-indigo-600 transition-all duration-300 ease-out"
              style={{ width: `${((currentIndex + 1) / queue.length) * 100}%` }}
            />
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {queue.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">All Caught Up!</h3>
              <p className="max-w-md mx-auto text-sm text-slate-500 leading-relaxed">
                You have no cards due for review at this moment. You can generate new cards from your notes or review all cards in library mode.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-indigo-700 transition"
              >
                Back to Dashboard
              </button>
            </div>
          ) : isSessionComplete ? (
            /* Session Completed Summary Screen */
            <div className="py-4 sm:py-6 space-y-6 sm:space-y-8 animate-fadeIn">
              {/* Mishra Ji Live Score Reaction Hero Banner */}
              <MishraJiScoreReactionBanner
                score={successPercentage}
                userFirstName={firstName}
                assessmentType="revision"
                topic={currentCard?.topic}
                subject={currentCard?.subject}
                showActions={false}
              />

              <div className="text-center space-y-2">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Revision Session Completed!
                </h3>
                <p className="text-sm font-medium text-slate-500 max-w-md mx-auto">
                  High-quality active retrieval strengthens synaptic pathways and protects concepts against the forgetting curve.
                </p>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-3xl font-black text-slate-900">{sessionResults.totalReviewed}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Cards Reviewed</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-center">
                  <p className="text-3xl font-black text-emerald-700">{successPercentage}%</p>
                  <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mt-1">Recall Accuracy</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-3xl font-black text-indigo-600">{sessionResults.goodCount + sessionResults.easyCount}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Retained / Solid</p>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-center">
                  <p className="text-3xl font-black text-rose-600">{sessionResults.forgotCount + sessionResults.difficultCount}</p>
                  <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider mt-1">Needs Refinement</p>
                </div>
              </div>

              {/* Performance Breakdown Pills */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                  RECALL PERFORMANCE BREAKDOWN
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-xs">
                    <span className="font-bold text-rose-800">Forgot (1d reset)</span>
                    <span className="font-black text-rose-700">{sessionResults.forgotCount}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-xs">
                    <span className="font-bold text-amber-800">Difficult</span>
                    <span className="font-black text-amber-700">{sessionResults.difficultCount}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-xs">
                    <span className="font-bold text-emerald-800">Good</span>
                    <span className="font-black text-emerald-700">{sessionResults.goodCount}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-xs">
                    <span className="font-bold text-blue-800">Easy (Bonus)</span>
                    <span className="font-black text-blue-700">{sessionResults.easyCount}</span>
                  </div>
                </div>
              </div>

              {/* Next Steps CTA */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {sessionResults.forgotCount + sessionResults.difficultCount > 0 && (
                  <button
                    type="button"
                    onClick={handleRestartMissed}
                    className="flex-1 py-3.5 px-6 rounded-2xl bg-amber-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-amber-700 transition shadow-xs flex items-center justify-center gap-2"
                  >
                    <RotateCw className="h-4 w-4" />
                    <span>Revise {sessionResults.forgotCount + sessionResults.difficultCount} Weak Cards Now</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3.5 px-6 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-wider hover:bg-indigo-700 transition shadow-xs flex items-center justify-center gap-2"
                >
                  <span>Finish & View Queue</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Active Revision Flashcard */
            currentCard && (
              <div className="space-y-6">
                {/* Card Meta Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-wider">
                      {currentCard.subject}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                      {currentCard.topic}
                    </span>
                    {currentCard.difficultyLevel && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold">
                        {currentCard.difficultyLevel}
                      </span>
                    )}
                  </div>

                  {/* Quick Card Controls */}
                  <div className="flex items-center gap-1.5">
                    {onOpenRegenerateCard && (
                      <button
                        type="button"
                        onClick={() => onOpenRegenerateCard(currentCard)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="Regenerate this card with AI"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Regenerate</span>
                      </button>
                    )}
                    {onOpenEditCard && (
                      <button
                        type="button"
                        onClick={() => onOpenEditCard(currentCard)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="Edit question or answer"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleHideCard(currentCard.id)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                      title="Hide card from active queue"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Prompt Question Box (Active Recall) */}
                <div className="rounded-3xl border border-slate-200/90 bg-slate-50/50 p-6 sm:p-8 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                      RETRIEVAL PROMPT
                    </p>
                    <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Interval: {currentCard.repetitionIntervalDays || 1}d
                    </span>
                  </div>

                  <div className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                    <StudyPilotContentRenderer content={currentCard.question} />
                  </div>

                  {/* Reveal Button (If not revealed) */}
                  {!isAnswerRevealed && (
                    <div className="pt-4">
                      <button
                        type="button"
                        id="revision-reveal-answer-btn"
                        onClick={() => setIsAnswerRevealed(true)}
                        className="w-full py-4 px-6 rounded-2xl bg-indigo-600 text-white font-black text-sm uppercase tracking-wider hover:bg-indigo-700 active:scale-[0.99] transition shadow-md shadow-indigo-100 flex items-center justify-center gap-3 group"
                      >
                        <RotateCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
                        <span>Reveal Answer & Self-Assess</span>
                        <span className="hidden sm:inline text-xs font-normal opacity-75 border-l border-white/30 pl-2">
                          Spacebar
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Answer Box (Revealed) */}
                {isAnswerRevealed && (
                  <div className="rounded-3xl border border-indigo-100 bg-white p-6 sm:p-8 space-y-6 shadow-md shadow-indigo-50 animate-fadeIn">
                    <div className="border-b border-slate-100 pb-4">
                      <p className="text-[11px] font-black uppercase tracking-widest text-indigo-600 mb-1.5">
                        EXACT ANSWER
                      </p>
                      <div className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                        <StudyPilotContentRenderer content={currentCard.answer} />
                      </div>
                    </div>

                    {/* Conceptual Intuition / Explanation */}
                    {currentCard.explanation && (
                      <div className="space-y-1 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          CONCEPTUAL INTUITION
                        </p>
                        <div className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                          <StudyPilotContentRenderer content={currentCard.explanation} compact />
                        </div>
                      </div>
                    )}

                    {/* Concrete Example */}
                    {currentCard.example && (
                      <div className="space-y-1 bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100/60">
                        <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                          CONCRETE APPLICATION
                        </p>
                        <div className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                          <StudyPilotContentRenderer content={currentCard.example} compact />
                        </div>
                      </div>
                    )}

                    {/* Key Takeaway Memory Anchor */}
                    {currentCard.keyTakeaway && (
                      <div className="flex items-start gap-2.5 text-xs font-bold text-amber-900 bg-amber-50/80 p-3.5 rounded-xl border border-amber-200/70">
                        <Flame className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="uppercase text-[10px] font-black text-amber-700 tracking-wider block">
                            Memory Anchor
                          </span>
                          <div className="leading-snug">
                            <StudyPilotContentRenderer content={currentCard.keyTakeaway} compact />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Feedback Toast Banner */}
                    {feedbackToast && (
                      <div className="py-2.5 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-between animate-fadeIn">
                        <span>{feedbackToast.message}</span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      </div>
                    )}

                    {/* Active Recall 4-Button Grade Strip */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400 text-center">
                        HOW WAS YOUR RETRIEVAL?
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {/* 1. Forgot */}
                        <button
                          type="button"
                          id="btn-rate-forgot"
                          disabled={isSubmitting}
                          onClick={() => handleRateRecall("forgot")}
                          className="flex flex-col items-center justify-center p-3 rounded-2xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100/80 active:scale-95 transition text-rose-800 group"
                        >
                          <span className="text-xs font-black uppercase tracking-wider">Forgot</span>
                          <span className="text-[10px] text-rose-600 font-medium mt-0.5">Reset to 1 day</span>
                          <span className="text-[9px] font-bold text-rose-400 mt-1 opacity-70 group-hover:opacity-100">
                            Key: 1
                          </span>
                        </button>

                        {/* 2. Difficult */}
                        <button
                          type="button"
                          id="btn-rate-difficult"
                          disabled={isSubmitting}
                          onClick={() => handleRateRecall("difficult")}
                          className="flex flex-col items-center justify-center p-3 rounded-2xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/80 active:scale-95 transition text-amber-800 group"
                        >
                          <span className="text-xs font-black uppercase tracking-wider">Difficult</span>
                          <span className="text-[10px] text-amber-600 font-medium mt-0.5">Short interval</span>
                          <span className="text-[9px] font-bold text-amber-400 mt-1 opacity-70 group-hover:opacity-100">
                            Key: 2
                          </span>
                        </button>

                        {/* 3. Good */}
                        <button
                          type="button"
                          id="btn-rate-good"
                          disabled={isSubmitting}
                          onClick={() => handleRateRecall("good")}
                          className="flex flex-col items-center justify-center p-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 active:scale-95 transition text-emerald-800 group"
                        >
                          <span className="text-xs font-black uppercase tracking-wider">Good</span>
                          <span className="text-[10px] text-emerald-600 font-medium mt-0.5">Standard spacing</span>
                          <span className="text-[9px] font-bold text-emerald-400 mt-1 opacity-70 group-hover:opacity-100">
                            Key: 3
                          </span>
                        </button>

                        {/* 4. Easy */}
                        <button
                          type="button"
                          id="btn-rate-easy"
                          disabled={isSubmitting}
                          onClick={() => handleRateRecall("easy")}
                          className="flex flex-col items-center justify-center p-3 rounded-2xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 active:scale-95 transition text-blue-800 group"
                        >
                          <span className="text-xs font-black uppercase tracking-wider">Easy</span>
                          <span className="text-[10px] text-blue-600 font-medium mt-0.5">Longer leap</span>
                          <span className="text-[9px] font-bold text-blue-400 mt-1 opacity-70 group-hover:opacity-100">
                            Key: 4
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
