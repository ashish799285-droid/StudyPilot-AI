import { StudyPlan, NoteItem, QuizData } from "../types";

/**
 * Safely parses response body as JSON, inspecting Content-Type first
 * to avoid "Unexpected token '<', '<!doctype '... is not valid JSON" errors.
 */
async function parseJsonResponse<T>(res: Response, endpointLabel: string): Promise<T> {
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.toLowerCase().includes("application/json");

  if (!isJson) {
    const rawText = await res.text().catch(() => "");
    console.error(
      `[API Error] ${endpointLabel} returned non-JSON content-type: "${contentType}". Status: ${res.status}. Body preview:`,
      rawText.slice(0, 300)
    );

    if (res.status === 503) {
      throw new Error("Gemini is experiencing unusually high demand right now. Please try again in a moment.");
    }
    if (res.status === 429) {
      throw new Error("The service is receiving too many requests right now. Please wait a moment.");
    }
    if (res.status === 404) {
      throw new Error("API endpoint not found. Please verify the server is running.");
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error("Authentication failed for the AI service. Please check your API key configuration.");
    }
    throw new Error(`Server returned HTML/unexpected format (Status: ${res.status}). Please try again.`);
  }

  let data: any;
  try {
    data = await res.json();
  } catch (err: any) {
    console.error(`[API Error] JSON parse failure for ${endpointLabel}:`, err);
    throw new Error("Failed to parse AI response. Please try again.");
  }

  if (!res.ok) {
    const errorMsg = data?.error || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

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

    const data = await parseJsonResponse<{ reply: string }>(res, "AI Tutor Chat (/api/gemini/chat)");
    if (!data.reply) {
      throw new Error("No response was returned from the AI Tutor. Please try asking again.");
    }
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

    const data = await parseJsonResponse<{ plan: Omit<StudyPlan, "id" | "userId" | "createdAt" | "active"> }>(
      res,
      "Study Plan (/api/gemini/study-plan)"
    );
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

    const data = await parseJsonResponse<{ topic: string; subject: string; content: string }>(
      res,
      "Notes Generator (/api/gemini/notes)"
    );
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

    const data = await parseJsonResponse<{ quiz: Omit<QuizData, "id" | "userId" | "createdAt"> }>(
      res,
      "Quiz Generator (/api/gemini/quiz)"
    );
    return data.quiz;
  },
};
