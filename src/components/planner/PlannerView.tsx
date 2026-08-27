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
} from "lucide-react";

export const PlannerView: React.FC = () => {
  const { studyPlans, activePlan, saveStudyPlan, setActivePlan, toggleTaskCompletion, deleteStudyPlan } = useData();
  const { recordStudySession } = useAuth();

  const [showCreateModal, setShowCreateModal] = useState(studyPlans.length === 0);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const saved = await saveStudyPlan(generated);
      setShowCreateModal(false);
      setSelectedWeek(1);
    } catch (err: any) {
      console.error("Failed to generate plan:", err);
      setError(err.message || "Failed to generate study plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
              Personalized
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Intelligent scheduling powered by Gemini adapting to your exam timeline and target scores.
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
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
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
                  {completedTasks} of {totalTasks} tasks done
                </p>
              </div>
            </div>
          </div>

          {/* Week Selector Tabs */}
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-4">
            <span className="text-xs font-bold text-slate-500 mr-1">Milestone Weeks:</span>
            {activePlan.weeklyMilestones.map((week) => (
              <button
                key={week.weekNumber}
                type="button"
                onClick={() => setSelectedWeek(week.weekNumber)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  selectedWeek === week.weekNumber
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>Week {week.weekNumber}</span>
                <span className={`text-[10px] ${selectedWeek === week.weekNumber ? "text-indigo-200" : "text-slate-400"}`}>
                  ({week.days.length} days)
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <CalendarDays className="mx-auto h-12 w-12 text-indigo-400" />
          <h3 className="mt-3 text-base font-bold text-slate-900">No Study Plan Created Yet</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Input your subjects, daily study hours, and exam date to have Gemini generate an optimal schedule.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
          >
            Create Your First Study Plan
          </button>
        </div>
      )}

      {/* Week Focus & Daily Schedule Grid */}
      {currentWeekData && (
        <div className="space-y-6">
          {/* Week Theme & Goals */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Week {currentWeekData.weekNumber} Theme
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {currentWeekData.theme}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {currentWeekData.focusGoals.map((goal, idx) => (
                  <span
                    key={idx}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                  >
                    🎯 {goal}
                  </span>
                ))}
              </div>
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
                  Subjects & Core Topics (comma separated)
                </label>
                <input
                  type="text"
                  value={subjectsInput}
                  onChange={(e) => setSubjectsInput(e.target.value)}
                  placeholder="e.g. Organic Chemistry, Calculus II, Cell Biology, Microeconomics"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Difficulty / Intensity
                  </label>
                  <select
                    value={difficultyLevel}
                    onChange={(e) => setDifficultyLevel(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                  >
                    <option value="Beginner / Foundation Review">Beginner / Foundation Review</option>
                    <option value="Intermediate / Challenging">Intermediate / Challenging</option>
                    <option value="Intensive Exam Crash Course">Intensive Exam Crash Course</option>
                    <option value="Mastery & Top Tier Score">Mastery & Top Tier Score</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Target Score / Goal
                  </label>
                  <input
                    type="text"
                    value={targetScore}
                    onChange={(e) => setTargetScore(e.target.value)}
                    placeholder="e.g. Grade A, 95%+, 1500+ SAT"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Specific Focus or Weak Spots (Optional)
                </label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="e.g. Focus extra time on reaction mechanisms, weak at dynamic programming, need flashcards..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                {studyPlans.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-spin" />
                      <span>Synthesizing Plan with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Generate Study Plan</span>
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
