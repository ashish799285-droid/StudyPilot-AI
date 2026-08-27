import React, { useState } from "react";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { StudyPlan, StudyPlanTask } from "../../types";
import { exportStudyPlanAsPdf } from "../../utils/exportPlannerPdf";
import {
  CalendarDays,
  Sparkles,
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  Plus,
  Trash2,
  Lightbulb,
  Download,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  BookOpen,
  Wand2,
  RefreshCw,
  Sliders,
  Check,
  AlertCircle,
} from "lucide-react";

export const PlannerView: React.FC = () => {
  const {
    studyPlans,
    activePlan,
    saveStudyPlan,
    updateStudyPlan,
    setActivePlan,
    toggleTaskCompletion,
    deleteStudyPlan,
  } = useData();
  const { recordStudySession } = useAuth();

  const [showCreateModal, setShowCreateModal] = useState(studyPlans.length === 0);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refine / Edit AI Plan State
  const [refineInstruction, setRefineInstruction] = useState("");
  const [refineLoading, setRefineLoading] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [lastChangeSummary, setLastChangeSummary] = useState<string[] | null>(null);
  const [refineSuccess, setRefineSuccess] = useState<string | null>(null);

  // Form State
  const [examName, setExamName] = useState("Final Examinations");
  const [targetExamDate, setTargetExamDate] = useState("In 3 Weeks");
  const [subjectsInput, setSubjectsInput] = useState("Organic Chemistry, Data Structures, Cell Biology");
  const [hoursPerDay, setHoursPerDay] = useState(3.5);
  const [difficultyLevel, setDifficultyLevel] = useState("Intermediate / Challenging");
  const [studyPace, setStudyPace] = useState("Balanced (Deep Focus & Active Recall)");
  const [targetScore, setTargetScore] = useState("Grade A / 90%+");
  const [additionalNotes, setAdditionalNotes] = useState("Prioritize memorizing reaction mechanisms and tree traversal proofs.");

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const subjects = subjectsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (subjects.length === 0) {
      setError("Please specify at least one subject.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const generated = await api.generateStudyPlan({
        subjects,
        hoursPerDay,
        targetExamDate,
        examName,
        difficultyLevel,
        studyPace,
        targetScore,
        additionalNotes,
      });

      await saveStudyPlan(generated);
      setShowCreateModal(false);
      setSelectedWeek(1);
      setLastChangeSummary(null);
      setRefineSuccess(null);
    } catch (err: any) {
      console.error("Failed to generate plan:", err);
      setError(err.message || "Failed to generate study plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefinePlan = async (instructionToUse?: string) => {
    const instruction = (instructionToUse || refineInstruction).trim();
    if (!instruction || !activePlan || refineLoading) return;

    setRefineLoading(true);
    setRefineError(null);
    setRefineSuccess(null);

    try {
      const result = await api.refineStudyPlan({
        currentPlan: activePlan,
        instruction,
      });

      await updateStudyPlan(activePlan.id, result.plan);
      setLastChangeSummary(result.changeSummary || ["Plan adjusted based on your request"]);
      setRefineSuccess("Study plan successfully adjusted and synchronized!");
      setRefineInstruction("");
    } catch (err: any) {
      console.error("Failed to refine plan:", err);
      setRefineError(err.message || "Failed to adjust study plan. Please try again with different instructions.");
    } finally {
      setRefineLoading(false);
    }
  };

  const refinePresets = [
    { label: "Add 45m Weekend Review", instruction: "Add 45 minutes of active recall review sessions on Saturdays and Sundays." },
    { label: "Give More Focus to Hard Topics", instruction: "Increase daily focus time on the most challenging subjects and include practice problems." },
    { label: "Insert Mock Exam on Final Week", instruction: "Schedule a comprehensive timed mock exam 2 days before the target date." },
    { label: "Lighten Weekday Load (-30m)", instruction: "Rebalance the schedule so weekdays have 30 minutes less study time and move light review to weekends." },
    { label: "Add Active Recall & Flashcards", instruction: "Add daily 20-minute flashcard and active recall slots at the end of each study day." },
  ];

  const currentWeekData = activePlan?.weeklyMilestones.find((w) => w.weekNumber === selectedWeek) || activePlan?.weeklyMilestones[0];

  // Calculate plan metrics
  let totalTasks = 0;
  let completedTasks = 0;
  activePlan?.weeklyMilestones.forEach((w) => {
    w.days.forEach((d) => {
      d.tasks.forEach((t) => {
        totalTasks++;
        if (t.completed) completedTasks++;
      });
    });
  });
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleExportPlan = () => {
    if (!activePlan) return;
    try {
      exportStudyPlanAsPdf(activePlan);
    } catch (err) {
      console.error("Failed to export PDF plan:", err);
      setError("Failed to export PDF study plan. Please try again.");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              AI Study Planner
            </h1>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              Adaptive
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Intelligent roadmap generated and refined by Gemini, adapting to your pace, topics, and exam schedule.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activePlan && (
            <button
              type="button"
              id="planner-btn-export-pdf"
              onClick={handleExportPlan}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs transition"
            >
              <Download className="h-3.5 w-3.5 text-indigo-600" />
              <span>Export as PDF</span>
            </button>
          )}

          <button
            type="button"
            id="planner-btn-new-plan"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Generate New Plan</span>
          </button>
        </div>
      </div>

      {/* Plan Selection & Summary Banner */}
      {activePlan ? (
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/40 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  Active Plan
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  Target: {activePlan.examDate}
                </span>
                {lastChangeSummary && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    AI Modified
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-slate-900">{activePlan.title}</h2>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">{activePlan.summary}</p>
            </div>

            {/* Overall Progress Indicator */}
            <div className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs gap-4">
                  <span className="font-semibold text-slate-700">Completion</span>
                  <span className="font-bold text-indigo-600">{progressPercent}%</span>
                </div>
                <div className="h-2 w-32 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  {completedTasks} of {totalTasks} tasks finished
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <CalendarDays className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900">No Study Plan Active</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            Generate an AI-optimized schedule with daily study tasks tailored to your exam timeline.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-5 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
          >
            <Sparkles className="h-4 w-4" />
            <span>Create Your Study Plan</span>
          </button>
        </div>
      )}

      {/* Main Plan View */}
      {activePlan && currentWeekData && (
        <div className="space-y-6">
          {/* Week Selector Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {activePlan.weeklyMilestones.map((week) => {
                const isSelected = week.weekNumber === selectedWeek;
                const weekTasks = week.days.flatMap((d) => d.tasks);
                const weekDone = weekTasks.every((t) => t.completed) && weekTasks.length > 0;

                return (
                  <button
                    key={week.weekNumber}
                    type="button"
                    onClick={() => setSelectedWeek(week.weekNumber)}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                    }`}
                  >
                    <span>Week {week.weekNumber}</span>
                    {weekDone && (
                      <CheckCircle2 className={`h-3.5 w-3.5 ${isSelected ? "text-indigo-200" : "text-emerald-600"}`} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-700">{currentWeekData.theme}</span>
            </div>
          </div>

          {/* Week Focus Goals */}
          <div className="rounded-xl bg-indigo-50/60 border border-indigo-100/80 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-900">
                Week {currentWeekData.weekNumber} Primary Objective: {currentWeekData.theme}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentWeekData.focusGoals.map((goal, gIdx) => (
                <span
                  key={gIdx}
                  className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 border border-indigo-100 shadow-2xs"
                >
                  🎯 {goal}
                </span>
              ))}
            </div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {currentWeekData.days.map((day, dIdx) => {
              const dayCompleted = day.tasks.every((t) => t.completed);
              return (
                <div
                  key={dIdx}
                  className={`rounded-2xl border bg-white p-4 shadow-xs flex flex-col justify-between transition ${
                    dayCompleted ? "border-emerald-200 bg-emerald-50/20" : "border-slate-200"
                  }`}
                >
                  <div>
                    {/* Day Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{day.dayName}</h4>
                        <span className="text-[11px] font-semibold text-indigo-600">
                          {day.focusSubject}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">
                        {day.tasks.reduce((sum, t) => sum + t.durationMinutes, 0)} mins
                      </span>
                    </div>

                    {/* Task Checklist */}
                    <div className="space-y-2">
                      {day.tasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => {
                            if (activePlan) {
                              toggleTaskCompletion(
                                activePlan.id,
                                currentWeekData.weekNumber,
                                day.dayName,
                                task.id
                              );
                              if (!task.completed) {
                                recordStudySession(task.durationMinutes);
                              }
                            }
                          }}
                          className={`group flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition text-xs ${
                            task.completed
                              ? "border-emerald-200 bg-emerald-50/50 text-slate-500"
                              : "border-slate-200/80 bg-slate-50/50 text-slate-800 hover:border-indigo-200 hover:bg-white"
                          }`}
                        >
                          <button
                            type="button"
                            className="mt-0.5 shrink-0 text-slate-400 group-hover:text-indigo-600"
                          >
                            {task.completed ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 fill-emerald-100" />
                            ) : (
                              <Circle className="h-4 w-4 text-slate-300 group-hover:text-indigo-500" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`font-medium leading-snug ${
                                task.completed ? "line-through text-slate-400" : ""
                              }`}
                            >
                              {task.title}
                            </p>
                            <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                              <span>{task.durationMinutes}m</span>
                              <span>•</span>
                              <span>{task.type}</span>
                            </div>
                          </div>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[9px] font-bold shrink-0 ${
                              task.priority === "High"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Day Footer */}
                  <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {day.tasks.filter((t) => t.completed).length}/{day.tasks.length} Completed
                    </span>
                    {dayCompleted && (
                      <span className="font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> All Done!
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Gemini Pro Tips */}
          {activePlan?.proTips && activePlan.proTips.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-amber-600" />
                <h4 className="font-bold text-slate-900 text-sm">Gemini AI Study Strategy Tips</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {activePlan.proTips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-amber-200/70 bg-white p-3 text-xs text-slate-700 leading-relaxed shadow-2xs"
                  >
                    <span className="font-bold text-amber-700 mr-1">#{idx + 1}</span>
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Refine / Edit Plan with AI Card */}
          <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-b from-indigo-50/40 via-white to-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-indigo-100/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                  <Wand2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Refine & Adjust Study Plan with AI
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Instruct Gemini to rebalance hours, reschedule topics, or add revision sessions without losing progress.
                  </p>
                </div>
              </div>
            </div>

            {/* Change Summary Banner if plan was recently refined */}
            {lastChangeSummary && lastChangeSummary.length > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-900">
                <div className="flex items-center gap-1.5 font-bold mb-1.5 text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Latest AI Adjustments Applied:</span>
                </div>
                <ul className="space-y-1 pl-5 list-disc text-[11px] text-emerald-800">
                  {lastChangeSummary.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {refineError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{refineError}</span>
              </div>
            )}

            {/* Quick Adjustment Presets */}
            <div>
              <span className="block text-[11px] font-semibold text-slate-600 mb-2">
                Quick Adjustments:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {refinePresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={refineLoading}
                    onClick={() => handleRefinePlan(preset.instruction)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-900 transition shadow-2xs disabled:opacity-50"
                  >
                    ⚡ {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Instruction Box */}
            <div className="space-y-2">
              <div className="relative">
                <textarea
                  value={refineInstruction}
                  onChange={(e) => setRefineInstruction(e.target.value)}
                  placeholder="e.g., 'I need more time for Organic Chemistry reaction mechanisms on Tuesdays', 'Move Friday study sessions to Saturday', 'Add a 30m active recall quiz at the end of each day'..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Gemini will update the schedule while preserving your completed tasks and exam target.
                </span>
                <button
                  type="button"
                  id="planner-btn-refine"
                  disabled={!refineInstruction.trim() || refineLoading}
                  onClick={() => handleRefinePlan()}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {refineLoading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Optimizing Plan...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-3.5 w-3.5" />
                      <span>Apply AI Adjustments</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Generation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Generate AI Study Plan</h3>
                  <p className="text-xs text-slate-500">Gemini will compute an optimal day-by-day roadmap</p>
                </div>
              </div>
              {studyPlans.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  ✕
                </button>
              )}
            </div>

            <form onSubmit={handleGeneratePlan} className="mt-4 space-y-4 text-xs">
              {error && (
                <div className="rounded-xl bg-rose-50 p-3 text-rose-700 border border-rose-200">
                  {error}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Exam or Goal Title
                </label>
                <input
                  type="text"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="e.g. MCAT Biology, Midterms, SAT Math, Semester Finals"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Timeline / Exam Date
                  </label>
                  <input
                    type="text"
                    value={targetExamDate}
                    onChange={(e) => setTargetExamDate(e.target.value)}
                    placeholder="e.g. In 2 weeks, May 15th, 20 days"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Available Study Time (Hours / Day)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="14"
                    value={hoursPerDay}
                    onChange={(e) => setHoursPerDay(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Subjects & Topics (comma separated)
                </label>
                <input
                  type="text"
                  value={subjectsInput}
                  onChange={(e) => setSubjectsInput(e.target.value)}
                  placeholder="e.g. Organic Chemistry, Algorithms, Macroeconomics"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Current Preparation Level
                  </label>
                  <select
                    value={difficultyLevel}
                    onChange={(e) => setDifficultyLevel(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                  >
                    <option value="Beginner / Starting from scratch">Beginner / Starting from scratch</option>
                    <option value="Intermediate / Challenging">Intermediate / Some basics clear</option>
                    <option value="Advanced Revision / Intensive">Advanced / Final Polish & Practice</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Study Pace Style
                  </label>
                  <select
                    value={studyPace}
                    onChange={(e) => setStudyPace(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                  >
                    <option value="Balanced (Deep Focus & Active Recall)">Balanced (Concept + Practice)</option>
                    <option value="Intensive Sprint">Intensive Sprint (High velocity)</option>
                    <option value="Spaced Repetition Heavy">Spaced Repetition & Flashcards</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Score / Outcome Goal
                </label>
                <input
                  type="text"
                  value={targetScore}
                  onChange={(e) => setTargetScore(e.target.value)}
                  placeholder="e.g. Grade A, 95%+, Pass with Distinction, 520+ MCAT"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Specific Focus Areas or Weak Topics
                </label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="e.g. Need more practice on SN1/SN2 mechanisms and dynamic programming."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                {studyPlans.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-spin" />
                      <span>Generating Plan...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Create Plan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
