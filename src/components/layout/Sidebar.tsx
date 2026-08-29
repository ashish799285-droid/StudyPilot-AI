import React from "react";
import { NavigationTab } from "../../types";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import { useTimer } from "../../context/TimerContext";
import { useQuizSession } from "../../context/QuizSessionContext";
import { formatSeconds } from "../../utils/pomodoroEngine";
import {
  LayoutDashboard,
  BotMessageSquare,
  CalendarDays,
  Clock,
  Brain,
  FileText,
  HelpCircle,
  Settings,
  Sparkles,
  TrendingUp,
  Flame,
  Lock,
} from "lucide-react";

interface SidebarProps {
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const { stats, activePlan } = useData();
  const { user } = useAuth();
  const { activeSession, timerState, timeRemainingSeconds } = useTimer();
  const { isQuizActive, requestTabNavigation } = useQuizSession();

  const isTimerActive = activeSession && timerState === "running";

  const navItems: { id: NavigationTab; label: string; icon: React.FC<{ className?: string }>; badge?: string; badgeColor?: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "tutor", label: "AI Tutor", icon: BotMessageSquare, badge: "Gemini" },
    { id: "planner", label: "Study Planner", icon: CalendarDays },
    { id: "timer", label: "Study Timer", icon: Clock, badge: isTimerActive ? formatSeconds(timeRemainingSeconds) : undefined },
    {
      id: "revision",
      label: "Spaced Revision",
      icon: Brain,
      badge: stats.dueRevisionCards > 0 ? `${stats.dueRevisionCards} due` : undefined,
    },
    { id: "notes", label: "Revision Notes", icon: FileText },
    {
      id: "quizzes",
      label: "Quizzes",
      icon: HelpCircle,
      badge: isQuizActive ? "LIVE" : undefined,
      badgeColor: isQuizActive ? "bg-rose-500 text-white animate-pulse" : undefined,
    },
    { id: "settings", label: "Profile & Settings", icon: Settings },
  ];

  const handleSelect = (tab: NavigationTab) => {
    requestTabNavigation(tab, () => {
      setCurrentTab(tab);
      if (setMobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    });
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:static md:translate-x-0 shrink-0 ${
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Brand logo */}
      <div className="p-6 pb-4">
        <div
          onClick={() => handleSelect("dashboard")}
          className="cursor-pointer mb-6"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-xs">
              <div className="w-3.5 h-3.5 border-2 border-white rounded-xs"></div>
            </div>
            <span className="text-xl font-black tracking-tighter text-indigo-600">STUDYPILOT</span>
          </div>
          <p className="mt-1.5 pl-0.5 text-[11px] font-normal tracking-wide text-slate-400">
            Created by — <span className="font-semibold text-slate-600">Mishra Ji</span>
          </p>
        </div>

        {/* Section label */}
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">
          WORKSPACE
        </p>

        {/* Nav list */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                id={`nav-item-${item.id}`}
                onClick={() => handleSelect(item.id)}
                className={`group flex w-full items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? "bg-slate-100 text-indigo-600 font-bold"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 transition-colors ${
                      isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                      item.badgeColor || "bg-indigo-100/80 text-indigo-700"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Pro / Plan Card */}
      <div className="mt-auto p-6 pt-0 space-y-3">
        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100/60">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
              STUDY METRICS
            </p>
            <span className="text-xs font-black text-indigo-700">{stats.activePlanProgress}%</span>
          </div>
          <p className="text-sm font-bold text-indigo-950 truncate">
            {activePlan ? activePlan.title : "Active Student Mode"}
          </p>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-indigo-200/60 mt-2">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${Math.max(stats.activePlanProgress, 6)}%` }}
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] font-bold text-indigo-600/90">
            <span className="uppercase tracking-wider text-[10px]">Tasks Done:</span>
            <span>{stats.tasksCompleted}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
