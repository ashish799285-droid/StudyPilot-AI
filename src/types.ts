export interface StudentProfile {
  uid: string;
  name: string;
  email: string;
  avatarUrl?: string;
  gradeLevel: string; // e.g. "College / University", "High School Senior", "Graduate / Pre-Med"
  targetGoal: string; // e.g. "Score 90%+ in Finals", "Master Organic Chemistry"
  streakDays: number;
  lastStudyDate?: string;
  totalStudyMinutes: number;
  completedTasksCount: number;
  preferences?: {
    theme?: "light" | "dark" | "system";
    tutorTone?: string;
    pomodoroLength?: number;
  };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  subject?: string;
  attachments?: {
    name: string;
    formattedSize: string;
    category?: string;
  }[];
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  subject: string;
  academicLevel: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface StudyPlanTask {
  id: string;
  title: string;
  durationMinutes: number;
  priority: "High" | "Medium" | "Low";
  type: string;
  completed?: boolean;
}

export interface StudyPlanDay {
  dayName: string;
  focusSubject: string;
  tasks: StudyPlanTask[];
}

export interface StudyPlanWeek {
  weekNumber: number;
  theme: string;
  focusGoals: string[];
  days: StudyPlanDay[];
}

export interface StudyPlan {
  id: string;
  userId: string;
  title: string;
  subject?: string;
  summary: string;
  examName?: string;
  examDate: string;
  totalHoursPerWeek: number;
  weeklyMilestones: StudyPlanWeek[];
  proTips: string[];
  createdAt: number;
  active: boolean;
}

export interface NoteItem {
  id: string;
  userId: string;
  topic: string;
  subject: string;
  academicLevel: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  creator?: string; // Default: "Mishra Ji"
  isFavorite?: boolean;
  tags?: string[];
  lastReadAt?: number;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  hint?: string;
}

export interface QuizData {
  id: string;
  userId: string;
  title: string;
  subject: string;
  topic: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Mastery";
  totalQuestions: number;
  questions: QuizQuestion[];
  createdAt: number;
}

export type QuizTerminationReason =
  | "completed"
  | "time_expired"
  | "left_quiz"
  | "manually_submitted";

export interface QuizResult {
  id: string;
  userId: string;
  quizId: string;
  quizTitle: string;
  subject: string;
  topic: string;
  difficulty: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  answers: {
    questionId: number;
    selectedOptionIndex: number; // -1 if unanswered
    isCorrect: boolean;
  }[];
  timeSpentSeconds: number;
  completedAt: number;
  terminationReason: QuizTerminationReason;
}

export interface ActiveQuizSession {
  sessionId: string;
  quiz: QuizData;
  currentQuestionIndex: number;
  selectedAnswers: Record<number, number>; // questionId -> optionIndex
  lockedAnswers: Record<number, number>;
  startTime: number;
  totalDurationSeconds: number;
  timeRemainingSeconds: number;
  status: "preparing" | "active" | "terminal";
  terminationReason?: QuizTerminationReason;
  result?: QuizResult;
}

export type NavigationTab =
  | "dashboard"
  | "tutor"
  | "planner"
  | "timer"
  | "revision"
  | "notes"
  | "quizzes"
  | "settings";

export type RevisionStatus = "Needs Review" | "Developing" | "Strong" | "Mastered";
export type RecallRating = "forgot" | "difficult" | "good" | "easy";

export interface RevisionCardSource {
  type: "plan" | "tutor" | "document" | "quiz" | "custom" | "notes";
  name?: string;
  id?: string;
}

export interface RevisionCard {
  id: string;
  userId: string;
  subject: string;
  topic: string;
  question: string;
  answer: string;
  explanation?: string;
  example?: string;
  keyTakeaway?: string;
  source?: RevisionCardSource;
  difficultyLevel?: "Beginner" | "Intermediate" | "Advanced";
  status: RevisionStatus;
  repetitionIntervalDays: number;
  easeFactor: number;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  totalReviews: number;
  successfulRecalls: number;
  incorrectRecalls: number;
  lastReviewedAt?: number;
  nextReviewDate: string; // YYYY-MM-DD
  nextReviewTimestamp: number;
  priorityScore?: number;
  isHidden?: boolean;
  isMastered?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface RevisionReviewLog {
  id: string;
  cardId: string;
  userId: string;
  subject: string;
  topic: string;
  rating: RecallRating;
  previousInterval: number;
  newInterval: number;
  reviewedAt: number;
}

export interface RevisionSessionResult {
  totalReviewed: number;
  forgotCount: number;
  difficultCount: number;
  goodCount: number;
  easyCount: number;
  topicsReinforced: string[];
  durationSeconds: number;
  completedAt: number;
}

export interface RevisionDailyQueue {
  priorityCards: RevisionCard[];   // 🔴 Needs review / failed
  reinforceCards: RevisionCard[];  // 🟡 Developing / inconsistent
  maintainCards: RevisionCard[];   // 🟢 Strong / normal spaced check
  totalDueCount: number;
  overdueCount: number;
  examApproachingMessage?: string;
}

export interface StudySessionRecord {
  id: string;
  userId: string;
  subject: string;
  topic: string;
  taskTitle?: string;
  planId?: string;
  taskId?: string;
  plannedDurationMinutes: number;
  actualDurationMinutes: number;
  status: "Completed" | "Partially completed" | "Interrupted" | "Cancelled";
  date: string; // YYYY-MM-DD
  startedAt: number;
  completedAt: number;
  notes?: string;
}

export type TimerMode = "focus" | "break" | "completed";
export type TimerState = "idle" | "running" | "paused" | "completed";

export interface FocusRecommendation {
  durationMinutes: number;
  breakMinutes: number;
  reason: string;
  suggestedTechnique?: string;
}

export interface ActiveTimerSession {
  sessionId: string;
  mode: TimerMode;
  state: TimerState;
  subject: string;
  topic: string;
  taskTitle?: string;
  planId?: string;
  taskId?: string;
  plannedFocusMinutes: number;
  breakMinutes: number;
  startTime: number;
  targetEndTime: number;
  timeRemainingSeconds: number;
  totalFocusedSeconds: number;
  lastTickTime: number;
  reason?: string;
}
