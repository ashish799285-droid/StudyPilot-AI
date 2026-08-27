import { ChatMessage, StudyPlan, NoteItem, QuizData, QuizResult } from "../types";

export const api = {
  // 1. AI Study Chat
  async sendChatMessage(
    messages: { role: "user" | "assistant"; content: string }[],
    academicLevel: string = "High School / College",
    subject: string = "General",
    tutorTone: string = "Encouraging & Socratic"
  ): Promise<string> {
    const res = await fetch("/api/gemini/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, academicLevel, subject, tutorTone }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error ${res.status}: Failed to get AI Tutor response`);
    }

    const data = await res.json();
    return data.reply;
  },

  // 2. AI Study Plan
  async generateStudyPlan(params: {
    subjects: string[];
    hoursPerDay: number;
    targetExamDate: string;
    examName: string;
    difficultyLevel: string;
    studyPace: string;
    targetScore: string;
    additionalNotes?: string;
  }): Promise<Omit<StudyPlan, "id" | "userId" | "createdAt" | "active">> {
    const res = await fetch("/api/gemini/study-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error ${res.status}: Failed to generate study plan`);
    }

    const data = await res.json();
    return data.plan;
  },

  // 3. AI Notes Generator
  async generateNotes(params: {
    topic: string;
    subject: string;
    academicLevel: string;
    formatStyle: string;
    keySubtopics?: string;
    includeExamples?: boolean;
    includeMnemonics?: boolean;
    includeQuizCheck?: boolean;
  }): Promise<{ topic: string; subject: string; content: string }> {
    const res = await fetch("/api/gemini/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error ${res.status}: Failed to generate revision notes`);
    }

    const data = await res.json();
    return data;
  },

  // 4. AI Quiz Generator
  async generateQuiz(params: {
    subject: string;
    topic: string;
    questionCount: number;
    difficulty: string;
    academicLevel: string;
    customInstructions?: string;
  }): Promise<Omit<QuizData, "id" | "userId" | "createdAt">> {
    const res = await fetch("/api/gemini/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error ${res.status}: Failed to generate quiz`);
    }

    const data = await res.json();
    return data.quiz;
  },
};
