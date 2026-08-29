import React, { useState } from "react";
import { useQuizSession } from "../../context/QuizSessionContext";
import { QuizQuestion } from "../../types";
import { gameShowAudio } from "../../utils/gameShowAudio";
import StudyPilotContentRenderer from "../common/StudyPilotContentRenderer";
import {
  Clock,
  Lock,
  ArrowRight,
  HelpCircle,
  Lightbulb,
  Volume2,
  VolumeX,
  AlertTriangle,
  Flame,
  CheckCircle,
} from "lucide-react";

export const GameShowArena: React.FC = () => {
  const {
    activeSession,
    selectOption,
    lockAnswer,
    nextQuestion,
    submitQuiz,
    cancelLeaving,
    confirmLeaving,
  } = useQuizSession();

  const [isMuted, setIsMuted] = useState(() => gameShowAudio.getMuted());
  const [showHint, setShowHint] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!activeSession || activeSession.status !== "active") return null;

  const {
    quiz,
    currentQuestionIndex,
    selectedAnswers,
    lockedAnswers,
    timeRemainingSeconds,
    totalDurationSeconds,
  } = activeSession;

  const currentQuestion: QuizQuestion | undefined = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

  if (!currentQuestion) return null;

  const currentSelectedOpt = selectedAnswers[currentQuestion.id];
  const isLocked = lockedAnswers[currentQuestion.id] !== undefined;

  // Format Timer mm:ss
  const mins = Math.floor(timeRemainingSeconds / 60);
  const secs = timeRemainingSeconds % 60;
  const timeFormatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  // Time warning states
  const isCriticalTime = timeRemainingSeconds <= 15;
  const isWarningTime = timeRemainingSeconds <= 60 && !isCriticalTime;

  const optionLetters = ["A", "B", "C", "D"];

  const handleToggleMute = () => {
    const nextState = gameShowAudio.toggleMute();
    setIsMuted(nextState);
  };

  const handleLock = () => {
    if (currentSelectedOpt === undefined || isLocked) return;
    lockAnswer(currentQuestion.id);
  };

  const handleNext = () => {
    setShowHint(false);
    nextQuestion();
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    await submitQuiz("completed");
    setSubmitting(false);
  };

  // Progress percentage
  const progressPercent = ((currentQuestionIndex + (isLocked ? 1 : 0)) / quiz.questions.length) * 100;

  return (
    <div className="mx-auto max-w-4xl py-2 sm:py-6 space-y-5 animate-fadeIn">
      {/* Game-Show Stage HUD */}
      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-5 sm:p-8 shadow-2xl text-white space-y-6 relative">
        {/* Subtle Ambient Stage Lighting */}
        <div
          className={`pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-64 w-96 rounded-full blur-3xl transition-all duration-700 ${
            isCriticalTime
              ? "bg-rose-600/25 animate-pulse"
              : isWarningTime
              ? "bg-amber-500/15"
              : "bg-indigo-600/15"
          }`}
        />

        {/* Top Navigation & Status Bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-indigo-300">
              {quiz.subject}
            </span>
            <h2 className="text-sm sm:text-base font-bold text-slate-200 line-clamp-1">
              {quiz.title}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Audio Toggle */}
            <button
              type="button"
              id="quiz-audio-toggle-btn"
              onClick={handleToggleMute}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title={isMuted ? "Unmute Sound Effects" : "Mute Sound Effects"}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-indigo-400" />}
            </button>

            {/* Prominent Game-Show Timer */}
            <div
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 font-mono font-black text-sm sm:text-base shadow-lg transition-all ${
                isCriticalTime
                  ? "border-2 border-rose-500 bg-rose-950/80 text-rose-300 animate-pulse ring-4 ring-rose-500/20"
                  : isWarningTime
                  ? "border border-amber-500/40 bg-amber-950/60 text-amber-300"
                  : "border border-slate-800 bg-slate-900 text-slate-100"
              }`}
            >
              <Clock
                className={`h-4 w-4 ${
                  isCriticalTime ? "text-rose-400 animate-spin" : isWarningTime ? "text-amber-400" : "text-indigo-400"
                }`}
              />
              <span className="tracking-wider">{timeFormatted}</span>
            </div>
          </div>
        </div>

        {/* Time Warning Notifications */}
        {isCriticalTime && (
          <div className="relative z-10 flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-900/40 py-1.5 px-4 text-xs font-black text-rose-300 uppercase tracking-widest animate-bounce">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            <span>CRITICAL TIME: {timeRemainingSeconds} SECONDS REMAINING!</span>
          </div>
        )}
        {isWarningTime && (
          <div className="relative z-10 flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-900/30 py-1 px-4 text-xs font-bold text-amber-300">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span>⚠ Under 1 minute remaining — stay focused!</span>
          </div>
        )}

        {/* Question Counter & Progress Track */}
        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5 text-indigo-300">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>QUESTION {currentQuestionIndex + 1} OF {quiz.questions.length}</span>
            </span>
            <span className="text-slate-400 font-mono">
              {Math.round(progressPercent)}% COMPLETE
            </span>
          </div>

          {/* Segmented / Smooth Progress Bar */}
          <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400 transition-all duration-500 shadow-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Main Stage Question Card */}
        <div className="relative z-10 rounded-2xl border border-slate-800/90 bg-slate-900/90 p-6 sm:p-8 shadow-inner space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-slate-300">
              Q{currentQuestionIndex + 1}
            </span>
            {currentQuestion.hint && (
              <button
                type="button"
                id="quiz-hint-toggle-btn"
                onClick={() => setShowHint(!showHint)}
                className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                <span>{showHint ? "Hide Hint" : "Need a Hint?"}</span>
              </button>
            )}
          </div>

          <div className="text-lg sm:text-2xl font-bold tracking-tight text-white leading-snug">
            <StudyPilotContentRenderer content={currentQuestion.question} academicTheme="dark" />
          </div>

          {/* Hint expander */}
          {showHint && currentQuestion.hint && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 p-3.5 text-xs text-amber-200 animate-fadeIn">
              💡 <strong>Hint:</strong>{" "}
              <StudyPilotContentRenderer content={currentQuestion.hint} academicTheme="dark" inlineOnly />
            </div>
          )}
        </div>

        {/* Exactly 4 Answer Options (A, B, C, D) */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {currentQuestion.options.slice(0, 4).map((optionText, optIdx) => {
            const isSelected = currentSelectedOpt === optIdx;
            const isLockedOption = isLocked && lockedAnswers[currentQuestion.id] === optIdx;
            const letter = optionLetters[optIdx] || `${optIdx + 1}`;

            let cardStyle = "border-slate-800 bg-slate-900/80 text-slate-200 hover:border-slate-700 hover:bg-slate-900";
            let badgeStyle = "border-slate-700 bg-slate-800 text-slate-400";

            if (isLockedOption) {
              cardStyle = "border-2 border-amber-500 bg-amber-950/40 text-amber-100 ring-2 ring-amber-500/20";
              badgeStyle = "border-amber-400 bg-amber-500 text-slate-950 font-black";
            } else if (isSelected) {
              cardStyle = "border-2 border-indigo-500 bg-indigo-950/50 text-white ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/10";
              badgeStyle = "border-indigo-400 bg-indigo-600 text-white font-black";
            } else if (isLocked) {
              cardStyle = "border-slate-900 bg-slate-950/60 text-slate-500 opacity-50 cursor-not-allowed";
              badgeStyle = "border-slate-800 bg-slate-900 text-slate-600";
            }

            return (
              <div
                key={optIdx}
                id={`quiz-opt-${currentQuestion.id}-${optIdx}`}
                onClick={() => !isLocked && selectOption(currentQuestion.id, optIdx)}
                className={`flex cursor-pointer items-center gap-3.5 rounded-2xl border p-4 text-xs sm:text-sm font-medium transition-all duration-200 active:scale-[0.99] ${cardStyle}`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-xs font-black uppercase transition-colors ${badgeStyle}`}
                >
                  {letter}
                </div>
                <div className="flex-1 leading-snug">
                  <StudyPilotContentRenderer content={optionText} compact academicTheme="dark" inlineOnly />
                </div>
                {isLockedOption && (
                  <Lock className="h-4 w-4 text-amber-400 shrink-0 animate-pulse" />
                )}
                {isSelected && !isLocked && (
                  <div className="h-2.5 w-2.5 rounded-full bg-indigo-400 animate-ping shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Action Controls & Lock Decision Bar */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80 pt-5">
          {/* Status feedback */}
          <div className="text-xs text-slate-400">
            {!isLocked ? (
              currentSelectedOpt !== undefined ? (
                <span className="text-indigo-300 font-semibold">
                  Choice selected. Click <strong>Lock Answer</strong> to confirm.
                </span>
              ) : (
                <span>Select an option from A, B, C, or D.</span>
              )
            ) : (
              <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                <Lock className="h-3.5 w-3.5" />
                <span>Answer locked. Ready for next question.</span>
              </span>
            )}
          </div>

          {/* Action Decision Buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {!isLocked ? (
              <button
                type="button"
                id="quiz-lock-answer-btn"
                disabled={currentSelectedOpt === undefined}
                onClick={handleLock}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95"
              >
                <Lock className="h-4 w-4" />
                <span>LOCK ANSWER →</span>
              </button>
            ) : isLastQuestion ? (
              <button
                type="button"
                id="quiz-final-submit-btn"
                disabled={submitting}
                onClick={handleFinalSubmit}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-indigo-600 to-indigo-700 px-6 py-3 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-xl shadow-emerald-600/20 hover:opacity-95 transition active:scale-95"
              >
                <CheckCircle className="h-4 w-4" />
                <span>{submitting ? "Tallying Final Score..." : "SUBMIT QUIZ & REVEAL RESULT"}</span>
              </button>
            ) : (
              <button
                type="button"
                id="quiz-next-question-btn"
                onClick={handleNext}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition active:scale-95"
              >
                <span>NEXT QUESTION</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
