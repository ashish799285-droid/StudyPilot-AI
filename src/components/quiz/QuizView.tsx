import React, { useState, useEffect } from "react";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { QuizData, QuizResult, QuizQuestion } from "../../types";
import confetti from "canvas-confetti";
import {
  HelpCircle,
  Sparkles,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Play,
  ArrowRight,
  Plus,
  Trash2,
  Check,
  Zap,
  Lightbulb,
  TrendingUp,
} from "lucide-react";

export const QuizView: React.FC = () => {
  const { quizzes, quizResults, saveQuiz, saveQuizResult, deleteQuiz } = useData();
  const { recordStudySession } = useAuth();

  // Generator & Quiz State
  const [showCreateModal, setShowCreateModal] = useState(quizzes.length === 0);
  const [activeQuiz, setActiveQuiz] = useState<QuizData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<Record<number, boolean>>({});
  const [showHint, setShowHint] = useState<Record<number, boolean>>({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [lastResult, setLastResult] = useState<QuizResult | null>(null);

  // Form State
  const [topic, setTopic] = useState("Cellular Respiration & Krebs Cycle");
  const [subject, setSubject] = useState("Biology");
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<"Beginner" | "Intermediate" | "Advanced" | "Mastery">("Intermediate");
  const [academicLevel, setAcademicLevel] = useState("College / Undergraduate");
  const [customInstructions, setCustomInstructions] = useState("Include realistic application and conceptual questions.");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timer Effect
  useEffect(() => {
    let interval: any = null;
    if (timerRunning && !quizCompleted) {
      interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerRunning, quizCompleted]);

  // Generate Quiz
  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError("Please specify a topic.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const generated = await api.generateQuiz({
        subject,
        topic,
        questionCount,
        difficulty,
        academicLevel,
        customInstructions,
      });

      const saved = await saveQuiz(generated);
      setShowCreateModal(false);
      startQuizSession(saved);
    } catch (err: any) {
      console.error("Failed to generate quiz:", err);
      setError(err.message || "Failed to generate quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const startQuizSession = (quiz: QuizData) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setIsAnswerSubmitted({});
    setShowHint({});
    setQuizCompleted(false);
    setTimeElapsed(0);
    setTimerRunning(true);
    setLastResult(null);
  };

  const handleSelectOption = (questionId: number, optionIndex: number) => {
    if (isAnswerSubmitted[questionId]) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmitQuestion = (questionId: number) => {
    setIsAnswerSubmitted((prev) => ({ ...prev, [questionId]: true }));
  };

  const handleFinishQuiz = async () => {
    if (!activeQuiz) return;
    setTimerRunning(false);
    setQuizCompleted(true);

    let score = 0;
    const answerBreakdown = activeQuiz.questions.map((q) => {
      const selected = selectedAnswers[q.id] ?? -1;
      const isCorrect = selected === q.correctOptionIndex;
      if (isCorrect) score++;
      return {
        questionId: q.id,
        selectedOptionIndex: selected,
        isCorrect,
      };
    });

    const percentage = Math.round((score / activeQuiz.questions.length) * 100);

    // Confetti on high score
    if (percentage >= 70) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    const savedRes = await saveQuizResult({
      quizId: activeQuiz.id,
      quizTitle: activeQuiz.title,
      subject: activeQuiz.subject,
      topic: activeQuiz.topic,
      difficulty: activeQuiz.difficulty,
      score,
      totalQuestions: activeQuiz.questions.length,
      percentage,
      answers: answerBreakdown,
      timeSpentSeconds: timeElapsed,
    });

    setLastResult(savedRes);
    await recordStudySession(Math.max(Math.ceil(timeElapsed / 60), 5));
  };

  const currentQuestion: QuizQuestion | undefined = activeQuiz?.questions[currentQuestionIndex];
  const isLastQuestion = activeQuiz ? currentQuestionIndex === activeQuiz.questions.length - 1 : false;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              AI Quiz Generator
            </h1>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              Active Recall
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Test and solidify your understanding with interactive quizzes generated instantly by Gemini.
          </p>
        </div>

        <button
          type="button"
          id="quiz-btn-generate"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Generate New Quiz</span>
        </button>
      </div>

      {/* 1. Active Quiz Taking Screen */}
      {activeQuiz && !quizCompleted && currentQuestion && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 shadow-xs space-y-6">
          {/* Top Test Navigation & Timer */}
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 gap-3">
            <div>
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                {activeQuiz.subject}
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-1">{activeQuiz.title}</h2>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700">
                <Clock className="h-3.5 w-3.5 text-emerald-600" />
                <span>
                  {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, "0")}
                </span>
              </div>

              <span className="font-semibold text-slate-500">
                Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-emerald-600 transition-all duration-300"
              style={{
                width: `${((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100}%`,
              }}
            />
          </div>

          {/* Question Text */}
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {currentQuestion.id}. {currentQuestion.question}
            </h3>

            {/* Options List */}
            <div className="space-y-2.5">
              {currentQuestion.options.map((option, optIdx) => {
                const isSelected = selectedAnswers[currentQuestion.id] === optIdx;
                const isSubmitted = isAnswerSubmitted[currentQuestion.id];
                const isCorrect = optIdx === currentQuestion.correctOptionIndex;

                let optionStyle = "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20";
                if (isSubmitted) {
                  if (isCorrect) {
                    optionStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold";
                  } else if (isSelected && !isCorrect) {
                    optionStyle = "border-rose-400 bg-rose-50 text-rose-900 font-semibold";
                  } else {
                    optionStyle = "border-slate-200 opacity-60";
                  }
                } else if (isSelected) {
                  optionStyle = "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 font-semibold";
                }

                return (
                  <div
                    key={optIdx}
                    onClick={() => handleSelectOption(currentQuestion.id, optIdx)}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 text-xs sm:text-sm transition-all ${optionStyle}`}
                  >
                    <span className="leading-snug">{option}</span>
                    {isSubmitted && isCorrect && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    )}
                    {isSubmitted && isSelected && !isCorrect && (
                      <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Instant Rationale / Explanation if submitted */}
          {isAnswerSubmitted[currentQuestion.id] && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs space-y-1.5 animate-fadeIn">
              <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                <Lightbulb className="h-4 w-4 text-indigo-600" />
                <span>Concept Explanation & Rationale:</span>
              </div>
              <p className="text-slate-700 leading-relaxed">{currentQuestion.explanation}</p>
            </div>
          )}

          {/* Hint Toggle */}
          {currentQuestion.hint && !isAnswerSubmitted[currentQuestion.id] && (
            <div>
              {showHint[currentQuestion.id] ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800">
                  💡 <strong>Hint:</strong> {currentQuestion.hint}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowHint((prev) => ({ ...prev, [currentQuestion.id]: true }))}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                >
                  <Lightbulb className="h-3.5 w-3.5" /> Need a hint?
                </button>
              )}
            </div>
          )}

          {/* Action Navigation */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
              className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex items-center gap-2">
              {!isAnswerSubmitted[currentQuestion.id] ? (
                <button
                  type="button"
                  disabled={selectedAnswers[currentQuestion.id] === undefined}
                  onClick={() => handleSubmitQuestion(currentQuestion.id)}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-40"
                >
                  Check Answer
                </button>
              ) : isLastQuestion ? (
                <button
                  type="button"
                  onClick={handleFinishQuiz}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
                >
                  <span>Complete Quiz & View Score</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                >
                  <span>Next Question</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Quiz Result Completed Summary */}
      {quizCompleted && lastResult && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Award className="h-8 w-8" />
          </div>

          <div>
            <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
              Quiz Completed
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-2">{lastResult.quizTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Subject: {lastResult.subject} • Difficulty: {lastResult.difficulty}
            </p>
          </div>

          <div className="flex justify-center items-center gap-6 py-2">
            <div className="text-center">
              <span className="text-3xl font-extrabold text-emerald-600">{lastResult.percentage}%</span>
              <p className="text-xs text-slate-500 mt-0.5">Overall Accuracy</p>
            </div>
            <div className="h-10 w-px bg-slate-200" />
            <div className="text-center">
              <span className="text-3xl font-extrabold text-slate-900">
                {lastResult.score} / {lastResult.totalQuestions}
              </span>
              <p className="text-xs text-slate-500 mt-0.5">Correct Answers</p>
            </div>
            <div className="h-10 w-px bg-slate-200" />
            <div className="text-center">
              <span className="text-3xl font-extrabold text-slate-900">
                {Math.floor(lastResult.timeSpentSeconds / 60)}m {lastResult.timeSpentSeconds % 60}s
              </span>
              <p className="text-xs text-slate-500 mt-0.5">Time Taken</p>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => activeQuiz && startQuizSession(activeQuiz)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Retake This Quiz</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveQuiz(null);
                setQuizCompleted(false);
              }}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
            >
              Back to Quiz Vault
            </button>
          </div>
        </div>
      )}

      {/* 3. Quiz Library & Recent Results */}
      {!activeQuiz && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Available Quizzes (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Saved AI Quizzes</h3>
              <span className="text-xs text-slate-500">{quizzes.length} available</span>
            </div>

            <div className="space-y-3">
              {quizzes.map((q) => (
                <div
                  key={q.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-emerald-200 transition gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {q.subject}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {q.questions.length} Questions • {q.difficulty}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{q.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{q.topic}</p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => startQuizSession(q)}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>Start Quiz</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteQuiz(q.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Historical Scores / Results (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Past Quiz Performance</h3>
              <span className="text-xs text-slate-500">{quizResults.length} sessions</span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
              {quizResults.length > 0 ? (
                quizResults.map((res) => (
                  <div
                    key={res.id}
                    className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-none last:pb-0"
                  >
                    <div>
                      <h5 className="font-bold text-xs text-slate-900 line-clamp-1">
                        {res.quizTitle}
                      </h5>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{res.subject}</span>
                        <span>•</span>
                        <span>
                          {res.score}/{res.totalQuestions} ({Math.floor(res.timeSpentSeconds / 60)}m)
                        </span>
                      </div>
                    </div>

                    <span
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                        res.percentage >= 80
                          ? "bg-emerald-100 text-emerald-800"
                          : res.percentage >= 60
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {res.percentage}%
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  No previous quiz sessions yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generator Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Generate AI Quiz</h3>
                  <p className="text-xs text-slate-500">Gemini creates custom questions with full explanations</p>
                </div>
              </div>
              {quizzes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  ✕
                </button>
              )}
            </div>

            <form onSubmit={handleGenerateQuiz} className="mt-4 space-y-4 text-xs">
              {error && (
                <div className="rounded-xl bg-rose-50 p-3 text-rose-700 border border-rose-200">
                  {error}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Subject / Field
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Biology, Chemistry, Computer Science, Economics"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Topic or Keywords
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Cellular Respiration, BST Rotations, Keynesian Multiplier"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Number of Questions
                  </label>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-hidden"
                  >
                    <option value={3}>3 Questions (Quick Sprint)</option>
                    <option value={5}>5 Questions (Standard Practice)</option>
                    <option value={8}>8 Questions (Deep Assessment)</option>
                    <option value={10}>10 Questions (Comprehensive Test)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Difficulty Level
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-hidden"
                  >
                    <option value="Beginner">Beginner / Concept Fundamentals</option>
                    <option value="Intermediate">Intermediate / Standard College</option>
                    <option value="Advanced">Advanced / Tricky Traps</option>
                    <option value="Mastery">Mastery / Competitive Exam</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Special Focus or Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. Include numerical calculations, focus on mechanism steps"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                {quizzes.length > 0 && (
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
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-spin" />
                      <span>Generating Quiz with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Create Quiz</span>
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
