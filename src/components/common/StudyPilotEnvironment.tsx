import React from "react";
import { useEnvironment, Atmosphere } from "../../context/EnvironmentContext";
import {
  Sun,
  Moon,
  Sunset,
  Sunrise,
  Sparkles,
  LampDesk,
  BookOpen,
  Calendar,
  Layers,
  Flame,
  CheckCircle2,
  Library,
} from "lucide-react";

export type RoomType =
  | "home" // StudyPilot Main Study Hub / Room
  | "dashboard" // Alias for home
  | "command" // Study Planner (Command Room)
  | "focus" // Study Timer (Focus Room)
  | "library" // Revision Notes (The StudyPilot Library)
  | "spaced" // Space Revision (Revision Knowledge Room)
  | "arena" // Quizzes / Challenges
  | "tutor" // Mishra Ji Room
  | "default";

interface StudyPilotEnvironmentProps {
  roomType?: RoomType;
  timerState?: "idle" | "running" | "break" | "completed" | "paused";
  isQuizActive?: boolean;
  isNoteOpen?: boolean;
  overrideAtmosphere?: Atmosphere;
  showDeskFixture?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const StudyPilotEnvironment: React.FC<StudyPilotEnvironmentProps> = ({
  roomType = "default",
  timerState = "idle",
  isQuizActive = false,
  isNoteOpen = false,
  overrideAtmosphere,
  showDeskFixture = true,
  className = "",
  children,
}) => {
  const {
    atmosphere: contextAtmosphere,
    ambientEnabled,
    lampOn,
    toggleLamp,
    reducedMotion,
  } = useEnvironment();

  const atmosphere: Atmosphere = overrideAtmosphere || contextAtmosphere || "morning";

  // Atmosphere palettes & sensory environmental configs
  const atmospheres = {
    morning: {
      roomBg: "from-amber-50/70 via-sky-50/40 to-slate-50",
      wallBorder: "border-amber-200/50",
      windowSky: "from-sky-300 via-amber-200 to-rose-200",
      windowGlow: "bg-amber-300/25",
      lampGlow: "bg-amber-200/30",
      sunbeamGlow: "from-amber-200/30 via-amber-100/10 to-transparent",
      deskWood: "from-amber-100/90 to-amber-200/70",
      timeLabel: "Morning",
      badge: "Morning Light",
      Icon: Sunrise,
      sunOrMoon: (
        <div className="absolute top-2 right-3 h-7 w-7 rounded-full bg-gradient-to-tr from-amber-300 to-yellow-100 shadow-lg shadow-amber-300/50 animate-ambient-pulse" />
      ),
    },
    sunset: {
      roomBg: "from-amber-100/50 via-rose-50/40 to-slate-100/90",
      wallBorder: "border-amber-300/60",
      windowSky: "from-indigo-600 via-rose-400 to-amber-300",
      windowGlow: "bg-amber-400/25",
      lampGlow: "bg-amber-300/40",
      sunbeamGlow: "from-amber-300/25 via-rose-200/10 to-transparent",
      deskWood: "from-amber-200/80 to-amber-300/60",
      timeLabel: "Sunset",
      badge: "Sunset Glow",
      Icon: Sunset,
      sunOrMoon: (
        <div className="absolute top-3 right-4 h-6 w-6 rounded-full bg-gradient-to-tr from-rose-300 via-amber-300 to-yellow-100 shadow-md shadow-rose-400/40" />
      ),
    },
    night: {
      roomBg: "from-slate-900/95 via-indigo-950/90 to-slate-900",
      wallBorder: "border-indigo-900/60",
      windowSky: "from-slate-950 via-indigo-950 to-blue-900",
      windowGlow: "bg-indigo-500/15",
      lampGlow: "bg-amber-300/35",
      sunbeamGlow: "from-indigo-500/10 via-blue-900/5 to-transparent",
      deskWood: "from-slate-800/90 to-indigo-950/80",
      timeLabel: "Night",
      badge: "Night Atmosphere",
      Icon: Moon,
      sunOrMoon: (
        <div className="relative">
          <div className="absolute top-2 right-4 h-6 w-6 rounded-full bg-amber-100 shadow-sm shadow-amber-100/40">
            <div className="absolute top-0 right-1 h-5 w-5 rounded-full bg-slate-950" />
          </div>
          <div className="absolute top-1 left-2 h-1 w-1 rounded-full bg-white animate-star-shimmer" />
          <div className="absolute top-4 left-5 h-1 w-1 rounded-full bg-indigo-200" />
          <div className="absolute top-2 left-8 h-1 w-1 rounded-full bg-amber-200" />
        </div>
      ),
    },
  }[atmosphere];

  // Specific Room Atmosphere Tweaks
  const isFocusRunning = roomType === "focus" && timerState === "running";
  const isFocusBreak = roomType === "focus" && timerState === "break";
  const isFocusCompleted = roomType === "focus" && timerState === "completed";
  const disableHeavyAtmosphere = isQuizActive || isFocusRunning || isNoteOpen;

  return (
    <div className={`relative min-h-full w-full transition-colors duration-1000 ${className}`}>
      {/* 1. Global Environmental Backdrop (Always in background, non-blocking, smooth 1-2s transition) */}
      {ambientEnabled && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden select-none transition-all duration-1000 ease-in-out -z-10"
        >
          {/* Base Room Gradient */}
          <div
            className={`absolute inset-0 bg-gradient-to-b ${atmospheres.roomBg} transition-all duration-1000 ease-in-out`}
          />

          {/* Architectural Wall Grid Subtle Texture */}
          <div className="absolute inset-0 bg-[radial-gradient(#6366f1_0.75px,transparent_0.75px)] [background-size:28px_28px] opacity-10 transition-opacity duration-1000" />

          {/* Sunbeam / Window Light Angle Overlay */}
          {!reducedMotion && !disableHeavyAtmosphere && (
            <div
              className={`absolute -top-16 right-0 h-[480px] w-[520px] bg-gradient-to-bl ${atmospheres.sunbeamGlow} blur-3xl opacity-60 animate-sunbeam pointer-events-none transition-all duration-1000`}
            />
          )}

          {/* Timer-Specific Dynamic Lighting Shifts */}
          {isFocusRunning && (
            <div className="absolute inset-0 bg-indigo-950/15 pointer-events-none transition-opacity duration-1000" />
          )}
          {isFocusBreak && (
            <div className="absolute inset-0 bg-teal-900/10 pointer-events-none transition-opacity duration-1000" />
          )}
          {isFocusCompleted && (
            <div className="absolute inset-0 bg-emerald-900/10 pointer-events-none transition-opacity duration-1000" />
          )}

          {/* Lamp Glow Cone */}
          {lampOn && !isQuizActive && (
            <div
              className={`absolute -top-12 left-10 h-[360px] w-[400px] rounded-full blur-3xl transition-all duration-1000 ${atmospheres.lampGlow}`}
            />
          )}

          {/* Floating Ambient Dust Motes (Subtle, slow, non-distracting) */}
          {!reducedMotion && !disableHeavyAtmosphere && (
            <div className="hidden md:block absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-1000">
              <div className="absolute top-1/4 left-1/5 h-1.5 w-1.5 rounded-full bg-white/40 blur-[0.5px] animate-ambient-float" />
              <div
                className="absolute top-1/3 right-1/4 h-2 w-2 rounded-full bg-amber-200/30 blur-[0.5px] animate-ambient-float"
                style={{ animationDelay: "3s" }}
              />
              <div
                className="absolute bottom-1/3 left-1/3 h-1.5 w-1.5 rounded-full bg-indigo-200/30 blur-[0.5px] animate-ambient-float"
                style={{ animationDelay: "6s" }}
              />
              <div
                className="absolute top-1/2 right-1/3 h-1 w-1 rounded-full bg-white/50 blur-[0.5px] animate-ambient-float"
                style={{ animationDelay: "9s" }}
              />
            </div>
          )}

          {/* Room-Specific Visual Scenic Backdrop Headers (Desktop/Tablet) */}
          {!isQuizActive && !isNoteOpen && (
            <div className="absolute top-0 inset-x-0 h-32 flex items-start justify-between px-6 opacity-80 pointer-events-none transition-opacity duration-1000">
              {/* Left Architectural Element */}
              <div className="hidden lg:flex items-end gap-3 pt-2">
                {(roomType === "home" || roomType === "dashboard" || roomType === "default") && (
                  /* Main Study Room Hub: Bookshelf, mini calendar, and warm desktop plant */
                  <div className="flex items-end gap-3.5">
                    {/* Mini Wall Calendar */}
                    <div className="flex flex-col items-center rounded-lg border border-slate-300/60 bg-white/85 p-1.5 shadow-2xs">
                      <div className="h-1.5 w-6 rounded-xs bg-indigo-600 mb-1" />
                      <Calendar className="h-4 w-4 text-slate-600" />
                    </div>

                    {/* Book Stacks on shelf */}
                    <div className="flex items-end gap-1 pb-0.5">
                      <div className="h-10 w-2.5 rounded-xs bg-indigo-700/80 shadow-2xs rotate-[-2deg]" />
                      <div className="h-12 w-3 rounded-xs bg-amber-600/80 shadow-2xs" />
                      <div className="h-9 w-2.5 rounded-xs bg-emerald-600/80 shadow-2xs rotate-[3deg]" />
                      <div className="h-11 w-3 rounded-xs bg-rose-600/80 shadow-2xs" />
                    </div>

                    {/* Steaming Mug & Succulent */}
                    <div className="flex items-end gap-2 pl-1 border-l border-slate-300/40">
                      <div className="flex flex-col items-center">
                        <div className="flex -space-x-0.5">
                          <div className="h-2.5 w-1 rounded-full bg-emerald-400 rotate-[-15deg]" />
                          <div className="h-3.5 w-1.5 rounded-full bg-emerald-500" />
                          <div className="h-2.5 w-1 rounded-full bg-emerald-400 rotate-[15deg]" />
                        </div>
                        <div className="h-2.5 w-3.5 rounded-b-md bg-stone-600/80" />
                      </div>
                      <div className="flex flex-col items-center pb-0.5">
                        <div className="h-1 w-1 rounded-full bg-slate-300/60 animate-pulse" />
                        <div className="h-3 w-3 rounded-b-sm bg-indigo-800/70 border border-indigo-400/30" />
                      </div>
                    </div>
                  </div>
                )}

                {roomType === "tutor" && (
                  /* Mishra Ji Tutor Room */
                  <div className="flex items-end gap-3">
                    <div className="flex items-end gap-1 pb-0.5">
                      <div className="h-11 w-3 rounded-xs bg-indigo-700/80 shadow-2xs" />
                      <div className="h-13 w-3.5 rounded-xs bg-amber-600/80 shadow-2xs rotate-[-2deg]" />
                      <div className="h-10 w-2.5 rounded-xs bg-emerald-600/80 shadow-2xs rotate-[3deg]" />
                    </div>
                    <div className="flex flex-col items-center pb-0.5 border-l border-slate-300/40 pl-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-300/80 animate-pulse" />
                      <div className="h-3.5 w-3.5 rounded-b-sm bg-amber-700/80 border border-amber-400/30" />
                    </div>
                  </div>
                )}

                {roomType === "command" && (
                  /* Command Room: Academic Wall Planner & Book Stack */
                  <div className="flex items-end gap-2.5">
                    {/* Mini Wall Calendar */}
                    <div className="flex flex-col items-center rounded-lg border border-slate-300/60 bg-white/80 p-1.5 shadow-2xs">
                      <div className="h-1.5 w-6 rounded-xs bg-indigo-600 mb-1" />
                      <Calendar className="h-4 w-4 text-slate-500" />
                    </div>

                    {/* Book Stacks on shelf */}
                    <div className="flex items-end gap-1 pb-0.5">
                      <div className="h-9 w-2.5 rounded-xs bg-indigo-600/70 shadow-2xs rotate-[-3deg]" />
                      <div className="h-11 w-3 rounded-xs bg-rose-500/70 shadow-2xs" />
                      <div className="h-8 w-2 rounded-xs bg-emerald-500/70 shadow-2xs rotate-[5deg]" />
                      <div className="h-10 w-2.5 rounded-xs bg-amber-500/70 shadow-2xs" />
                    </div>
                  </div>
                )}

                {roomType === "focus" && (
                  /* Focus Room: Minimalist Desk Plant & Coffee Mug */
                  <div className="flex items-end gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex -space-x-1">
                        <div className="h-3 w-1.5 rounded-full bg-emerald-400 rotate-[-20deg]" />
                        <div className="h-4 w-1.5 rounded-full bg-emerald-500" />
                        <div className="h-3 w-1.5 rounded-full bg-emerald-400 rotate-[20deg]" />
                      </div>
                      <div className="h-3 w-4 rounded-b-md bg-stone-600/80" />
                    </div>
                    {/* Steaming Mug */}
                    <div className="flex flex-col items-center pb-0.5">
                      <div className="h-1.5 w-1 rounded-full bg-slate-300/60 animate-pulse" />
                      <div className="h-3.5 w-3.5 rounded-b-sm bg-indigo-700/60 border border-indigo-400/40" />
                    </div>
                  </div>
                )}

                {(roomType === "library" || roomType === "spaced") && (
                  /* Library / Spaced Revision: Rich Bookshelf */
                  <div className="flex flex-col items-center">
                    <div className="flex items-end gap-1.5 pb-1">
                      <div className="h-11 w-3 rounded-xs bg-indigo-700/80 shadow-2xs" />
                      <div className="h-13 w-3.5 rounded-xs bg-amber-700/80 shadow-2xs rotate-[-2deg]" />
                      <div className="h-10 w-2.5 rounded-xs bg-emerald-700/80 shadow-2xs" />
                      <div className="h-12 w-3 rounded-xs bg-rose-700/80 shadow-2xs rotate-[4deg]" />
                      <div className="h-9 w-2.5 rounded-xs bg-sky-700/80 shadow-2xs" />
                      <div className="h-11 w-3 rounded-xs bg-purple-700/80 shadow-2xs" />
                    </div>
                    <div className="h-1.5 w-44 rounded-full bg-amber-950/40 border-t border-amber-900/40 shadow-xs" />
                  </div>
                )}
              </div>

              {/* Right Architectural Element: Dynamic Sky Window & Desk Lamp */}
              <div className="hidden sm:flex items-center gap-4 pt-1">
                {/* Study Room Scenic Window */}
                <div className="relative h-18 w-28 rounded-xl overflow-hidden border-2 border-slate-300/60 bg-gradient-to-b shadow-sm shadow-indigo-100/50 flex flex-col justify-between p-1">
                  <div
                    className={`absolute inset-0 bg-gradient-to-b ${atmospheres.windowSky} transition-all duration-1000 ease-in-out`}
                  >
                    {atmospheres.sunOrMoon}
                    {!reducedMotion && !disableHeavyAtmosphere && (
                      <>
                        <div className="absolute top-7 left-2 h-2 w-8 rounded-full bg-white/40 blur-[0.5px]" />
                        <div className="absolute top-5 left-6 h-2.5 w-10 rounded-full bg-white/50 blur-[0.5px]" />
                      </>
                    )}
                  </div>
                  {/* Window Grid */}
                  <div className="relative z-10 h-full w-full flex items-center justify-center">
                    <div className="h-full w-[1.5px] bg-white/70" />
                    <div className="absolute inset-x-0 h-[1.5px] bg-white/70" />
                  </div>
                </div>

                {/* Desk Lamp Element */}
                {showDeskFixture && (
                  <div
                    onClick={toggleLamp}
                    className="pointer-events-auto cursor-pointer flex flex-col items-center group transition transform hover:scale-105"
                    title={
                      lampOn
                        ? "Click to dim desk lamp"
                        : "Click to turn on warm desk lamp"
                    }
                  >
                    <div
                      className={`h-4 w-7 rounded-t-lg transition-colors duration-700 ${
                        lampOn
                          ? "bg-amber-400 text-amber-900 shadow-md shadow-amber-300"
                          : "bg-slate-400 text-slate-700"
                      }`}
                    />
                    <div className="h-6 w-1 bg-slate-500 rounded-xs" />
                    <div className="h-1.5 w-6 rounded-full bg-slate-600 shadow-xs" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Cozy Wooden Desk Trim */}
          {showDeskFixture && !isQuizActive && (
            <div
              className={`absolute bottom-0 inset-x-0 h-3 border-t ${atmospheres.wallBorder} bg-gradient-to-r ${atmospheres.deskWood} opacity-60 transition-all duration-1000`}
            />
          )}
        </div>
      )}

      {/* 2. Main Foreground Content (Clear glass/card layer with 100% readability) */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default StudyPilotEnvironment;
