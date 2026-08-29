import React from "react";
import { useAuth } from "../../context/AuthContext";
import { useQuizSession } from "../../context/QuizSessionContext";
import {
  Play,
  Clock,
  HelpCircle,
  ShieldAlert,
  Flame,
  Award,
  ArrowLeft,
  Zap,
} from "lucide-react";

export const GameShowPreparation: React.FC = () => {
  const { user } = useAuth();
  const { activeSession, startActiveQuiz, dismissResult } = useQuizSession();

  if (!activeSession || activeSession.status !== "preparing") return null;

  const quiz = activeSession.quiz;
  const firstName = user?.name ? user.name.split(" ")[0] : "Student";
  const durationMins = Math.ceil(activeSession.totalDurationSeconds / 60);

  return (
    <div className="mx-auto max-w-3xl py-4 sm:py-8 animate-fadeIn">
      {/* Game-Show Chamber Card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-10 shadow-2xl text-white">
        {/* Subtle decorative glowing background accents */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />

        {/* Back button */}
        <button
          type="button"
          id="quiz-prep-back-btn"
          onClick={dismissResult}
          className="relative z-10 inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Challenges</span>
        </button>

        {/* Title Header */}
        <div className="relative z-10 mt-6 text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-1 text-xs font-black uppercase tracking-widest text-amber-400">
            <Flame className="h-4 w-4 animate-pulse" />
            <span>High-Stakes Knowledge Challenge</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
            READY, {firstName}?
          </h1>

          <p className="text-lg sm:text-xl font-bold text-indigo-300">
            {quiz.title}
          </p>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            {quiz.subject} • {quiz.topic}
          </p>
        </div>

        {/* Parameters Grid */}
        <div className="relative z-10 mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center">
            <HelpCircle className="h-5 w-5 text-indigo-400 mx-auto mb-1.5" />
            <p className="text-xl sm:text-2xl font-black text-white">{quiz.questions.length}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              Questions
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center">
            <Clock className="h-5 w-5 text-amber-400 mx-auto mb-1.5" />
            <p className="text-xl sm:text-2xl font-black text-amber-300">{durationMins} Min</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              Countdown
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center">
            <Zap className="h-5 w-5 text-emerald-400 mx-auto mb-1.5" />
            <p className="text-xl sm:text-2xl font-black text-emerald-300">4 Choices</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              Per Question
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center">
            <Award className="h-5 w-5 text-purple-400 mx-auto mb-1.5" />
            <p className="text-sm sm:text-base font-black text-purple-300 mt-1">{quiz.difficulty}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              Difficulty
            </p>
          </div>
        </div>

        {/* Game Show & Integrity Rules */}
        <div className="relative z-10 mt-8 rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-300">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            <span>Challenge & Integrity Rules</span>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
              <span><strong>One question at a time:</strong> Lock answers sequentially.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
              <span><strong>Choose from 4 answers:</strong> Standard A, B, C, D options.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
              <span><strong>Timer counts down:</strong> Auto-submits on 00:00.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
              <span><strong>Tab switch integrity:</strong> Leaving the tab auto-submits quiz.</span>
            </li>
            <li className="flex items-start gap-2 sm:col-span-2">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
              <span><strong>Unanswered tracking:</strong> Unreached questions are recorded as Unanswered.</span>
            </li>
          </ul>
        </div>

        {/* Start Button */}
        <div className="relative z-10 mt-8 flex flex-col items-center gap-3">
          <button
            type="button"
            id="quiz-start-challenge-btn"
            onClick={startActiveQuiz}
            className="w-full sm:w-80 flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-600 px-8 py-4 text-base sm:text-lg font-black tracking-wide text-white shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 transition"
          >
            <Play className="h-5 w-5 fill-white" />
            <span>START QUIZ</span>
          </button>
          <p className="text-[11px] font-semibold text-slate-400">
            The timer begins as soon as you press Start.
          </p>
        </div>
      </div>
    </div>
  );
};
