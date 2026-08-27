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
  isFavorite?: boolean;
  tags?: string[];
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
  answers: {
    questionId: number;
    selectedOptionIndex: number;
    isCorrect: boolean;
  }[];
  timeSpentSeconds: number;
  completedAt: number;
}

export type NavigationTab =
  | "dashboard"
  | "tutor"
  | "planner"
  | "notes"
  | "quizzes"
  | "settings";
