import React, { useState, useEffect } from "react";
import { useTimer } from "../../context/TimerContext";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import { formatSeconds, formatMinutesHuman } from "../../utils/pomodoroEngine";
import { StudyPilotEnvironment } from "../common/StudyPilotEnvironment";
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Coffee,
  Sparkles,
  Volume2,
  VolumeX,
  Clock,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
  Lightbulb,
  Check,
  Trash2,
  Flame,
  CheckCircle,
  XCircle,
  AlertCircle,
  Target,
  RefreshCw,
  Plus,
  Compass,
} from "lucide-react";

const DURATION_PRESETS = [25, 30, 40, 45, 50, 60];

export const TimerView: React.FC = () => {
  const { user } = useAuth();
  const { activePlan } = useData();
  const {
    activeSession,
    pendingSetup,
    setPendingSetup,
    timerMode,
    timerState,
    timeRemainingSeconds,
    totalFocusedSeconds,
    isSoundEnabled,
    toggleSound,
    currentMicroTip,
    rotateMicroTip,
    startFocusSession,
    pauseSession,
    resumeSession,
    endFocusSession,
    cancelSession,
    startBreakSession,
    skipBreak,
    startNextSession,
    resetTimer,
    studySessions,
    deleteSessionRecord,
    getRecommendation,
    todaySummary,
  } = useTimer();

  // Manual Setup State when no active session
  const [selectedSubject, setSelectedSubject] = useState<string>(
    pendingSetup?.subject || activePlan?.subject || "General"
  );
  const [selectedTopic, setSelectedTopic] = useState<string>(
    pendingSetup?.topic || activePlan?.title || ""
  );
  const [selectedDuration, setSelectedDuration] = useState<number>(
    pendingSetup?.taskDurationMinutes || 45
  );
  const [customDurationInput, setCustomDurationInput] = useState<string>("");
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  // Completion Form State
  const [sessionNotes, setSessionNotes] = useState<string>("");
  const [markTaskCompleteChecked, setMarkTaskCompleteChecked] = useState<boolean>(true);
  const [isSavingCompletion, setIsSavingCompletion] = useState<boolean>(false);
  const [hasLoggedSession, setHasLoggedSession] = useState<boolean>(false);

  // History Filter
  const [historyFilter, setHistoryFilter] = useState<"all" | "completed" | "today">("all");

  // Sync pending setup when initiated from another tab
  useEffect(() => {
    if (pendingSetup) {
      setSelectedSubject(pendingSetup.subject);
      setSelectedTopic(pendingSetup.topic);
      if (pendingSetup.taskDurationMinutes) {
        setSelectedDuration(pendingSetup.taskDurationMinutes);
      }
    }
  }, [pendingSetup]);

  // Compute recommendation live as subject/topic change
  const currentRecommendation = getRecommendation({
    subject: selectedSubject,
    topic: selectedTopic,
    taskDurationMinutes: pendingSetup?.taskDurationMinutes,
    priority: pendingSetup?.priority,
  });

  // Apply AI Recommendation with 1 click
  const handleApplyRecommendation = () => {
    setSelectedDuration(currentRecommendation.durationMinutes);
    setIsCustomMode(false);
  };

  // Keyboard shortcut listener (Space to Pause/Resume)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        if (timerState === "running") {
          pauseSession();
        } else if (timerState === "paused") {
          resumeSession();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [timerState, pauseSession, resumeSession]);

  // Launch focus session from setup form
  const handleStartSession = () => {
    const duration = isCustomMode
      ? Math.max(1, Math.min(180, parseInt(customDurationInput) || 25))
      : selectedDuration;

    startFocusSession({
      subject: selectedSubject || "General",
      topic: selectedTopic || "Focused Study Block",
      durationMinutes: duration,
      breakMinutes: currentRecommendation.breakMinutes,
      taskTitle: pendingSetup?.taskTitle,
      planId: pendingSetup?.planId,
      taskId: pendingSetup?.taskId,
      reason: currentRecommendation.reason,
    });
    setHasLoggedSession(false);
  };

  // Handle End & Log from Completion screen
  const handleCompleteAndLog = async () => {
    setIsSavingCompletion(true);
    await endFocusSession({
      markTaskCompleted: markTaskCompleteChecked,
      notes: sessionNotes.trim() || undefined,
    });
    setIsSavingCompletion(false);
    setHasLoggedSession(true);
  };

  // Radial progress calculations
  const totalDurationSeconds =
    activeSession?.mode === "break"
      ? (activeSession.breakMinutes || 5) * 60
      : (activeSession?.plannedFocusMinutes || selectedDuration) * 60;

  const progressPercentage = Math.min(
    100,
    Math.max(0, ((totalDurationSeconds - timeRemainingSeconds) / totalDurationSeconds) * 100)
  );

  const circleRadius = 120;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  // Filtered study sessions history
  const todayStr = new Date().toISOString().split("T")[0];
  const filteredSessions = studySessions.filter((s) => {
    if (historyFilter === "completed") return s.status === "Completed";
    if (historyFilter === "today") return s.date === todayStr;
    return true;
  });

  return (
    <StudyPilotEnvironment
      roomType="focus"
      timerState={
        timerMode === "break"
          ? "break"
          : timerMode === "completed"
          ? "completed"
          : timerState === "running"
          ? "running"
          : timerState === "paused"
          ? "paused"
          : "idle"
      }
    >
      <div className="space-y-8 pb-16">
        {/* Top Header Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-100">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Smart Focus Timer
              </h1>
              <p className="text-sm font-medium text-slate-500">
                AI-recommended study intervals, structured breaks, and automatic progress logging.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Sound Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSound}
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
              isSoundEnabled
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
            title={isSoundEnabled ? "Sound enabled" : "Sound muted"}
          >
            {isSoundEnabled ? <Volume2 className="h-4 w-4 text-emerald-600" /> : <VolumeX className="h-4 w-4" />}
            <span>{isSoundEnabled ? "Chime On" : "Muted"}</span>
          </button>
        </div>
      </div>

      {/* Today's Focus Metrics Bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Today's Focus</span>
            <Flame className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {formatMinutesHuman(todaySummary.totalFocusedMinutes)}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {todaySummary.totalSessions} {todaySummary.totalSessions === 1 ? "session" : "sessions"} logged
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Completed Sessions</span>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {todaySummary.completedCount}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Full focus intervals</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Streak</span>
            <Sparkles className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {user?.streakDays || 1} {user?.streakDays === 1 ? "Day" : "Days"}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Daily consistency</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Top Subject</span>
            <BookOpen className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-2 truncate text-base font-bold tracking-tight text-slate-900">
            {todaySummary.topSubject}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {todaySummary.uniqueTopics.length} {todaySummary.uniqueTopics.length === 1 ? "topic" : "topics"} today
          </p>
        </div>
      </div>

      {/* Main Timer Stage */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-10">
        <div className="mx-auto max-w-2xl">
          {/* Active Session Context Badge */}
          {activeSession && (
            <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                {activeSession.subject}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                <Target className="h-3.5 w-3.5 text-indigo-500" />
                {activeSession.topic}
              </span>
              {activeSession.taskTitle && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Task: {activeSession.taskTitle}
                </span>
              )}
            </div>
          )}

          {/* Mode Pill Tag */}
          <div className="flex justify-center">
            {timerMode === "focus" && (
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-4 py-1.5 text-xs font-bold tracking-wide uppercase text-indigo-700">
                <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                Focus Mode &bull; {activeSession?.plannedFocusMinutes || selectedDuration}m Block
              </div>
            )}
            {timerMode === "break" && (
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-xs font-bold tracking-wide uppercase text-teal-700">
                <Coffee className="h-3.5 w-3.5 text-teal-600" />
                Smart Break Mode &bull; Rest & Recharge
              </div>
            )}
            {timerMode === "completed" && (
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-bold tracking-wide uppercase text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Session Complete &bull; Great Work!
              </div>
            )}
          </div>

          {/* Radial Clock Circle */}
          <div className="relative my-8 flex items-center justify-center">
            <svg className="h-72 w-72 -rotate-90 transform sm:h-80 sm:w-80" viewBox="0 0 280 280">
              {/* Background track circle */}
              <circle
                cx="140"
                cy="140"
                r={circleRadius}
                stroke="currentColor"
                strokeWidth="10"
                className={`transition-colors ${
                  timerMode === "break"
                    ? "text-teal-100"
                    : timerMode === "completed"
                    ? "text-emerald-100"
                    : "text-slate-100"
                }`}
                fill="transparent"
              />
              {/* Animated progress ring */}
              <circle
                cx="140"
                cy="140"
                r={circleRadius}
                stroke="currentColor"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={`transition-all duration-300 ${
                  timerMode === "break"
                    ? "text-teal-500"
                    : timerMode === "completed"
                    ? "text-emerald-500"
                    : timerState === "paused"
                    ? "text-amber-500"
                    : "text-indigo-600"
                }`}
                fill="transparent"
              />
            </svg>

            {/* Centered Clock Readout */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span
                className={`font-mono text-5xl font-extrabold tracking-tight sm:text-6xl ${
                  timerMode === "break"
                    ? "text-teal-900"
                    : timerState === "paused"
                    ? "text-amber-900"
                    : "text-slate-900"
                }`}
              >
                {formatSeconds(timeRemainingSeconds)}
              </span>

              <span className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
                {timerState === "running"
                  ? timerMode === "break"
                    ? "Break Remaining"
                    : "Focus Time Remaining"
                  : timerState === "paused"
                  ? "Timer Paused (Press Space)"
                  : timerState === "completed"
                  ? "Target Reached"
                  : "Ready to Start"}
              </span>

              {timerMode === "focus" && activeSession && (
                <span className="mt-2 text-xs font-medium text-slate-500">
                  {formatSeconds(activeSession.totalFocusedSeconds || 0)} elapsed
                </span>
              )}
            </div>
          </div>

          {/* Interactive Controls Section */}
          <div className="space-y-6">
            {/* 1. When Idle / Configuring Session */}
            {timerState === "idle" && (
              <div className="space-y-6">
                {/* AI Recommendation Alert Card */}
                <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/30 p-4.5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                            AI Focus Recommendation
                          </span>
                          <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
                            {currentRecommendation.durationMinutes} Minutes
                          </span>
                        </div>
                        {selectedDuration !== currentRecommendation.durationMinutes && (
                          <button
                            onClick={handleApplyRecommendation}
                            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                          >
                            Apply recommended ({currentRecommendation.durationMinutes}m) &rarr;
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        {currentRecommendation.reason}
                      </p>
                      {currentRecommendation.suggestedTechnique && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-indigo-700">
                          <span className="font-semibold text-slate-500">Technique:</span>
                          <span className="rounded bg-indigo-50 px-1.5 py-0.5 border border-indigo-100">
                            {currentRecommendation.suggestedTechnique}
                          </span>
                          <span className="text-slate-400">&bull;</span>
                          <span className="text-slate-500">{currentRecommendation.breakMinutes}m rest break</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subject & Topic Selector */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      placeholder="e.g. Mathematics, Organic Chemistry"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 shadow-2xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Topic or Task Goal
                    </label>
                    <input
                      type="text"
                      value={selectedTopic}
                      onChange={(e) => setSelectedTopic(e.target.value)}
                      placeholder="e.g. Integration by Parts, SN2 Mechanisms"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 shadow-2xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Duration Presets */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Focus Duration
                    </label>
                    <button
                      onClick={() => setIsCustomMode(!isCustomMode)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      {isCustomMode ? "Use Presets" : "Custom Duration"}
                    </button>
                  </div>

                  {!isCustomMode ? (
                    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {DURATION_PRESETS.map((dur) => {
                        const isSelected = selectedDuration === dur;
                        const isRecommended = currentRecommendation.durationMinutes === dur;
                        return (
                          <button
                            key={dur}
                            onClick={() => setSelectedDuration(dur)}
                            className={`relative flex flex-col items-center justify-center rounded-xl border py-2.5 transition-all ${
                              isSelected
                                ? "border-indigo-600 bg-indigo-600 text-white shadow-sm shadow-indigo-100"
                                : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-slate-50"
                            }`}
                          >
                            <span className="text-base font-bold">{dur}m</span>
                            {isRecommended && (
                              <span
                                className={`text-[10px] font-bold ${
                                  isSelected ? "text-indigo-100" : "text-indigo-600"
                                }`}
                              >
                                AI Best
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-3">
                      <input
                        type="number"
                        min="5"
                        max="180"
                        value={customDurationInput}
                        onChange={(e) => setCustomDurationInput(e.target.value)}
                        placeholder="Minutes (e.g. 35)"
                        className="w-48 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-hidden"
                      />
                      <span className="text-xs text-slate-500">Minutes (5 to 180 max)</span>
                    </div>
                  )}
                </div>

                {/* Primary Launch Action */}
                <div className="pt-2">
                  <button
                    onClick={handleStartSession}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-xl active:scale-[0.99]"
                  >
                    <Play className="h-5 w-5 fill-current" />
                    <span>Start Focus Session ({isCustomMode ? customDurationInput || "25" : selectedDuration} min)</span>
                  </button>
                  <p className="mt-2 text-center text-xs text-slate-400">
                    Pro-tip: Press <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 border">Space</kbd> anytime to pause or resume.
                  </p>
                </div>
              </div>
            )}

            {/* 2. When Running or Paused (In Focus Mode) */}
            {timerMode === "focus" && (timerState === "running" || timerState === "paused") && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {timerState === "running" ? (
                    <button
                      onClick={pauseSession}
                      className="flex items-center gap-2 rounded-2xl bg-slate-900 px-7 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 active:scale-95"
                    >
                      <Pause className="h-4 w-4" />
                      <span>Pause Session</span>
                    </button>
                  ) : (
                    <button
                      onClick={resumeSession}
                      className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-95"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      <span>Resume Session</span>
                    </button>
                  )}

                  <button
                    onClick={() => endFocusSession()}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 shadow-2xs transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Finish & Log</span>
                  </button>

                  <button
                    onClick={cancelSession}
                    className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3.5 text-xs font-bold text-rose-600 shadow-2xs transition-all hover:bg-rose-50 active:scale-95"
                    title="Cancel session without saving"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3. When In Smart Break Mode */}
            {timerMode === "break" && (
              <div className="space-y-6">
                {/* Break Micro-Tip Box */}
                <div className="rounded-2xl border border-teal-200 bg-teal-50/80 p-5 text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{currentMicroTip.icon}</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-teal-900">
                        {currentMicroTip.title}
                      </span>
                      <span className="rounded bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                        {currentMicroTip.category}
                      </span>
                    </div>
                    <button
                      onClick={rotateMicroTip}
                      className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900"
                      title="Next cognitive micro-tip"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Another Tip</span>
                    </button>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-teal-950">
                    {currentMicroTip.text}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={skipBreak}
                    className="flex items-center gap-2 rounded-2xl bg-teal-700 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-teal-800 active:scale-95"
                  >
                    <span>Skip Break & Finish</span>
                  </button>

                  <button
                    onClick={() => startNextSession()}
                    className="flex items-center gap-2 rounded-2xl border border-teal-300 bg-white px-6 py-3 text-sm font-bold text-teal-800 shadow-2xs transition-all hover:bg-teal-50 active:scale-95"
                  >
                    <span>Start Next Session</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* 4. When Session Completed (Summary & Next Steps) */}
            {timerMode === "completed" && (
              <div className="space-y-6 text-left">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                      <Check className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-emerald-900">
                        Session Logged Successfully
                      </h3>
                      <p className="text-xs text-emerald-700">
                        {formatMinutesHuman(
                          Math.max(1, Math.round((activeSession?.totalFocusedSeconds || 0) / 60))
                        )}{" "}
                        added to your StudyPilot stats & streak.
                      </p>
                    </div>
                  </div>

                  {/* Task completion toggle if attached to a study plan task */}
                  {activeSession?.taskId && activeSession?.taskTitle && (
                    <div className="mt-4 rounded-xl bg-white p-3.5 border border-emerald-100 shadow-2xs">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={markTaskCompleteChecked}
                          onChange={(e) => setMarkTaskCompleteChecked(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-slate-800">
                            Mark task complete in Study Plan
                          </span>
                          <p className="text-slate-500 mt-0.5">
                            "{activeSession.taskTitle}"
                          </p>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Optional notes */}
                  <div className="mt-4">
                    <label className="block text-xs font-bold text-slate-700">
                      Session Notes & Key Learnings (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={sessionNotes}
                      onChange={(e) => setSessionNotes(e.target.value)}
                      placeholder="e.g. Mastered the core formula, need to practice problem #4 tomorrow..."
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Actions: Take a break vs Next Session vs Reset */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    onClick={() => startBreakSession(activeSession?.breakMinutes || 5)}
                    className="flex items-center gap-2 rounded-2xl bg-teal-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-teal-100 transition-all hover:bg-teal-700 active:scale-95"
                  >
                    <Coffee className="h-4 w-4" />
                    <span>Start Smart Break ({activeSession?.breakMinutes || 5} min)</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startNextSession()}
                      className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-95"
                    >
                      <span>Next Focus Block</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    <button
                      onClick={resetTimer}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-xs font-bold text-slate-600 hover:bg-slate-50 active:scale-95"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Study Session History Log */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Study Session History
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Comprehensive log of your focused work blocks and completion accuracy.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => setHistoryFilter("all")}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                historyFilter === "all"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              All ({studySessions.length})
            </button>
            <button
              onClick={() => setHistoryFilter("today")}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                historyFilter === "today"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Today ({studySessions.filter((s) => s.date === todayStr).length})
            </button>
            <button
              onClick={() => setHistoryFilter("completed")}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                historyFilter === "completed"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Completed ({studySessions.filter((s) => s.status === "Completed").length})
            </button>
          </div>
        </div>

        {/* Sessions Table / Card List */}
        <div className="mt-6">
          {filteredSessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
              <Clock className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-bold text-slate-700">No session records found</p>
              <p className="text-xs text-slate-400">
                Complete a focus session above to automatically track your academic study logs.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xs">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col gap-3 p-4 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        session.status === "Completed"
                          ? "bg-emerald-50 text-emerald-600"
                          : session.status === "Cancelled"
                          ? "bg-rose-50 text-rose-600"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {session.status === "Completed" ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : session.status === "Cancelled" ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {session.topic || session.subject}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                          {session.subject}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            session.status === "Completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : session.status === "Cancelled"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {session.status}
                        </span>
                      </div>

                      {session.taskTitle && (
                        <p className="mt-1 text-xs text-slate-500">
                          Linked Task: <span className="font-medium text-slate-700">{session.taskTitle}</span>
                        </p>
                      )}

                      {session.notes && (
                        <p className="mt-1 text-xs italic text-slate-600">
                          "{session.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">
                        {session.actualDurationMinutes} min{" "}
                        <span className="text-xs font-normal text-slate-400">
                          / {session.plannedDurationMinutes}m planned
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {session.date} &bull;{" "}
                        {session.startedAt
                          ? new Date(session.startedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </div>
                    </div>

                    <button
                      onClick={() => deleteSessionRecord(session.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition-colors"
                      title="Delete log"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </StudyPilotEnvironment>
  );
};
