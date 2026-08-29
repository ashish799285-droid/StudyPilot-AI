import React, { useState } from "react";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import { useQuizSession } from "../../context/QuizSessionContext";
import { api } from "../../services/api";
import { QuizData } from "../../types";
import MishraJiScoreReactionBanner from "../common/MishraJiScoreReactionBanner";
import {
  Sparkles,
  Flame,
  Play,
  Clock,
  Award,
  Zap,
  Trash2,
  Brain,
  Code2,
  Binary,
  Calculator,
  Dna,
  FlaskConical,
  BarChart3,
  BookOpen,
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface CategoryPreset {
  id: string;
  title: string;
  subject: string;
  topic: string;
  description: string;
  questionCount: number;
  durationMinutes: number;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Mastery";
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
}

const CATEGORY_PRESETS: CategoryPreset[] = [
  {
    id: "cat_py",
    title: "Python & Algorithms",
    subject: "Computer Science",
    topic: "Python Data Structures, Functions & Complexity",
    description: "Test your mastery of Python idioms, Big-O analysis, and memory model.",
    questionCount: 10,
    durationMinutes: 5,
    difficulty: "Intermediate",
    icon: Code2,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
  {
    id: "cat_ml",
    title: "Machine Learning & AI",
    subject: "Artificial Intelligence",
    topic: "Gradient Descent, Loss Functions & Neural Architectures",
    description: "High-yield challenge on optimization, regularization, and model evaluation.",
    questionCount: 10,
    durationMinutes: 5,
    difficulty: "Advanced",
    icon: Brain,
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/30",
  },
  {
    id: "cat_data",
    title: "Data Analysis & Statistics",
    subject: "Data Science",
    topic: "Linear Regression, Variance & Hypothesis Testing",
    description: "Assess your intuition on p-values, regression lines, and sampling distributions.",
    questionCount: 10,
    durationMinutes: 5,
    difficulty: "Intermediate",
    icon: BarChart3,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
  },
  {
    id: "cat_math",
    title: "Calculus & Linear Algebra",
    subject: "Mathematics",
    topic: "Derivatives, Matrix Transformations & Eigenvalues",
    description: "Fast-paced calculations, geometric intuitions, and algebraic theorems.",
    questionCount: 10,
    durationMinutes: 5,
    difficulty: "Advanced",
    icon: Calculator,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
  },
  {
    id: "cat_cs",
    title: "Computer Systems & DBs",
    subject: "Computer Science",
    topic: "Operating Systems, Concurrency & Database Indexing",
    description: "Challenge yourself on processes, threads, locks, ACID, and B-trees.",
    questionCount: 10,
    durationMinutes: 5,
    difficulty: "Intermediate",
    icon: Binary,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
  },
  {
    id: "cat_bio",
    title: "Cell Biology & Genetics",
    subject: "Biology",
    topic: "Cellular Respiration, Krebs Cycle & Gene Expression",
    description: "Active recall on metabolic pathways, ATP synthesis, and transcription.",
    questionCount: 10,
    durationMinutes: 5,
    difficulty: "Intermediate",
    icon: Dna,
    color: "text-rose-400",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/30",
  },
  {
    id: "cat_chem",
    title: "Organic Chemistry",
    subject: "Chemistry",
    topic: "Reaction Mechanisms, Resonance & Stereochemistry",
    description: "Test your ability to predict products, arrow pushing, and chiral centers.",
    questionCount: 10,
    durationMinutes: 5,
    difficulty: "Mastery",
    icon: FlaskConical,
    color: "text-teal-400",
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/30",
  },
  {
    id: "cat_gen",
    title: "Analytical Aptitude & Logic",
    subject: "General Knowledge",
    topic: "Critical Reasoning, Deductive Logic & Pattern Finding",
    description: "Sharp reasoning puzzles, data sufficiency, and syllogistic challenges.",
    questionCount: 8,
    durationMinutes: 4,
    difficulty: "Intermediate",
    icon: HelpCircle,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
];

export const GameShowChallengeSelect: React.FC = () => {
  const { user } = useAuth();
  const { quizzes, quizResults, saveQuiz, deleteQuiz } = useData();
  const { startPreparation } = useQuizSession();
  const firstName = user?.name ? user.name.split(" ")[0] : "Student";

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingPresetId, setLoadingPresetId] = useState<string | null>(null);
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);

  // Custom Generator Form State
  const [topic, setTopic] = useState("Linear Regression & Gradient Descent");
  const [subject, setSubject] = useState("Machine Learning");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<"Beginner" | "Intermediate" | "Advanced" | "Mastery">("Intermediate");
  const [academicLevel, setAcademicLevel] = useState("College / Undergraduate");
  const [customInstructions, setCustomInstructions] = useState("Focus on intuitive mechanisms and practical edge cases.");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Launch a Preset Challenge
  const handleLaunchPreset = async (preset: CategoryPreset) => {
    // Check if an existing quiz with this topic exists
    const existing = quizzes.find(
      (q) => q.topic.toLowerCase() === preset.topic.toLowerCase() || q.title.toLowerCase() === preset.title.toLowerCase()
    );

    if (existing) {
      startPreparation(existing, preset.durationMinutes);
      return;
    }

    // Otherwise generate fresh questions for this preset
    setLoadingPresetId(preset.id);
    try {
      const generated = await api.generateQuiz({
        subject: preset.subject,
        topic: preset.topic,
        questionCount: preset.questionCount,
        difficulty: preset.difficulty,
        academicLevel: "College / Undergraduate",
        customInstructions: "Ensure high-yield, engaging conceptual questions with exactly 4 distinct options.",
      });

      const saved = await saveQuiz(generated);
      startPreparation(saved, preset.durationMinutes);
    } catch (err: any) {
      console.error("Failed to generate preset quiz:", err);
      // Fallback with a pre-seeded high quality challenge
      const fallbackQuiz: QuizData = {
        id: `quiz_${Date.now()}`,
        userId: "local",
        title: preset.title,
        subject: preset.subject,
        topic: preset.topic,
        difficulty: preset.difficulty,
        totalQuestions: 5,
        createdAt: Date.now(),
        questions: [
          {
            id: 1,
            question: `In ${preset.topic}, which principle is most critical for optimizing performance?`,
            options: [
              "Minimizing gradient variance and loss error",
              "Maximizing redundant parameter iterations",
              "Bypassing constraint verification checks",
              "Omitting base-case validation criteria",
            ],
            correctOptionIndex: 0,
            explanation: "Minimizing loss error ensures optimal convergence and numerical stability across parameter updates.",
            hint: "Think about the objective function minimization.",
          },
          {
            id: 2,
            question: "What is the primary consequence of extreme overfitting in this domain?",
            options: [
              "High bias on training data and low variance",
              "High variance on unseen data despite zero training loss",
              "Instant convergence without parameter adjustment",
              "Linear scaling of execution complexity",
            ],
            correctOptionIndex: 1,
            explanation: "Overfitting memorizes noise in the training set, leading to poor generalization on unseen validation data.",
            hint: "Consider how the model generalizes to new samples.",
          },
          {
            id: 3,
            question: "Which time complexity or behavior is standard for this baseline approach?",
            options: [
              "Logarithmic O(log n) or linearithmic O(n log n)",
              "Exponential O(2^n) uncontrolled branching",
              "Infinite asymptotic divergence",
              "Static O(1) regardless of input dimensions",
            ],
            correctOptionIndex: 0,
            explanation: "Standard optimized divide-and-conquer or tree-based algorithms operate in O(n log n) time.",
            hint: "Consider standard divide-and-conquer bounds.",
          },
          {
            id: 4,
            question: "When evaluating trade-offs, which metric best captures false positive rates?",
            options: [
              "Specificity (1 - False Positive Rate)",
              "Raw absolute count of samples",
              "Random stochastic perturbation",
              "Input feature dimensionality",
            ],
            correctOptionIndex: 0,
            explanation: "Specificity measures true negative rate, directly bounding false positive inflation.",
            hint: "Recall the confusion matrix quadrants.",
          },
          {
            id: 5,
            question: "What is the recommended regularization technique to prevent parameter explosion?",
            options: [
              "L2 Ridge Penalization (Weight Decay)",
              "Disabling all gradient updates",
              "Multiplying learning rate by 100",
              "Removing all bias terms indiscriminately",
            ],
            correctOptionIndex: 0,
            explanation: "L2 weight decay penalizes large weights by adding the sum of squared weights to the loss function.",
            hint: "Think of shrinking large weights toward zero.",
          },
        ],
      };
      startPreparation(fallbackQuiz, preset.durationMinutes);
    } finally {
      setLoadingPresetId(null);
    }
  };

  // Generate Custom AI Quiz
  const handleGenerateCustomQuiz = async (e: React.FormEvent) => {
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
      startPreparation(saved, Math.ceil(questionCount * 0.5));
    } catch (err: any) {
      console.error("Failed to generate quiz:", err);
      setError(err.message || "Failed to generate quiz with Gemini. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header Bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Quizzes & Knowledge Challenges
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-900">
              <Flame className="h-3.5 w-3.5 text-amber-600" />
              Game Show Mode
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            One question at a time. Lock your answers against the clock. Strictly enforced quiz integrity.
          </p>
        </div>

        <button
          type="button"
          id="quiz-btn-custom-generate"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition active:scale-95 shrink-0"
        >
          <Sparkles className="h-4 w-4" />
          <span>Generate Custom Challenge</span>
        </button>
      </div>

      {/* 2. Challenge Categories Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-amber-500" />
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
              Choose Your Challenge
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {CATEGORY_PRESETS.length} Official Arenas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORY_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isLoadingThis = loadingPresetId === preset.id;

            return (
              <div
                key={preset.id}
                id={`quiz-preset-${preset.id}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all duration-200"
              >
                <div className="space-y-3">
                  {/* Category icon & Subject Badge */}
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${preset.bgColor} ${preset.color} border ${preset.borderColor}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-600">
                      {preset.difficulty}
                    </span>
                  </div>

                  {/* Challenge Title & Topic */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {preset.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  </div>
                </div>

                {/* Parameters & Start Action */}
                <div className="mt-5 space-y-3 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span className="flex items-center gap-1 text-slate-600">
                      <HelpCircle className="h-3 w-3 text-indigo-500" />
                      {preset.questionCount} Questions
                    </span>
                    <span className="flex items-center gap-1 text-slate-600">
                      <Clock className="h-3 w-3 text-amber-500" />
                      {preset.durationMinutes} Minutes
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isLoadingThis}
                    onClick={() => handleLaunchPreset(preset)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-xs group-hover:bg-indigo-600 transition active:scale-95 disabled:opacity-50"
                  >
                    {isLoadingThis ? (
                      <>
                        <Sparkles className="h-3.5 w-3.5 animate-spin" />
                        <span>Preparing Arena...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 fill-white" />
                        <span>Enter Challenge →</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Saved Custom Quizzes & Past Performance History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        {/* Saved AI Quizzes Vault (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Your Saved Quizzes</h3>
            <span className="text-xs text-slate-500">{quizzes.length} available</span>
          </div>

          <div className="space-y-3">
            {quizzes.length > 0 ? (
              quizzes.map((q) => (
                <div
                  key={q.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-indigo-200 transition gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-700">
                        {q.subject}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {q.questions.length} Questions • {q.difficulty}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{q.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-1">{q.topic}</p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => startPreparation(q)}
                      className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition"
                    >
                      <Play className="h-3.5 w-3.5 fill-white" />
                      <span>Start Quiz</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteQuiz(q.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition"
                      title="Delete saved quiz"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center space-y-2">
                <HelpCircle className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">No Custom Quizzes Created Yet</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Click "Generate Custom Challenge" to turn any topic, lecture note, or exam syllabus into a high-stakes quiz.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Past Performance Record (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Recent Quiz Sessions</h3>
            <span className="text-xs text-slate-500">{quizResults.length} recorded</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            {quizResults.length > 0 ? (
              quizResults.map((res) => {
                const isLeftEarly = res.terminationReason === "left_quiz";
                const isTimeOut = res.terminationReason === "time_expired";
                const isExpanded = expandedResultId === res.id;

                return (
                  <div
                    key={res.id}
                    className="border-b border-slate-100 pb-3 last:border-none last:pb-0 space-y-3"
                  >
                    <div
                      onClick={() => setExpandedResultId(isExpanded ? null : res.id)}
                      className="flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-xl transition"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <h5 className="font-bold text-xs text-slate-900 line-clamp-1">
                            {res.quizTitle}
                          </h5>
                          {isLeftEarly && (
                            <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[9px] font-black text-rose-800">
                              ENDED EARLY
                            </span>
                          )}
                          {isTimeOut && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-black text-amber-800">
                              TIME EXPIRED
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span>{res.subject}</span>
                          <span>•</span>
                          <span>
                            {res.score}/{res.totalQuestions} ({Math.floor(res.timeSpentSeconds / 60)}m {res.timeSpentSeconds % 60}s)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold shrink-0 ${
                            isLeftEarly
                              ? "bg-rose-100 text-rose-800"
                              : res.percentage >= 80
                              ? "bg-emerald-100 text-emerald-800"
                              : res.percentage >= 60
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {res.percentage}%
                        </span>
                        <div className="text-slate-400 hover:text-slate-600">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="pt-2 animate-fadeIn">
                        <MishraJiScoreReactionBanner
                          score={res.percentage}
                          userFirstName={firstName}
                          assessmentType="quiz"
                          difficulty={res.difficulty}
                          topic={res.topic}
                          subject={res.subject}
                          showActions={false}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No past sessions recorded yet. Enter a challenge above to begin!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. AI Quiz Generator Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Generate AI Quiz Challenge</h3>
                  <p className="text-xs text-slate-500">Gemini creates custom game-show multiple-choice questions</p>
                </div>
              </div>
              <button
                type="button"
                id="quiz-modal-close-btn"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateCustomQuiz} className="mt-4 space-y-4 text-xs">
              {error && (
                <div className="rounded-xl bg-rose-50 p-3.5 text-rose-700 border border-rose-200/90 shadow-xs space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <p className="font-semibold text-rose-800">{error}</p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-rose-700 transition"
                    >
                      {loading ? "Retrying..." : "Retry Now"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const fallbackPreset: CategoryPreset = {
                          id: `custom_${Date.now()}`,
                          title: topic || "Custom Challenge",
                          subject: subject || "General",
                          topic: topic || "Core Concepts",
                          description: "Diagnostic assessment set",
                          questionCount: questionCount || 5,
                          durationMinutes: Math.ceil((questionCount || 5) * 0.5),
                          difficulty: difficulty || "Intermediate",
                          icon: Sparkles,
                          color: "text-indigo-400",
                          bgColor: "bg-indigo-500/10",
                          borderColor: "border-indigo-500/30",
                        };
                        setShowCreateModal(false);
                        handleLaunchPreset(fallbackPreset);
                      }}
                      className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-50 transition"
                    >
                      Start Diagnostic Set
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Subject / Field
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Computer Science, Machine Learning, Organic Chemistry"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 font-medium focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Topic or Keywords
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Linear Regression & Gradient Descent, Red-Black Trees"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 font-medium focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Number of Questions
                  </label>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 font-medium focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                  >
                    <option value={3}>3 Questions (1.5 Min Sprint)</option>
                    <option value={5}>5 Questions (3 Min Challenge)</option>
                    <option value={8}>8 Questions (4 Min Gauntlet)</option>
                    <option value={10}>10 Questions (5 Min Full Assessment)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Difficulty Tier
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 font-medium focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                  >
                    <option value="Beginner">Beginner / Fundamentals</option>
                    <option value="Intermediate">Intermediate / Standard College</option>
                    <option value="Advanced">Advanced / Tricky Traps</option>
                    <option value="Mastery">Mastery / Competitive Exam</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Special Focus or Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. Include numerical calculations, emphasize edge cases"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 font-medium focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 transition active:scale-95"
                >
                  {loading ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-spin" />
                      <span>Generating Challenge with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Create Challenge</span>
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
