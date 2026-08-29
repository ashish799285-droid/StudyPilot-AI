import React from "react";
import { MishraJiAvatar } from "./MishraJiAvatar";
import { StudyRoomTime } from "./StudyRoomBackdrop";
import {
  Sparkles,
  Zap,
  Upload,
  BookOpen,
  HelpCircle,
  Lightbulb,
  FileText,
  Target,
  ArrowRight,
  Brain,
} from "lucide-react";

interface StudyRoomEmptyStateProps {
  studentFirstName: string;
  timeOfDay: StudyRoomTime;
  onSelectPrompt: (prompt: string) => void;
  onUploadClick: () => void;
  loading: boolean;
}

export const StudyRoomEmptyState: React.FC<StudyRoomEmptyStateProps> = ({
  studentFirstName,
  timeOfDay,
  onSelectPrompt,
  onUploadClick,
  loading,
}) => {
  const getGreeting = () => {
    const name = studentFirstName ? `, ${studentFirstName}` : "";
    switch (timeOfDay) {
      case "morning":
        return {
          title: `Good morning${name} 🌅`,
          subtitle: "Ready to warm up your brain and make meaningful study progress?",
        };
      case "afternoon":
        return {
          title: `Afternoon study session${name}? ☀️`,
          subtitle: "Nice! Let's make this session count with high-yield learning.",
        };
      case "evening":
        return {
          title: `Evening study session${name} 🌇`,
          subtitle: "I like the dedication. What concept or problem are we mastering?",
        };
      case "night":
        return {
          title: `Late-night study session${name} 🌙`,
          subtitle: "Let's keep this calm, focused, and get you feeling completely confident.",
        };
      default:
        return {
          title: `Hey${name} 👋`,
          subtitle: "I'm Mishra Ji, your personal StudyPilot tutor. What are we working on today?",
        };
    }
  };

  const greeting = getGreeting();

  const starterCards = [
    {
      category: "Explain a concept",
      icon: Lightbulb,
      color: "text-amber-600 bg-amber-50 border-amber-200",
      prompt: "Can you explain how gradient descent and loss optimization work using an intuitive, real-world analogy?",
      description: "Break down difficult theories into crystal-clear intuition and simple analogies",
    },
    {
      category: "Solve step-by-step",
      icon: Brain,
      color: "text-indigo-600 bg-indigo-50 border-indigo-200",
      prompt: "Can you walk me step-by-step through solving quadratic equations with complex numbers?",
      description: "Understand the derivation, identify formulas, and avoid common exam traps",
    },
    {
      category: "Study with me",
      icon: BookOpen,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      prompt: "I have an exam in two weeks. Can you help me prioritize high-yield topics and build an active study strategy?",
      description: "Create structured roadmaps, prioritize yields, and build active recall drills",
    },
    {
      category: "Test my knowledge",
      icon: Target,
      color: "text-rose-600 bg-rose-50 border-rose-200",
      prompt: "Can you quiz me with 3 challenging questions on photosynthesis and cellular respiration to test my understanding?",
      description: "Socratic questioning, concept checks, and diagnostic practice questions",
    },
  ];

  return (
    <div className="relative z-10 flex h-full flex-col items-center justify-center p-4 sm:p-6 text-center max-w-2xl mx-auto animate-in fade-in-50 duration-300">
      {/* 1. Mishra Ji Welcome Card */}
      <div className="relative mb-6 flex flex-col items-center">
        {/* Mishra Ji Avatar in Study Room */}
        <div className="relative mb-3">
          <MishraJiAvatar mood="focused" size="xl" showStatusBadge />
          {/* Subtle desk lamp badge */}
          <div className="absolute -bottom-1 -right-1 rounded-full bg-sky-500 p-1 text-white shadow-sm border border-white">
            <Sparkles className="h-3 w-3" />
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
          {greeting.title}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-md leading-relaxed">
          I&apos;m <strong className="text-sky-600 font-bold">Mishra Ji</strong> &mdash; your personal StudyPilot tutor. {greeting.subtitle}
        </p>
      </div>

      {/* 2. Document Analysis Banner */}
      <div
        onClick={onUploadClick}
        className="group mb-5 w-full cursor-pointer rounded-2xl border-2 border-dashed border-indigo-200 bg-white/90 p-4 transition-all hover:border-indigo-400 hover:bg-indigo-50/50 hover:shadow-md shadow-xs backdrop-blur-xs text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition">
                Have study material or homework?
              </h4>
              <p className="text-[11px] text-slate-500">
                Drop or attach PDFs, slides, Word docs, images or notes to analyze with Mishra Ji
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
            Upload Notes <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>

      {/* 3. Starter Question Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
        {starterCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <button
              key={i}
              type="button"
              disabled={loading}
              onClick={() => onSelectPrompt(card.prompt)}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-2xs backdrop-blur-xs transition-all hover:border-indigo-300 hover:bg-indigo-50/40 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-lg border ${card.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition">
                    {card.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                  {card.description}
                </p>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[10px] font-semibold text-indigo-600 pt-1.5 border-t border-slate-100 group-hover:border-indigo-100">
                <span className="truncate pr-2 italic text-slate-400 group-hover:text-indigo-500">
                  &ldquo;{card.prompt.slice(0, 38)}...&rdquo;
                </span>
                <ArrowRight className="h-3 w-3 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
