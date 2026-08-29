import React from "react";
import { AlertTriangle, ArrowLeft, LogOut } from "lucide-react";
import { useQuizSession } from "../../context/QuizSessionContext";

export const LeaveQuizWarningModal: React.FC = () => {
  const { leaveWarningModalOpen, cancelLeaving, confirmLeaving, pendingNavTab } = useQuizSession();

  if (!leaveWarningModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl border-2 border-rose-500/30 bg-slate-900 p-6 shadow-2xl text-white space-y-5">
        {/* Warning Icon Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-400">
              Quiz Integrity Rule
            </span>
            <h3 className="text-lg font-black tracking-tight text-white">
              Quiz Will Auto-Submit
            </h3>
          </div>
        </div>

        {/* Notice description */}
        <div className="rounded-xl border border-rose-500/20 bg-rose-950/40 p-4 text-xs text-rose-200/90 leading-relaxed space-y-2">
          <p className="font-semibold text-rose-100">
            You are attempting to leave the active quiz session
            {pendingNavTab ? ` to view ${pendingNavTab.toUpperCase()}` : ""}.
          </p>
          <p className="text-[11px] text-rose-300/80">
            To preserve assessment integrity, leaving now will automatically submit your currently locked answers. All remaining questions will be marked as <strong className="text-rose-200">Unanswered</strong>.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            id="quiz-leave-cancel-btn"
            onClick={cancelLeaving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Quiz</span>
          </button>

          <button
            type="button"
            id="quiz-leave-confirm-btn"
            onClick={confirmLeaving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-600/20 px-4 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-600/30 hover:text-white transition active:scale-95"
          >
            <LogOut className="h-4 w-4" />
            <span>Submit & Leave</span>
          </button>
        </div>
      </div>
    </div>
  );
};
