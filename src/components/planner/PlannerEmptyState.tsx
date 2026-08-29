import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { MishraJiAvatar } from "../tutor/MishraJiAvatar";
import {
  Sparkles,
  Calendar,
  BookOpen,
  ArrowRight,
  Target,
  Compass,
  Zap,
  HelpCircle,
  Coffee,
  CheckCircle2,
} from "lucide-react";

interface PlannerEmptyStateProps {
  onCreatePlan: () => void;
  onAskMishraJi: (prompt: string) => void;
}

const ROTATING_MISHRA_QUOTES = [
  "Your study room is waiting, {firstName}. 📚 Let's build today's roadmap.",
  "Your books are ready on the shelf. Your schedule isn't. 👀 Let's fix that.",
  "Mishra Ji sees an empty planner... suspicious! 😭 Give today a little structure.",
  "Ready to turn your academic goals into an actual step-by-step plan?",
  "Structure first. Stress later. Let's build your customized study routine.",
  "Your future self will thank you for organizing this week's milestones.",
  "Mishra Ji has zero tasks on your board right now. Time to generate a master plan!",
  "Big goals become easy when broken into daily bite-sized tasks.",
];

export const PlannerEmptyState: React.FC<PlannerEmptyStateProps> = ({
  onCreatePlan,
  onAskMishraJi,
}) => {
  const { user } = useAuth();
  const [quoteIndex, setQuoteIndex] = useState(0);

  const firstName = user?.name
    ? user.name.trim().replace(/^(mr\.|mrs\.|ms\.|dr\.|prof\.)\s+/i, "").split(/\s+/)[0]
    : "Student";

  // Cycle rotating quotes gently
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % ROTATING_MISHRA_QUOTES.length);
    }, 9000);
    return () => clearInterval(timer);
  }, []);

  const currentQuote = ROTATING_MISHRA_QUOTES[quoteIndex].replace("{firstName}", firstName);

  const quickTemplates = [
    {
      title: "4-Week Exam Mastery Sprint",
      desc: "Daily topic milestones & weekly retention checkpoints",
      prompt: "Create a rigorous 4-week study plan with daily milestones and weekly revision checkpoints for my upcoming exams.",
    },
    {
      title: "Comprehensive Semester Prep",
      desc: "Balanced pace across core subjects with rest intervals",
      prompt: "Help me design a balanced semester study plan covering multiple core subjects without burnout.",
    },
    {
      title: "Targeted Weak Area Blitz",
      desc: "Focused deep-dives on high-difficulty concepts",
      prompt: "I want to create a targeted 2-week intensive schedule specifically targeting my hardest topics.",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl py-6 sm:py-10 space-y-8 animate-fadeIn">
      {/* 1. Main Study Room Command Center Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 p-6 sm:p-10 shadow-sm backdrop-blur-md">
        {/* Subtle Ambient Room Accents */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          {/* Mishra Ji Avatar & Speech Bubble */}
          <div className="flex flex-col items-center shrink-0">
            <div className="relative">
              <MishraJiAvatar mood="speaking" size="lg" />
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xs">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
            </div>
            <span className="mt-2 text-xs font-bold text-slate-800">Mishra Ji</span>
            <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">
              Academic Mentor
            </span>
          </div>

          {/* Core Content & Rotating Prompt */}
          <div className="space-y-4 text-center md:text-left flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-1 text-xs font-bold text-indigo-700">
              <Compass className="h-3.5 w-3.5" />
              <span>Study Command Room &bull; Ready For Action</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              YOUR STUDY ROOM IS WAITING 📚
            </h1>

            {/* Dynamic Mishra Ji Message Box */}
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 shadow-2xs transition-all duration-500">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 shrink-0 animate-ping" />
                <p className="text-xs sm:text-sm font-semibold text-amber-950 leading-relaxed">
                  "{currentQuote}"
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 max-w-xl">
              Turn syllabus overload into a clean daily schedule. StudyPilot organizes weekly milestones, daily Pomodoro blocks, and active revision intervals for you.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <button
                type="button"
                id="planner-empty-create-btn"
                onClick={onCreatePlan}
                className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>Create Study Plan</span>
              </button>

              <button
                type="button"
                id="planner-empty-ask-tutor-btn"
                onClick={() =>
                  onAskMishraJi(
                    `Hey Mishra Ji, I don't have an active study plan yet. Can you help me plan out a study schedule for my upcoming goals?`
                  )
                }
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer"
              >
                <MishraJiAvatar mood="idle" size="sm" />
                <span>Ask Mishra Ji</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Quick-Start Planning Templates */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Quick Planning Roadmaps
          </h2>
          <span className="text-xs text-slate-400">Click any roadmap to consult Mishra Ji</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickTemplates.map((template, idx) => (
            <div
              key={idx}
              onClick={() => onAskMishraJi(template.prompt)}
              className="group relative cursor-pointer rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-2xs hover:border-indigo-300 hover:bg-indigo-50/40 hover:shadow-xs transition"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">
                  <Target className="h-4 w-4" />
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-900 transition">
                {template.title}
              </h3>
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                {template.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlannerEmptyState;
