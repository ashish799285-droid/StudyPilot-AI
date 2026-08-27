import React from "react";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { NavigationTab } from "../../types";
import {
  Sparkles,
  Flame,
  Clock,
  Award,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Circle,
  ArrowRight,
  PlusCircle,
  FileText,
  HelpCircle,
  BrainCircuit,
  MessageSquare,
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
  const { stats, activePlan, toggleTaskCompletion, notes, quizResults } = useData();

  const todayTasks = activePlan?.weeklyMilestones?.[0]?.days?.[0] || null;
  const userName = (user?.name || "Alex").toUpperCase();
  const targetGoal = user?.targetGoal || "Organic Chemistry & Quantum Physics";

  const quickPrompts = [
    {
      title: "Explain a complex concept",
      prompt: "Can you explain the difference between dynamic programming and divide-and-conquer with a simple intuitive example?",
      subject: "Computer Science",
    },
    {
      title: "Step-by-step problem solver",
      prompt: "I have a difficult calculus problem: how do I evaluate the integral of x * e^(2x) dx using integration by parts? Please guide me step-by-step.",
      subject: "Mathematics",
    },
    {
      title: "Exam Memory Mnemonics",
      prompt: "Give me the best mnemonics and memory frameworks for remembering the phases and enzymes of the Citric Acid / Krebs Cycle.",
      subject: "Biology",
    },
  ];

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* 1. Bold Hero Section */}
      <section className="flex flex-col sm:flex-row justify-between sm:items-end gap-6 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tightest leading-none mb-2 text-slate-900">
            HI, {userName}.
          </h1>
          <p className="text-base sm:text-lg font-medium text-slate-400">
            Ready to master {targetGoal} today?
          </p>
        </div>

        <div className="flex items-center gap-8 sm:gap-10 sm:text-right shrink-0">
          <div>
            <p className="text-4xl sm:text-5xl font-black text-indigo-600 leading-none">
              {stats.studyStreak}
            </p>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">
              Day Streak
            </p>
          </div>
          <div className="h-10 w-px bg-slate-200 hidden sm:block" />
          <div>
            <p className="text-4xl sm:text-5xl font-black text-indigo-600 leading-none">
              {stats.averageScore > 0 ? `${stats.averageScore}%` : "100%"}
            </p>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">
              Accuracy
            </p>
          </div>
        </div>
      </section>

      {/* 2. Bento Grid of Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): AI Tutor Quick Chat + Revision Notes + Study Goal */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* AI Tutor Quick Chat Card */}
          <div
            onClick={() => setCurrentTab("tutor")}
            className="cursor-pointer bg-indigo-600 rounded-3xl p-6 sm:p-7 flex flex-col justify-between text-white shadow-xl shadow-indigo-100/70 hover:shadow-indigo-200 transition group"
          >
            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-widest opacity-60">
                AI TUTOR QUICK CHAT
              </p>
              <h3 className="text-2xl font-bold leading-tight group-hover:translate-x-0.5 transition-transform">
                What can I help you understand right now?
              </h3>
            </div>

            <div className="bg-white/10 p-3.5 rounded-2xl border border-white/20 mt-6 flex items-center justify-between backdrop-blur-xs">
              <p className="text-sm opacity-80 font-medium">Ask Gemini any concept...</p>
              <Sparkles className="h-4 w-4 opacity-80" />
            </div>
          </div>

          {/* Revision Notes Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 flex flex-col shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                REVISION NOTES
              </p>
              <button
                type="button"
                onClick={() => setCurrentTab("notes")}
                className="text-[11px] font-black text-indigo-600 uppercase tracking-wider hover:text-indigo-800"
              >
                VIEW ALL
              </button>
            </div>

            <div className="space-y-3.5 flex-1">
              {notes.slice(0, 3).map((note, idx) => (
                <div
                  key={note.id}
                  onClick={() => setCurrentTab("notes")}
                  className={`cursor-pointer transition hover:opacity-80 ${
                    idx < 2 ? "pb-3.5 border-b border-slate-100" : ""
                  }`}
                >
                  <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{note.topic}</h4>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">
                    {note.subject} • {new Date(note.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Study Goal & Active Plan Progress (Spans 2 columns) */}
          <div className="col-span-1 sm:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xs">
            <div className="space-y-1.5 flex-1">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                STUDY GOAL & ACTIVE PLAN
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                {activePlan ? activePlan.title : "High Performance Study Plan"}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {activePlan ? activePlan.examName : "Final Semester Examinations"} •{" "}
                {activePlan ? `${activePlan.totalHoursPerWeek} hrs/week` : "Flexible Pace"}
              </p>

              <div className="flex flex-wrap gap-2 pt-3">
                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg uppercase tracking-wider">
                  {activePlan ? `Target: ${activePlan.examDate}` : "Active Session"}
                </span>
                <span className="px-2.5 py-1 bg-rose-50 text-rose-600 text-[10px] font-black rounded-lg uppercase tracking-wider">
                  High Priority
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentTab("planner")}
                  className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-black rounded-lg uppercase tracking-wider hover:bg-slate-200 transition"
                >
                  Edit Plan →
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
              <span className="absolute text-lg font-black text-slate-900">
                {stats.activePlanProgress}%
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Today's Itinerary in Slate 900 Dark Card */}
        <div className="lg:col-span-4 bg-slate-900 rounded-3xl p-6 sm:p-7 text-white overflow-hidden relative shadow-xl flex flex-col justify-between">
          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                TODAY'S ITINERARY
              </p>
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                {todayTasks?.dayName || "Active Day"}
              </span>
            </div>

            <div className="space-y-5">
              {todayTasks && todayTasks.tasks.length > 0 ? (
                todayTasks.tasks.map((task, idx) => (
                  <div
                    key={task.id}
                    onClick={() =>
                      activePlan &&
                      toggleTaskCompletion(
                        activePlan.id,
                        activePlan.weeklyMilestones[0].weekNumber,
                        todayTasks.dayName,
                        task.id
                      )
                    }
                    className={`flex gap-3.5 cursor-pointer transition ${
                      task.completed ? "opacity-40" : "hover:opacity-90"
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
                          {task.durationMinutes} mins • {task.type}
                        </p>
                        {task.completed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        )}
                      </div>
                      <p
                        className={`font-bold text-sm leading-snug mt-0.5 ${
                          task.completed ? "line-through text-slate-400" : "text-white"
                        }`}
                      >
                        {task.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        Focus: {task.priority} Priority
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 space-y-1">
                  <p className="font-bold text-slate-200">No scheduled tasks for today</p>
                  <p>Generate a plan to view your timeline.</p>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-white/10">
              <button
                type="button"
                id="dashboard-btn-create-plan"
                onClick={() => setCurrentTab("planner")}
                className="w-full py-3.5 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-100 active:scale-[0.99] transition shadow-xs"
              >
                Generate New Plan
              </button>
            </div>
          </div>

          {/* Decorative Glow */}
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        </div>
      </div>

      {/* 3. Quick AI Diagnostic & Discussion Prompts */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
              ACTIVE RECALL SHORTCUTS
            </p>
            <h3 className="text-lg font-black text-slate-900 mt-0.5">
              Launch Direct Study Sessions
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
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100/70 text-indigo-800 inline-block mb-2">
                  {item.subject}
                </span>
                <h4 className="font-bold text-slate-900 text-sm group-hover:text-indigo-700">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                  {item.prompt}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-indigo-600 pt-2 border-t border-slate-200/50">
                <span>Start Session</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
