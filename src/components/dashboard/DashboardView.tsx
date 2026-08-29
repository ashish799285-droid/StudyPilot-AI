import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { useTimer } from "../../context/TimerContext";
import { useEnvironment } from "../../context/EnvironmentContext";
import { formatSeconds } from "../../utils/pomodoroEngine";
import { NavigationTab } from "../../types";
import { StudyPilotEnvironment } from "../common/StudyPilotEnvironment";
import { AtmosphereSelector } from "../common/AtmosphereSelector";
import { MishraJiAvatar, MishraJiMood } from "../tutor/MishraJiAvatar";
import {
  Sparkles,
  Flame,
  Clock,
  Award,
  BookOpen,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Circle,
  ArrowRight,
  PlusCircle,
  FileText,
  HelpCircle,
  BrainCircuit,
  Brain,
  MessageSquare,
  Play,
  Pause,
  Compass,
  Trophy,
  Library,
  Zap,
  Timer,
  ChevronRight,
  Sun,
  Sunset,
  Sunrise,
  Moon,
  CheckSquare,
  Settings2,
} from "lucide-react";

interface DashboardViewProps {
  setCurrentTab: (tab: NavigationTab) => void;
  onLaunchTutorWithPrompt?: (prompt: string, subject?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  setCurrentTab,
  onLaunchTutorWithPrompt,
}) => {
  const { user } = useAuth();
  const { stats, activePlan, toggleTaskCompletion, notes } = useData();
  const { activeSession, timerState, timeRemainingSeconds, timerMode, setPendingSetup } = useTimer();
  const { atmosphere, atmosphereMode } = useEnvironment();

  // Parse user's first name for natural, friendly personalization
  const fullName = user?.name || "Scholar";
  const firstName = fullName.split(" ")[0] || "Scholar";
  const targetGoal = user?.targetGoal || "Organic Chemistry & Quantum Physics";

  // Calculate greeting and icon according to global environmental atmosphere
  const greetingConfig = {
    morning: {
      greeting: `Good morning, ${firstName} ☀️`,
      icon: Sunrise,
      badge: "Morning Daylight",
      indicatorTag: "☀️ MORNING",
      color: "text-amber-700 bg-amber-50/90 border-amber-200",
      quote: "Fresh day, fresh start. Let's make this one count.",
    },
    sunset: {
      greeting: `Good evening, ${firstName} 🌅`,
      icon: Sunset,
      badge: "Sunset Glow",
      indicatorTag: "🌅 SUNSET",
      color: "text-rose-800 bg-rose-50/90 border-rose-200",
      quote: "Sun's going down. Your goals aren't. Let's make this session count.",
    },
    night: {
      greeting: `Still studying, ${firstName}? 🌙`,
      icon: Moon,
      badge: "Night Atmosphere",
      indicatorTag: "🌙 NIGHT",
      color: "text-indigo-300 bg-slate-900/90 border-indigo-700",
      quote: "Late night session? Alright bro, let's make these minutes count.",
    },
  }[atmosphere];

  // Rotate empty-plan suggestions naturally across renders
  const [emptyPlanQuoteIndex, setEmptyPlanQuoteIndex] = useState(0);
  const emptyPlanQuotes = [
    "Your study desk is ready, but your plan is still waiting.",
    "Your books are on the shelf. Let's give today some direction. 📚",
    "Mishra Ji recommends giving your upcoming exam goals a structured roadmap.",
    "Your future self will thank you for organizing this week's study sessions.",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setEmptyPlanQuoteIndex((prev) => (prev + 1) % emptyPlanQuotes.length);
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  const todayTasks = activePlan?.weeklyMilestones?.[0]?.days?.[0] || null;
  const incompleteTasksCount = todayTasks?.tasks?.filter((t) => !t.completed).length ?? 0;
  const totalTasksCount = todayTasks?.tasks?.length ?? 0;

  // Determine Mishra Ji's contextual note & mood
  let mishraJiMood: MishraJiMood = "idle";
  let mishraJiNote = "";
  let mishraJiActionLabel = "Ask Mishra Ji";
  let mishraJiActionTab: NavigationTab = "tutor";

  if (activeSession && timerState === "running") {
    mishraJiMood = "focused";
    mishraJiNote = `You're currently in deep focus mode for "${activeSession.topic || activeSession.subject}". Protect your concentration!`;
    mishraJiActionLabel = "Open Focus Room";
    mishraJiActionTab = "timer";
  } else if ((stats.dueRevisionCards ?? 0) > 0) {
    mishraJiMood = "speaking";
    mishraJiNote = `You have ${stats.dueRevisionCards} spaced revision cards due today. A 5-minute recall sprint now locks them in long-term memory.`;
    mishraJiActionLabel = "Review Memory Vault";
    mishraJiActionTab = "revision";
  } else if (activePlan && totalTasksCount > 0 && incompleteTasksCount > 0) {
    mishraJiMood = "speaking";
    mishraJiNote = `You have ${incompleteTasksCount} task${incompleteTasksCount > 1 ? "s" : ""} waiting on today's study desk. Let's tackle them one by one!`;
    mishraJiActionLabel = "View Today's Tasks";
    mishraJiActionTab = "planner";
  } else if (activePlan && totalTasksCount > 0 && incompleteTasksCount === 0) {
    mishraJiMood = "celebrating";
    mishraJiNote = `Shabash, ${firstName}! All planned tasks completed for today. Excellent discipline. Rest up or test your skills in the Quiz Arena.`;
    mishraJiActionLabel = "Enter Quiz Arena";
    mishraJiActionTab = "quizzes";
  } else if (!activePlan) {
    mishraJiMood = "speaking";
    mishraJiNote = `${firstName}, your study desk is ready. Let's create an adaptive study plan with milestones and daily targets.`;
    mishraJiActionLabel = "Create Study Plan";
    mishraJiActionTab = "planner";
  } else {
    mishraJiMood = "idle";
    mishraJiNote = `Ready to make today count, ${firstName}? Ask me any doubt, or launch a quick active-recall sprint.`;
    mishraJiActionLabel = "Ask Mishra Ji";
    mishraJiActionTab = "tutor";
  }

  const quickPrompts = [
    {
      title: "Explain a complex concept",
      prompt: "Can you explain the difference between dynamic programming and divide-and-conquer with a simple intuitive example?",
      subject: "Computer Science",
      icon: BrainCircuit,
    },
    {
      title: "Step-by-step problem solver",
      prompt: "I have a difficult calculus problem: how do I evaluate the integral of x * e^(2x) dx using integration by parts? Please guide me step-by-step.",
      subject: "Mathematics",
      icon: Sparkles,
    },
    {
      title: "Exam Memory Mnemonics",
      prompt: "Give me the best mnemonics and memory frameworks for remembering the phases and enzymes of the Citric Acid / Krebs Cycle.",
      subject: "Biology",
      icon: Brain,
    },
  ];

  // Room Portals connecting the user to each room of the StudyPilot universe
  const roomPortals = [
    {
      id: "tutor",
      tab: "tutor" as NavigationTab,
      name: "Tutor AI",
      room: "Mishra Ji Room",
      desc: "Instant doubt solver & mentor",
      icon: MessageSquare,
      color: "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100/80",
      accent: "bg-indigo-600 text-white",
    },
    {
      id: "timer",
      tab: "timer" as NavigationTab,
      name: "Focus Timer",
      room: "Deep Focus Room",
      desc: "Pomodoro & ambient flow",
      icon: Clock,
      color: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/80",
      accent: "bg-emerald-600 text-white",
    },
    {
      id: "planner",
      tab: "planner" as NavigationTab,
      name: "AI Planner",
      room: "Command Room",
      desc: "Roadmaps & milestones",
      icon: Compass,
      color: "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100/80",
      accent: "bg-sky-600 text-white",
    },
    {
      id: "revision",
      tab: "revision" as NavigationTab,
      name: "Spaced Revision",
      room: "Memory Vault",
      desc: "Active recall & intervals",
      icon: Brain,
      color: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100/80",
      accent: "bg-amber-600 text-white",
    },
    {
      id: "notes",
      tab: "notes" as NavigationTab,
      name: "Revision Notes",
      room: "Study Library",
      desc: "Synthesized note summaries",
      icon: Library,
      color: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100/80",
      accent: "bg-purple-600 text-white",
    },
    {
      id: "quizzes",
      tab: "quizzes" as NavigationTab,
      name: "Quiz Arena",
      room: "Academic Arena",
      desc: "Timed games & challenges",
      icon: Trophy,
      color: "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100/80",
      accent: "bg-rose-600 text-white",
    },
  ];

  return (
    <StudyPilotEnvironment roomType="home">
      <div className="space-y-8 pb-16">
        {/* ========================================================================= */}
        {/* 1. HERO AREA: Environmental Study Room Welcome & Key Academic Metrics    */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-6 sm:p-8 shadow-xs backdrop-blur-xs">
          {/* Subtle Ambient Gradient Corner */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: Greeting & Target Mission */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-bold ${greetingConfig.color}`}
                >
                  <greetingConfig.icon className="h-3.5 w-3.5" />
                  <span>{greetingConfig.badge}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-100/90 px-2.5 py-0.5 text-[11px] font-black text-slate-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span>{atmosphereMode === "auto" ? `AUTO • ${greetingConfig.indicatorTag}` : greetingConfig.indicatorTag}</span>
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  StudyPilot Central Room &bull; Personal Study Space
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                {greetingConfig.greeting}
              </h1>

              <p className="text-sm sm:text-base font-medium text-slate-600 max-w-2xl">
                {targetGoal ? (
                  <>
                    Targeting mastery in <span className="font-bold text-slate-900">{targetGoal}</span>. {greetingConfig.quote}
                  </>
                ) : (
                  greetingConfig.quote
                )}
              </p>
            </div>

            {/* Right: Academic Metrics Board */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 border-t border-slate-100 pt-4 lg:border-t-0 lg:pt-0">
              {/* Day Streak */}
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 shadow-2xs">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600 shadow-2xs">
                  <Flame className="h-6 w-6 fill-orange-500 text-orange-600 animate-pulse" />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900 leading-none">
                    {stats.studyStreak}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1">
                    Day Streak
                  </p>
                </div>
              </div>

              {/* Average Accuracy */}
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 shadow-2xs">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-2xs">
                  <Award className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-black text-indigo-600 leading-none">
                    {stats.averageScore > 0 ? `${stats.averageScore}%` : "100%"}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1">
                    Accuracy
                  </p>
                </div>
              </div>

              {/* Due Spaced Revision */}
              <div
                onClick={() => setCurrentTab("revision")}
                className="group cursor-pointer flex items-center gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 shadow-2xs transition hover:bg-amber-100/70 hover:border-amber-300"
                title="Open Spaced Revision Queue"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs group-hover:scale-105 transition-transform">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-black text-amber-900 leading-none">
                    {stats.dueRevisionCards ?? 0}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 mt-1 group-hover:underline">
                    Due Today →
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. ACTIVE FOCUS BANNER (Live indicator if Pomodoro session is running)     */}
        {/* ========================================================================= */}
        {activeSession && (
          <section
            onClick={() => setCurrentTab("timer")}
            className="cursor-pointer overflow-hidden rounded-2xl border border-indigo-300 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-4 text-white shadow-lg shadow-indigo-950/20 transition hover:border-indigo-200"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/30 text-indigo-300 border border-indigo-400/40">
                  <Clock className="h-5 w-5 animate-pulse text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    <p className="text-[11px] font-black uppercase tracking-wider text-indigo-200">
                      {timerMode === "break" ? "Rest Break in Progress" : "Active Focus Session in Progress"}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-white mt-0.5 truncate max-w-md">
                    {activeSession.topic || activeSession.subject}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                <div className="text-right">
                  <p className="font-mono text-xl font-black text-amber-300 tracking-wider">
                    {formatSeconds(timeRemainingSeconds)}
                  </p>
                  <p className="text-[10px] font-semibold text-indigo-300">
                    {timerState === "running" ? "Counting down" : "Paused"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentTab("timer");
                  }}
                  className="flex items-center gap-1 rounded-xl bg-indigo-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-400 transition shadow-xs"
                >
                  <span>Resume Room</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 3. MISHRA JI'S DESK BULLETIN (Mentor Note on the Study Space)             */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-sky-50/70 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <MishraJiAvatar mood={mishraJiMood} size="lg" />
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow-2xs">
                  <Sparkles className="h-3 w-3" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-black uppercase tracking-wider text-indigo-700">
                    Mishra Ji &bull; Academic Mentor
                  </p>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.2 text-[10px] font-bold text-indigo-800">
                    Live Note
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-800 leading-relaxed max-w-2xl">
                  "{mishraJiNote}"
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                id="dashboard-btn-mishra-action"
                onClick={() => setCurrentTab(mishraJiActionTab)}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition"
              >
                <span>{mishraJiActionLabel}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                id="dashboard-btn-mishra-chat"
                onClick={() => setCurrentTab("tutor")}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                title="Open AI Tutor Chat"
              >
                <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
                <span className="hidden md:inline">Tutor Room</span>
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. CENTRAL STUDY HUB: ROOM PORTALS GRID                                   */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">
                StudyPilot Room Portals
              </h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                6 Spaces
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Click any room to transition seamlessly
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {roomPortals.map((portal) => (
              <button
                key={portal.id}
                type="button"
                id={`portal-btn-${portal.id}`}
                onClick={() => setCurrentTab(portal.tab)}
                className={`group flex flex-col items-start justify-between rounded-2xl border p-4 text-left transition shadow-2xs hover:shadow-xs hover:-translate-y-0.5 ${portal.color}`}
              >
                <div className="flex w-full items-center justify-between mb-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-2xs ${portal.accent}`}
                  >
                    <portal.icon className="h-4 w-4" />
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">{portal.name}</h3>
                  <p className="text-[10px] font-medium text-slate-500 line-clamp-1 mt-0.5">
                    {portal.room}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. STUDYPILOT GLOBAL ATMOSPHERE CONTROL                                   */}
        {/* ========================================================================= */}
        <section>
          <AtmosphereSelector variant="dashboard" />
        </section>

        {/* ========================================================================= */}
        {/* 6. MAIN DESK BENTO GRID: STUDY GOAL, NOTES, ITINERARY, ACTIVE RECALL      */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Area (8 cols): Plan & Goal + Notes Library + Quick Recall Shortcuts */}
          <div className="lg:col-span-8 space-y-6">
            {/* Card A: Study Goal & Active Plan Progress (or Inviting Empty State) */}
            {activePlan ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        STUDY GOAL & ACTIVE ROADMAP
                      </p>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        In Progress
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                      {activePlan.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {activePlan.examName} &bull; {activePlan.totalHoursPerWeek} hrs/week &bull;{" "}
                      {activePlan.subject || "All Subjects"}
                    </p>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg uppercase tracking-wider">
                        Target: {activePlan.examDate || "Upcoming Exam"}
                      </span>
                      <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-[10px] font-black rounded-lg uppercase tracking-wider">
                        Week {activePlan.weeklyMilestones?.[0]?.weekNumber || 1}
                      </span>
                      <button
                        type="button"
                        id="dashboard-btn-view-planner"
                        onClick={() => setCurrentTab("planner")}
                        className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-black rounded-lg uppercase tracking-wider hover:bg-slate-200 transition"
                      >
                        View Full Roadmap →
                      </button>
                    </div>
                  </div>

                  {/* Circular Progress Gauge */}
                  <div className="w-24 h-24 relative flex items-center justify-center shrink-0 self-center sm:self-auto">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#E2E8F0"
                        strokeWidth="4"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#4F46E5"
                        strokeWidth="4"
                        strokeDasharray={`${Math.max(stats.activePlanProgress, 5)}, 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-lg font-black text-slate-900">
                        {stats.activePlanProgress}%
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">
                        Done
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty Study Plan State: Warm, inviting, never blocking */
              <div className="rounded-3xl border border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50/40 via-white to-amber-50/30 p-6 sm:p-7 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-lg">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest text-indigo-900">
                        STUDY DESK READY
                      </p>
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                      {emptyPlanQuotes[emptyPlanQuoteIndex]}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Generate a personalized syllabus with weekly milestones, daily study time, and AI topic breakdowns whenever you're ready.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto">
                    <button
                      type="button"
                      id="dashboard-btn-create-empty-plan"
                      onClick={() => setCurrentTab("planner")}
                      className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Create Study Plan</span>
                    </button>
                    <button
                      type="button"
                      id="dashboard-btn-ask-mishra-plan"
                      onClick={() => {
                        if (onLaunchTutorWithPrompt) {
                          onLaunchTutorWithPrompt(
                            "Mishra Ji, help me organize a smart study plan for my upcoming subjects and exams. Where should we begin?",
                            "Study Strategy"
                          );
                        } else {
                          setCurrentTab("tutor");
                        }
                      }}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <span>Ask Mishra Ji</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Card B: Quick Tutor Chat + Revision Notes Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* AI Tutor Quick Chat Card */}
              <div
                onClick={() => setCurrentTab("tutor")}
                className="cursor-pointer bg-gradient-to-br from-indigo-700 via-indigo-600 to-sky-700 rounded-3xl p-6 sm:p-7 flex flex-col justify-between text-white shadow-xl shadow-indigo-100/70 hover:shadow-indigo-200 transition group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">
                      AI TUTOR ROOM &bull; GEMINI
                    </p>
                    <Sparkles className="h-4 w-4 text-amber-300" />
                  </div>
                  <h3 className="text-xl font-bold leading-tight group-hover:translate-x-0.5 transition-transform">
                    What concept can Mishra Ji explain for you right now?
                  </h3>
                </div>

                <div className="bg-white/10 p-3.5 rounded-2xl border border-white/20 mt-6 flex items-center justify-between backdrop-blur-xs group-hover:bg-white/15 transition">
                  <p className="text-xs font-medium text-indigo-100">Ask any doubt or question...</p>
                  <ArrowRight className="h-4 w-4 text-white" />
                </div>
              </div>

              {/* Revision Notes Library Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 flex flex-col shadow-xs">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Library className="h-4 w-4 text-indigo-600" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      REVISION NOTES
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentTab("notes")}
                    className="text-[11px] font-black text-indigo-600 uppercase tracking-wider hover:text-indigo-800"
                  >
                    VIEW ALL →
                  </button>
                </div>

                <div className="space-y-3 flex-1">
                  {notes.length > 0 ? (
                    notes.slice(0, 3).map((note, idx) => (
                      <div
                        key={note.id}
                        onClick={() => setCurrentTab("notes")}
                        className={`cursor-pointer transition hover:opacity-80 ${
                          idx < 2 ? "pb-3 border-b border-slate-100" : ""
                        }`}
                      >
                        <h4 className="font-bold text-slate-900 text-xs line-clamp-1">{note.topic}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                          {note.subject} &bull; {new Date(note.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-center text-xs text-slate-400">
                      <p className="font-medium">No notes created yet.</p>
                      <button
                        type="button"
                        onClick={() => setCurrentTab("notes")}
                        className="mt-2 text-indigo-600 font-bold hover:underline"
                      >
                        Generate your first note &rarr;
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card C: Active Recall Conceptual Shortcuts */}
            <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    ACTIVE RECALL SHORTCUTS
                  </p>
                  <h3 className="text-base font-black text-slate-900 mt-0.5">
                    Launch Direct Study Sprints with Mishra Ji
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentTab("tutor")}
                  className="text-xs font-black text-indigo-600 uppercase tracking-wider hover:text-indigo-800"
                >
                  OPEN TUTOR →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {quickPrompts.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (onLaunchTutorWithPrompt) {
                        onLaunchTutorWithPrompt(item.prompt, item.subject);
                      } else {
                        setCurrentTab("tutor");
                      }
                    }}
                    className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition-all hover:border-indigo-300 hover:bg-indigo-50/40 hover:shadow-xs group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100/70 text-indigo-800">
                          {item.subject}
                        </span>
                        <item.icon className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs group-hover:text-indigo-700">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                        {item.prompt}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-indigo-600 pt-2 border-t border-slate-200/50">
                      <span>Start Sprint</span>
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Area (4 cols): Today's Study Desk Schedule & Quick Focus Hub */}
          <div className="lg:col-span-4 bg-slate-900 rounded-3xl p-6 sm:p-7 text-white overflow-hidden relative shadow-xl flex flex-col justify-between">
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    TODAY'S ITINERARY
                  </p>
                  <h3 className="text-sm font-bold text-white mt-0.5">
                    {todayTasks?.dayName || "Active Study Day"}
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-950/80 px-2 py-1 rounded-md border border-indigo-800/60">
                  {incompleteTasksCount} Left
                </span>
              </div>

              {/* Task Items */}
              <div className="space-y-4">
                {todayTasks && todayTasks.tasks.length > 0 ? (
                  todayTasks.tasks.map((task, idx) => (
                    <div
                      key={task.id}
                      className={`flex gap-3.5 transition group ${
                        task.completed ? "opacity-40" : "hover:opacity-100"
                      }`}
                    >
                      <div
                        className={`w-1.5 h-12 rounded-full shrink-0 ${
                          idx === 0
                            ? "bg-indigo-500"
                            : idx === 1
                            ? "bg-emerald-500"
                            : "bg-purple-500"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-indigo-300">
                            {task.durationMinutes} mins &bull; {task.type}
                          </p>
                          <div className="flex items-center gap-1.5">
                            {!task.completed && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPendingSetup({
                                    subject: activePlan?.subject || todayTasks.focusSubject || "Study Plan",
                                    topic: task.title,
                                    taskTitle: task.title,
                                    planId: activePlan?.id,
                                    taskId: task.id,
                                    taskDurationMinutes: task.durationMinutes,
                                    priority: task.priority,
                                  });
                                  setCurrentTab("timer");
                                }}
                                className="rounded bg-white/10 px-2 py-0.5 text-[9px] font-bold text-indigo-200 hover:bg-white/20 transition"
                                title="Start Focus Timer"
                              >
                                ⏱️ Focus
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                activePlan &&
                                toggleTaskCompletion(
                                  activePlan.id,
                                  activePlan.weeklyMilestones[0].weekNumber,
                                  todayTasks.dayName,
                                  task.id
                                )
                              }
                              className="text-slate-400 hover:text-emerald-400 transition"
                              title={task.completed ? "Mark as incomplete" : "Mark as completed"}
                            >
                              {task.completed ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                              ) : (
                                <Circle className="h-4 w-4 text-slate-500 shrink-0" />
                              )}
                            </button>
                          </div>
                        </div>
                        <p
                          onClick={() =>
                            activePlan &&
                            toggleTaskCompletion(
                              activePlan.id,
                              activePlan.weeklyMilestones[0].weekNumber,
                              todayTasks.dayName,
                              task.id
                            )
                          }
                          className={`font-bold text-xs leading-snug mt-0.5 cursor-pointer ${
                            task.completed ? "line-through text-slate-400" : "text-white"
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                          Focus: {task.priority} Priority
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400 space-y-1">
                    <p className="font-bold text-slate-200">No scheduled tasks for today</p>
                    <p>Create a plan to organize your daily schedule.</p>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-6 border-t border-white/10 flex flex-col gap-2.5">
                <button
                  type="button"
                  id="dashboard-btn-open-focus-timer"
                  onClick={() => setCurrentTab("timer")}
                  className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-indigo-700 active:scale-[0.99] transition shadow-xs flex items-center justify-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  <span>Open Focus Timer</span>
                </button>
                <button
                  type="button"
                  id="dashboard-btn-go-to-planner"
                  onClick={() => setCurrentTab("planner")}
                  className="w-full py-2.5 bg-white/10 text-slate-200 rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-white/20 active:scale-[0.99] transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Compass className="h-3.5 w-3.5" />
                  <span>{activePlan ? "Manage Study Plan" : "Generate New Plan"}</span>
                </button>
              </div>
            </div>

            {/* Decorative Ambient Glow */}
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
          </div>
        </div>
      </div>
    </StudyPilotEnvironment>
  );
};

