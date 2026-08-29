import React from "react";
import { useEnvironment, AtmosphereMode, Atmosphere } from "../../context/EnvironmentContext";
import { Sun, Moon, Sunset, Sunrise, Sparkles, Settings2, Clock, Check } from "lucide-react";

interface AtmosphereSelectorProps {
  variant?: "dashboard" | "settings" | "compact";
  className?: string;
}

export const AtmosphereSelector: React.FC<AtmosphereSelectorProps> = ({
  variant = "dashboard",
  className = "",
}) => {
  const { atmosphere, atmosphereMode, setAtmosphereMode, lampOn, toggleLamp } = useEnvironment();

  const modes: {
    id: AtmosphereMode;
    label: string;
    icon: React.ElementType;
    emoji: string;
    desc: string;
    activeTone: string;
    badgeText: string;
  }[] = [
    {
      id: "morning",
      label: "Morning",
      icon: Sunrise,
      emoji: "☀️",
      desc: "Soft daylight & gentle sunbeam for fresh focus",
      activeTone: "border-amber-300 bg-amber-50/90 text-amber-900 ring-2 ring-amber-400/40 shadow-sm",
      badgeText: "Fresh Start",
    },
    {
      id: "sunset",
      label: "Sunset",
      icon: Sunset,
      emoji: "🌅",
      desc: "Golden-hour lighting & cozy study atmosphere",
      activeTone: "border-rose-300 bg-gradient-to-br from-amber-50 to-rose-50/80 text-rose-950 ring-2 ring-rose-400/40 shadow-sm",
      badgeText: "Golden Hour",
    },
    {
      id: "night",
      label: "Night",
      icon: Moon,
      emoji: "🌙",
      desc: "Midnight blue, lamp glow & quiet deep focus",
      activeTone: "border-indigo-800 bg-slate-900 text-indigo-100 ring-2 ring-indigo-500/40 shadow-sm",
      badgeText: "Deep Night",
    },
    {
      id: "auto",
      label: "Auto",
      icon: Settings2,
      emoji: "⚙️",
      desc: "Automatically syncs with your local time",
      activeTone: "border-indigo-400 bg-indigo-50/90 text-indigo-950 ring-2 ring-indigo-500/40 shadow-sm",
      badgeText: `Auto (${atmosphere.toUpperCase()})`,
    },
  ];

  if (variant === "compact") {
    return (
      <div className={`inline-flex items-center rounded-2xl border border-slate-200/80 bg-white/90 p-1 shadow-2xs backdrop-blur-xs ${className}`}>
        {modes.map((m) => {
          const isSelected = atmosphereMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              id={`atmosphere-compact-${m.id}`}
              onClick={() => setAtmosphereMode(m.id)}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${
                isSelected
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
              title={`${m.label}: ${m.desc}`}
            >
              <span>{m.emoji}</span>
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 p-5 sm:p-6 shadow-xs backdrop-blur-md transition-all duration-700 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">
              STUDYPILOT ATMOSPHERE
            </h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              {atmosphereMode === "auto" ? `AUTO • ${atmosphere.toUpperCase()}` : atmosphere.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Control the room lighting, ambient warmth, and mood across all StudyPilot spaces.
          </p>
        </div>

        {/* Current status pill */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>Local Mode:</span>
            <strong className="font-bold text-indigo-600 uppercase">
              {atmosphereMode === "auto" ? `AUTO (${atmosphere})` : atmosphereMode}
            </strong>
          </div>
        </div>
      </div>

      {/* Grid of Atmosphere Options */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
        {modes.map((m) => {
          const isSelected = atmosphereMode === m.id;
          const Icon = m.icon;

          return (
            <button
              key={m.id}
              type="button"
              id={`atmosphere-btn-${m.id}`}
              onClick={() => setAtmosphereMode(m.id)}
              className={`group relative flex flex-col items-start justify-between rounded-2xl border p-4 text-left transition-all duration-300 cursor-pointer ${
                isSelected
                  ? m.activeTone
                  : "border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 hover:border-slate-300 text-slate-700"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-xl sm:text-2xl">{m.emoji}</span>
                {isSelected && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow-2xs">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs sm:text-sm font-bold tracking-tight">
                    {m.label}
                  </p>
                  {m.id === "auto" && atmosphereMode === "auto" && (
                    <span className="rounded-full bg-indigo-200/60 px-1.5 py-0.2 text-[9px] font-extrabold uppercase text-indigo-800">
                      {atmosphere}
                    </span>
                  )}
                </div>
                <p
                  className={`text-[11px] leading-snug line-clamp-2 ${
                    isSelected
                      ? m.id === "night"
                        ? "text-slate-300"
                        : "text-slate-700 font-medium"
                      : "text-slate-500"
                  }`}
                >
                  {m.desc}
                </p>
              </div>

              {isSelected && (
                <div className="mt-2 w-full pt-1.5 border-t border-current/15">
                  <span className="text-[10px] font-black uppercase tracking-wider opacity-85">
                    ✓ Active Global Mode
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Helper Footer explaining the Auto schedule and persistence */}
      <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-2xl bg-slate-50/90 border border-slate-200/60 px-4 py-2.5 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span>
            <strong>Global Persistence:</strong> Your atmosphere persists across Tutor AI, Planner, Timer, Notes, Revision, and Quizzes.
          </span>
        </div>
        <div className="text-[10px] text-slate-400 font-mono">
          Auto Schedule: Morning (05:00-16:59) &bull; Sunset (17:00-19:29) &bull; Night (19:30-04:59)
        </div>
      </div>
    </div>
  );
};

export default AtmosphereSelector;
