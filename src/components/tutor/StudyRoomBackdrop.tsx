import React from "react";
import { Sun, Moon, Sunset, Sunrise, Sparkles, LampDesk, BookOpen, Coffee } from "lucide-react";

export type StudyRoomTime = "morning" | "afternoon" | "evening" | "night";

interface StudyRoomBackdropProps {
  timeOfDay: StudyRoomTime;
  lampOn: boolean;
  onToggleLamp?: () => void;
  className?: string;
}

export const StudyRoomBackdrop: React.FC<StudyRoomBackdropProps> = ({
  timeOfDay,
  lampOn,
  onToggleLamp,
  className = "",
}) => {
  // Theme palette based on time of day
  const themes = {
    morning: {
      roomBg: "from-amber-50/70 via-sky-50/40 to-slate-50",
      wallBorder: "border-amber-200/50",
      windowSky: "from-sky-300 via-amber-200 to-rose-200",
      windowGlow: "bg-amber-300/20",
      deskWood: "from-amber-100/80 to-amber-200/60",
      ambientTitle: "Morning Sunbeam Study Room",
      timeLabel: "Morning",
      Icon: Sunrise,
      sunOrMoon: (
        <div className="absolute top-2 right-3 h-7 w-7 rounded-full bg-gradient-to-tr from-amber-300 to-yellow-100 shadow-lg shadow-amber-300/50 animate-pulse" />
      ),
    },
    afternoon: {
      roomBg: "from-sky-50/60 via-indigo-50/30 to-slate-50",
      wallBorder: "border-sky-200/50",
      windowSky: "from-sky-400 via-sky-300 to-blue-200",
      windowGlow: "bg-sky-200/20",
      deskWood: "from-stone-100/80 to-amber-100/70",
      ambientTitle: "Daylight Focus Study Room",
      timeLabel: "Afternoon",
      Icon: Sun,
      sunOrMoon: (
        <div className="absolute top-2 right-4 h-6 w-6 rounded-full bg-gradient-to-tr from-yellow-200 to-white shadow-md shadow-yellow-200/60" />
      ),
    },
    evening: {
      roomBg: "from-amber-100/50 via-rose-50/40 to-slate-100/90",
      wallBorder: "border-amber-300/60",
      windowSky: "from-indigo-600 via-rose-400 to-amber-300",
      windowGlow: "bg-amber-400/25",
      deskWood: "from-amber-200/80 to-amber-300/60",
      ambientTitle: "Sunset Golden Hour Study Room",
      timeLabel: "Evening",
      Icon: Sunset,
      sunOrMoon: (
        <div className="absolute top-3 right-4 h-6 w-6 rounded-full bg-gradient-to-tr from-rose-300 via-amber-300 to-yellow-100 shadow-md shadow-rose-400/40" />
      ),
    },
    night: {
      roomBg: "from-slate-900/95 via-indigo-950/90 to-slate-900",
      wallBorder: "border-indigo-900/60",
      windowSky: "from-slate-950 via-indigo-950 to-blue-900",
      windowGlow: "bg-indigo-500/10",
      deskWood: "from-slate-800/90 to-indigo-950/80",
      ambientTitle: "Midnight Deep Focus Study Room",
      timeLabel: "Night",
      Icon: Moon,
      sunOrMoon: (
        <div className="relative">
          {/* Crescent Moon */}
          <div className="absolute top-2 right-4 h-6 w-6 rounded-full bg-amber-100 shadow-sm shadow-amber-100/40">
            <div className="absolute top-0 right-1 h-5 w-5 rounded-full bg-slate-950" />
          </div>
          {/* Tiny Stars */}
          <div className="absolute top-1 left-2 h-1 w-1 rounded-full bg-white animate-ping" />
          <div className="absolute top-4 left-5 h-1 w-1 rounded-full bg-indigo-200" />
          <div className="absolute top-2 left-8 h-1 w-1 rounded-full bg-amber-200" />
        </div>
      ),
    },
  }[timeOfDay];

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden bg-gradient-to-b ${themes.roomBg} transition-colors duration-700 select-none ${className}`}
    >
      {/* 1. Subtle Architectural Room Grid & Wall Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#6366f1_0.75px,transparent_0.75px)] [background-size:24px_24px] opacity-15" />

      {/* 2. Interactive / Aesthetic Desk Lamp Light Cone */}
      {lampOn && (
        <div
          className={`absolute -top-10 left-12 h-[340px] w-[380px] rounded-full blur-3xl transition-opacity duration-700 ${
            timeOfDay === "night" ? "bg-amber-300/25" : "bg-amber-200/35"
          }`}
        />
      )}

      {/* 3. Top Decorative Study Room Elements (Window, Shelf, Lamp) */}
      <div className="absolute top-0 inset-x-0 h-36 flex items-start justify-between px-6 opacity-85 transition-all">
        {/* Left Side: Bookshelf & Academic Items */}
        <div className="hidden md:flex items-end gap-3 pt-3">
          {/* Bookshelf structure */}
          <div className="flex flex-col items-center">
            {/* Shelf Items */}
            <div className="flex items-end gap-1.5 pb-1">
              {/* Stacked and upright books */}
              <div className="h-10 w-2.5 rounded-xs bg-indigo-500/80 shadow-2xs rotate-[-4deg]" title="Algorithms & AI" />
              <div className="h-12 w-3 rounded-xs bg-rose-500/80 shadow-2xs" title="Organic Chemistry" />
              <div className="h-9 w-2.5 rounded-xs bg-emerald-500/80 shadow-2xs rotate-[6deg]" title="Linear Algebra" />
              <div className="h-11 w-3 rounded-xs bg-amber-500/80 shadow-2xs" title="Physics Foundations" />
              <div className="h-8 w-2.5 rounded-xs bg-sky-500/80 shadow-2xs" title="Notes" />

              {/* Mini Succulent Plant */}
              <div className="ml-2 flex flex-col items-center">
                <div className="flex -space-x-1">
                  <div className="h-3 w-1.5 rounded-full bg-emerald-400 rotate-[-20deg]" />
                  <div className="h-4 w-1.5 rounded-full bg-emerald-500" />
                  <div className="h-3 w-1.5 rounded-full bg-emerald-400 rotate-[20deg]" />
                </div>
                <div className="h-3 w-4 rounded-b-md bg-amber-700/80 border-t border-amber-600" />
              </div>
            </div>

            {/* Shelf Wood Beam */}
            <div className="h-1.5 w-40 rounded-full bg-amber-900/30 border-t border-amber-800/40 shadow-xs" />
          </div>

          {/* Steaming Coffee Mug */}
          <div className="flex flex-col items-center pb-1">
            <div className="h-1.5 w-1 rounded-full bg-slate-300/60 animate-pulse" />
            <div className="flex items-center">
              <div className="h-4 w-4 rounded-b-md bg-indigo-600/70 border border-indigo-400/50 shadow-2xs" />
              <div className="h-2 w-1 rounded-r-sm border-r border-t border-b border-indigo-400/50 -ml-0.5" />
            </div>
          </div>
        </div>

        {/* Center / Right: Dynamic Study Window */}
        <div className="hidden sm:flex items-center gap-4 pt-2">
          {/* Study Room Window with View */}
          <div className="relative h-20 w-32 rounded-xl overflow-hidden border-2 border-slate-300/60 bg-gradient-to-b shadow-sm shadow-indigo-100/50 flex flex-col justify-between p-1">
            {/* Outdoor Sky Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-b ${themes.windowSky} transition-all duration-700`}>
              {themes.sunOrMoon}
              {/* Drifting subtle cloud */}
              <div className="absolute top-8 left-2 h-2.5 w-9 rounded-full bg-white/40 blur-[0.5px]" />
              <div className="absolute top-6 left-6 h-3 w-11 rounded-full bg-white/50 blur-[0.5px]" />
            </div>

            {/* Window Pane Grid Cross */}
            <div className="relative z-10 h-full w-full flex items-center justify-center">
              <div className="h-full w-[1.5px] bg-white/70" />
              <div className="absolute inset-x-0 h-[1.5px] bg-white/70" />
            </div>
          </div>

          {/* Desk Lamp Element with Click Target */}
          <div
            onClick={onToggleLamp}
            className="pointer-events-auto cursor-pointer flex flex-col items-center group transition transform hover:scale-105"
            title={lampOn ? "Click to turn off desk lamp" : "Click to turn on warm desk lamp"}
          >
            {/* Lamp Shade */}
            <div
              className={`h-4 w-7 rounded-t-lg transition-colors ${
                lampOn ? "bg-amber-400 text-amber-900 shadow-md shadow-amber-300" : "bg-slate-400 text-slate-700"
              }`}
            />
            {/* Lamp Stem */}
            <div className="h-6 w-1 bg-slate-500 rounded-xs" />
            {/* Lamp Base */}
            <div className="h-1.5 w-6 rounded-full bg-slate-600 shadow-xs" />
          </div>
        </div>
      </div>

      {/* 4. Bottom Cozy Wooden Study Desk Surface */}
      <div
        className={`absolute bottom-0 inset-x-0 h-4 border-t ${themes.wallBorder} bg-gradient-to-r ${themes.deskWood} opacity-70 transition-all`}
      />
    </div>
  );
};
