import React from "react";
import { useAuth } from "../../context/AuthContext";
import { useTimer } from "../../context/TimerContext";
import { useQuizSession } from "../../context/QuizSessionContext";
import { formatSeconds } from "../../utils/pomodoroEngine";
import { NavigationTab } from "../../types";
import {
  Sparkles,
  Flame,
  User,
  LogOut,
  LogIn,
  Menu,
  X,
  Search,
  Clock,
  Pause,
  Play,
} from "lucide-react";

interface HeaderProps {
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  openAuthModal: () => void;
  openSettingsModal: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  openAuthModal,
  openSettingsModal,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const { user, signOut } = useAuth();
  const { activeSession, timerState, timeRemainingSeconds, timerMode, pauseSession, resumeSession } = useTimer();
  const { requestTabNavigation } = useQuizSession();

  const handleTabClick = (tab: NavigationTab) => {
    requestTabNavigation(tab, () => {
      setCurrentTab(tab);
    });
  };

  const handleSettingsClick = () => {
    requestTabNavigation("settings", () => {
      openSettingsModal();
    });
  };

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-6 sm:px-10 backdrop-blur-md shrink-0">
      {/* Search pill or Mobile menu */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Global Search Bar from Design */}
        <div className="flex items-center bg-slate-100 px-4 py-2 rounded-full w-48 sm:w-80 md:w-96 text-slate-400 gap-2">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="text-slate-400 text-sm font-medium truncate">Search subjects, notes, quizzes...</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Active Timer Mini-Widget in Header */}
        {activeSession && currentTab !== "timer" && (
          <div
            onClick={() => handleTabClick("timer")}
            className={`cursor-pointer flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-all shadow-2xs ${
              timerMode === "break"
                ? "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
                : timerState === "paused"
                ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            }`}
            title="Active Focus Session (click to open timer)"
          >
            <Clock className="h-3.5 w-3.5 animate-pulse text-indigo-600" />
            <span className="font-mono font-black">{formatSeconds(timeRemainingSeconds)}</span>
            <span className="hidden md:inline text-[11px] font-medium opacity-80 truncate max-w-[100px]">
              {activeSession.topic || activeSession.subject}
            </span>
          </div>
        )}

        {/* Streak Pill */}
        {user && (
          <div
            title={`${user.streakDays} Day Study Streak`}
            className="hidden sm:flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/80 px-3.5 py-1.5 text-xs font-black text-amber-700 uppercase tracking-wider shadow-2xs"
          >
            <Flame className="h-4 w-4 fill-amber-500 text-amber-500" />
            <span>{user.streakDays}d Streak</span>
          </div>
        )}

        {/* Ask AI Tutor Button */}
        <button
          type="button"
          onClick={() => handleTabClick("tutor")}
          className={`hidden sm:flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all shadow-xs ${
            currentTab === "tutor"
              ? "bg-indigo-600 text-white"
              : "border border-indigo-200 bg-indigo-50/60 text-indigo-700 hover:bg-indigo-100/70"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Ask AI Tutor</span>
        </button>

        {/* User Profile Avatar */}
        {user ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSettingsClick}
              title={`Logged in as ${user.name}`}
              className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-indigo-500/30 transition cursor-pointer"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-black text-sm">
                  {user.name ? user.name.charAt(0).toUpperCase() : "A"}
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => signOut()}
              title="Sign Out"
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={openAuthModal}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-xs transition hover:bg-indigo-700"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
