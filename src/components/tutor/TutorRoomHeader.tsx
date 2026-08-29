import React, { useState } from "react";
import { MishraJiAvatar, MishraJiMood } from "./MishraJiAvatar";
import { StudyRoomTime } from "./StudyRoomBackdrop";
import {
  Plus,
  Trash2,
  Clock,
  Sun,
  Moon,
  Sunset,
  Sunrise,
  LampDesk,
  Sparkles,
  History,
  Volume2,
  VolumeX,
  Settings2,
  ChevronDown,
  Layers,
} from "lucide-react";

interface TutorRoomHeaderProps {
  mishraJiMood?: MishraJiMood;
  arloMood?: MishraJiMood;
  timeOfDay: StudyRoomTime;
  setTimeOfDay: (time: StudyRoomTime) => void;
  isAutoTime: boolean;
  setIsAutoTime: (auto: boolean) => void;
  lampOn: boolean;
  setLampOn?: (on: boolean) => void;
  toggleLamp?: () => void;
  onNewChat: () => void;
  onOpenHistory: () => void;
  onClearChat: () => void;
  hasMessages: boolean;
  academicLevel: string;
  setAcademicLevel: (level: string) => void;
  tutorTone: string;
  setTutorTone: (tone: string) => void;
  selectedSubject: string;
  sessionTitle?: string;
  totalConversationsCount: number;
}

export const TutorRoomHeader: React.FC<TutorRoomHeaderProps> = ({
  mishraJiMood,
  arloMood = "idle",
  timeOfDay,
  setTimeOfDay,
  isAutoTime,
  setIsAutoTime,
  lampOn,
  setLampOn,
  toggleLamp,
  onNewChat,
  onOpenHistory,
  onClearChat,
  hasMessages,
  academicLevel,
  setAcademicLevel,
  tutorTone,
  setTutorTone,
  selectedSubject,
  sessionTitle,
  totalConversationsCount,
}) => {
  const currentMood = mishraJiMood || arloMood;
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);

  const timeIcons = {
    morning: Sunrise,
    afternoon: Sun,
    evening: Sunset,
    night: Moon,
  };

  const CurrentTimeIcon = timeIcons[timeOfDay] || Sun;

  return (
    <header className="relative z-20 flex flex-wrap items-center justify-between border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-3 sm:px-5 py-2.5 shadow-xs transition-all">
      {/* 1. Tutor Identity & Room Status */}
      <div className="flex items-center gap-3 min-w-0">
        <MishraJiAvatar mood={currentMood} size="md" showStatusBadge />

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              <span>Mishra Ji</span>
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 border border-sky-200/60">
                Personal AI Tutor
              </span>
            </h1>

            {/* Live Study Room Status */}
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              In your study room
            </span>
          </div>

          <p className="text-[11px] text-slate-500 truncate max-w-[200px] sm:max-w-xs md:max-w-md">
            {sessionTitle || "StudyPilot Room • Ask anything or attach notes"}
          </p>
        </div>
      </div>

      {/* 2. Room Ambience & Actions Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 mt-1 sm:mt-0">
        {/* Study Room Time of Day Controller */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowTimeDropdown((prev) => !prev);
              setShowSettingsDropdown(false);
            }}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition shadow-2xs"
            title="Adjust Study Room Lighting & Ambience"
          >
            <CurrentTimeIcon className="h-3.5 w-3.5 text-amber-600" />
            <span className="capitalize hidden md:inline">{timeOfDay}</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {showTimeDropdown && (
            <div className="absolute right-0 top-full mt-1.5 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in-50 zoom-in-95">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Study Room Lighting
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAutoTime(true);
                  setShowTimeDropdown(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition ${
                  isAutoTime ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Auto Clock Sync</span>
                </div>
                {isAutoTime && <span className="text-[10px] font-bold">✓</span>}
              </button>

              <div className="my-1 border-t border-slate-100" />

              {(["morning", "afternoon", "evening", "night"] as StudyRoomTime[]).map((t) => {
                const Icon = timeIcons[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setIsAutoTime(false);
                      setTimeOfDay(t);
                      setShowTimeDropdown(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs capitalize transition ${
                      !isAutoTime && timeOfDay === t
                        ? "bg-amber-50 text-amber-900 font-semibold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-amber-600" />
                      <span>{t}</span>
                    </div>
                    {!isAutoTime && timeOfDay === t && <span className="text-[10px] font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Desk Lamp Interactive Switch */}
        <button
          type="button"
          onClick={() => {
            if (toggleLamp) toggleLamp();
            else if (setLampOn) setLampOn(!lampOn);
          }}
          className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition shadow-2xs ${
            lampOn
              ? "border-amber-300 bg-amber-50 text-amber-800 shadow-amber-100"
              : "border-slate-200 bg-slate-50/80 text-slate-500 hover:bg-slate-100"
          }`}
          title={lampOn ? "Desk Lamp: ON (Warm glow)" : "Desk Lamp: OFF"}
        >
          <LampDesk className={`h-3.5 w-3.5 ${lampOn ? "text-amber-600 fill-amber-300" : "text-slate-400"}`} />
          <span className="hidden lg:inline">{lampOn ? "Lamp On" : "Lamp Off"}</span>
        </button>

        {/* Academic Settings Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowSettingsDropdown((prev) => !prev);
              setShowTimeDropdown(false);
            }}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition shadow-2xs"
            title="Tutor Level & Tone Settings"
          >
            <Settings2 className="h-3.5 w-3.5 text-indigo-600" />
            <span className="hidden md:inline">Settings</span>
          </button>

          {showSettingsDropdown && (
            <div className="absolute right-0 top-full mt-1.5 w-64 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl z-50 animate-in fade-in-50 zoom-in-95 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Mishra Ji's Pedagogical Tuning
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Academic Level
                </label>
                <select
                  value={academicLevel}
                  onChange={(e) => setAcademicLevel(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                >
                  <option value="High School">High School (Grades 9-12)</option>
                  <option value="Undergraduate">College / Undergraduate</option>
                  <option value="Graduate / Pre-Med">Graduate / Advanced / Pre-Med</option>
                  <option value="Explain Like I am 5 (ELI5)">Simplified / ELI5 Intuitive</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Tutoring Style
                </label>
                <select
                  value={tutorTone}
                  onChange={(e) => setTutorTone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                >
                  <option value="Encouraging & Socratic">Encouraging & Socratic (Guides thinking)</option>
                  <option value="Direct & Formulaic">Direct & Rigorous</option>
                  <option value="Visual & Analogy Heavy">Analogy & Intuition First</option>
                  <option value="Exam Strategy & Trap Spotter">Exam Strategy & Trap Spotter</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Chat History Button (Badge with count) */}
        <button
          type="button"
          onClick={onOpenHistory}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition shadow-2xs"
          title="Open Conversation History"
        >
          <History className="h-3.5 w-3.5 text-slate-500" />
          <span className="hidden sm:inline">History</span>
          {totalConversationsCount > 0 && (
            <span className="rounded-full bg-indigo-100 px-1.5 py-0.2 text-[10px] font-bold text-indigo-700">
              {totalConversationsCount}
            </span>
          )}
        </button>

        {/* Clear Chat Button */}
        {hasMessages && (
          <button
            type="button"
            onClick={onClearChat}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition shadow-2xs"
            title="Delete this conversation"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Delete</span>
          </button>
        )}

        {/* + New Chat Button (Prominent) */}
        <button
          type="button"
          onClick={onNewChat}
          id="arlo-btn-new-chat"
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Chat</span>
        </button>
      </div>
    </header>
  );
};
