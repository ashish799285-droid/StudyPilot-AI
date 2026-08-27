import dns from "dns";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Ensure Node prioritizes IPv4 over IPv6 in container environments
dns.setDefaultResultOrder("ipv4first");

dotenv.config();

// Prioritized model chain: default to gemini-3.7-flash with automatic instant fallback to gemini-3.1-flash-lite
const PRIMARY_MODEL = "gemini-3.7-flash";
const FALLBACK_MODEL = "gemini-3.1-flash-lite";

// Dynamic cooldown timestamp to avoid spamming a known-exhausted model
let primaryModelCooldownUntil = 0;

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set in environment variables. Gemini calls will fail unless configured.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

/**
 * Returns a valid 3-digit HTTP status code (100-599) for Express res.status()
 * avoiding RangeError when error.status is a string (e.g. "UNAVAILABLE").
 */
function getValidHttpStatusCode(error: any): number {
  if (!error) return 500;
  if (typeof error.status === "number" && error.status >= 100 && error.status <= 599) {
    return error.status;
  }
  if (typeof error.statusCode === "number" && error.statusCode >= 100 && error.statusCode <= 599) {
    return error.statusCode;
  }
  if (typeof error.code === "number" && error.code >= 100 && error.code <= 599) {
    return error.code;
  }
  const msg = (error.message || String(error.status || error)).toLowerCase();
  if (msg.includes("503") || msg.includes("unavailable") || msg.includes("high demand") || msg.includes("overloaded")) return 503;
  if (msg.includes("429") || msg.includes("resource exhausted") || msg.includes("quota")) return 429;
  if (msg.includes("401") || msg.includes("unauthenticated") || msg.includes("api_key")) return 401;
  if (msg.includes("403") || msg.includes("permission_denied")) return 403;
  if (msg.includes("404") || msg.includes("not_found")) return 404;
  if (msg.includes("400") || msg.includes("invalid_argument")) return 400;
  return 500;
}

/**
 * Checks if an error is due to rate limits or quota exhaustion.
 */
function isQuotaExhaustedError(error: any): boolean {
  if (!error) return false;
  const status = error.status || error.statusCode || error.code || (error.response && error.response.status);
  if (status === 429) return true;
  const msg = (error.message || String(error)).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("resource_exhausted") ||
    msg.includes("resource exhausted") ||
    msg.includes("rate limit")
  );
}

/**
 * Checks if an error returned by Gemini / network is a transient error eligible for retry.
 */
function isTransientError(error: any): boolean {
  if (!error) return false;
  const status = error.status || error.statusCode || error.code || (error.response && error.response.status);
  if (status === 503 || status === 502 || status === 504) {
    return true;
  }
  const msg = (error.message || String(error)).toLowerCase();
  // Do not retry hard quota exhaustion on same model
  if (msg.includes("quota exceeded") || msg.includes("daily quota") || msg.includes("resource_exhausted")) {
    return false;
  }
  if (
    msg.includes("503") ||
    msg.includes("unavailable") ||
    msg.includes("high demand") ||
    msg.includes("spikes in demand") ||
    msg.includes("overloaded") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("fetch failed") ||
    msg.includes("network error")
  ) {
    return true;
  }
  return false;
}

/**
 * Executes a Gemini operation with exponential backoff and randomized jitter for transient errors (HTTP 503 / network).
 */
async function callWithRetry<T>(
  operation: (ai: GoogleGenAI) => Promise<T>,
  contextName: string = "Gemini API",
  maxRetries: number = 2
): Promise<T> {
  const ai = getGenAI();
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation(ai);
    } catch (error: any) {
      lastError = error;
      const isTransient = isTransientError(error);
      const isLastAttempt = attempt > maxRetries;

      console.warn(
        `[${contextName}] Attempt ${attempt}/${maxRetries + 1} failed: ${error.message || error}`
      );

      if (!isTransient || isLastAttempt) {
        throw error;
      }

      // Exponential backoff: ~1s on attempt 1, ~2s on attempt 2 + 0-300ms jitter
      const baseDelay = Math.pow(2, attempt - 1) * 1000;
      const jitter = Math.floor(Math.random() * 300);
      const delayMs = baseDelay + jitter;

      console.log(`[${contextName}] Retrying in ${delayMs}ms due to transient error...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/**
 * Executes Gemini requests with automatic fallback across models if quota/rate limits or persistent errors occur.
 */
async function executeGeminiWithFallback<T>(
  generator: (ai: GoogleGenAI, model: string) => Promise<T>,
  contextName: string = "Gemini API"
): Promise<T> {
  const now = Date.now();
  // If primary model recently experienced quota exhaustion, prioritize fallback model
  const candidateModels = (now < primaryModelCooldownUntil)
    ? [FALLBACK_MODEL, PRIMARY_MODEL]
    : [PRIMARY_MODEL, FALLBACK_MODEL];

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      return await callWithRetry(
        (ai) => generator(ai, model),
        `${contextName} [${model}]`,
        1 // 1 retry per model before trying next candidate
      );
    } catch (err: any) {
      lastError = err;
      const isQuota = isQuotaExhaustedError(err);
      if (isQuota && model === PRIMARY_MODEL) {
        // Set a 3-minute cooldown on primary model to avoid repeated rate-limit delays
        primaryModelCooldownUntil = Date.now() + 3 * 60 * 1000;
        console.warn(`[${contextName}] ${PRIMARY_MODEL} quota exhausted. Cooling down for 3m. Falling back to ${FALLBACK_MODEL}...`);
      } else {
        console.warn(`[${contextName}] Model ${model} encountered an issue. Falling back to next candidate...`);
      }
    }
  }

  throw lastError;
}

/**
 * Maps raw technical errors to clean, user-friendly responses while preserving detailed console logs.
 */
function formatErrorMessage(error: any): string {
  if (!error) return "An unexpected error occurred. Please try again.";
  const msg = (error.message || String(error)).toLowerCase();

  if (
    msg.includes("503") ||
    msg.includes("high demand") ||
    msg.includes("spikes in demand") ||
    msg.includes("unavailable") ||
    msg.includes("overloaded")
  ) {
    return "Gemini is experiencing unusually high demand right now. Please try again in a moment.";
  }

  if (msg.includes("429") || msg.includes("resource exhausted") || msg.includes("quota")) {
    return "Gemini API rate limit or quota reached. Please wait a moment and try again.";
  }

  if (msg.includes("api_key") || msg.includes("api key") || msg.includes("unauthenticated")) {
    return "Gemini API key is missing or invalid. Please check your GEMINI_API_KEY configuration.";
  }

  return "Unable to complete request with AI Tutor. Please try again in a moment.";
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
    });
  });

  // 1. AI Study Chat (Conversational Tutor with Document Grounding)
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const {
        messages,
        academicLevel = "High School / College",
        subject = "General",
        tutorTone = "Encouraging & Socratic",
        attachments = [],
      } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages array is required." });
      }

      const systemInstruction = `You are StudyPilot AI, an elite, patient, and engaging personal academic tutor and study companion.
The student is at the academic level: "${academicLevel}".
The current subject context is: "${subject}".
Tutor style/tone: "${tutorTone}".

Your core tutoring guidelines:
1. DOCUMENT GROUNDING: When study documents (PDFs, Word docs, spreadsheets, slides, text notes, or diagrams/images) are attached by the student, use them as the primary authoritative reference for answering their questions, generating summaries, notes, formulas, step-by-step walkthroughs, or multiple choice questions.
2. MULTI-DOCUMENT SYNTHESIS: If multiple documents are attached, intelligently cross-reference, compare, and integrate their contents.
3. CLEAR PEDAGOGY: Explain concepts with crystal clarity, using relatable examples, step-by-step logic, and intuitive analogies.
4. ADAPTIVE DEPTH: Adapt vocabulary and academic rigor to the student's level (${academicLevel}).
5. ACTIVE LEARNING: When explaining tricky concepts or problem sets, highlight key formulas and offer a quick 1-question "Check for Understanding" at the end.
6. RICH MARKDOWN: Format your responses with clean Markdown headers, bold terminology, bullet points, tables, and mathematical formulas.`;

      // Convert conversation history to Gemini contents format
      const contents = messages.map((m: { role: string; content: string }, index: number) => {
        const isLastMessage = index === messages.length - 1;
        const role = m.role === "assistant" ? "model" : "user";

        // For the latest user message, attach multimodal files and document content parts
        if (isLastMessage && role === "user" && Array.isArray(attachments) && attachments.length > 0) {
          const parts: any[] = [];

          // 1. Add multimodal attachments (PDFs & Images)
          for (const att of attachments) {
            if (att.isMultimodal && att.base64 && att.mimeType) {
              parts.push({
                inlineData: {
                  mimeType: att.mimeType,
                  data: att.base64,
                },
              });
            }
          }

          // 2. Add text-based document contents (DOCX, PPTX, XLSX, TXT, RTF, MD, etc.)
          for (const att of attachments) {
            if (att.textContent && att.textContent.trim()) {
              parts.push({
                text: `--- ATTACHED STUDY DOCUMENT: [${att.name}] ---\n${att.textContent.slice(0, 150000)}\n--- END OF ATTACHED STUDY DOCUMENT: [${att.name}] ---`,
              });
            }
          }

          // 3. Add the user prompt text
          parts.push({ text: m.content || "Please review the attached study material and provide a detailed overview/answers." });

          return { role, parts };
        }

        return {
          role,
          parts: [{ text: m.content }],
        };
      });

      const response = await executeGeminiWithFallback(
        (ai, model) =>
          ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction,
              temperature: 0.7,
            },
          }),
        "AI Tutor Chat"
      );

      const responseText = response.text || "I couldn't generate a response. Please try rephrasing your question.";
      return res.json({ reply: responseText });
    } catch (error: any) {
      console.error("Error in /api/gemini/chat:", error);
      const statusCode = getValidHttpStatusCode(error);
      const friendlyMessage = formatErrorMessage(error);
      return res.status(statusCode).json({
        error: friendlyMessage,
      });
    }
  });

  // 1.1 Refine / Edit Existing Study Plan
  app.post("/api/gemini/refine-study-plan", async (req, res) => {
    try {
      const { currentPlan, instruction } = req.body;

      if (!currentPlan || !instruction || !instruction.trim()) {
        return res.status(400).json({ error: "Current plan and modification instruction are required." });
      }

      const prompt = `You are an expert academic study planner and curriculum architect.
The student has an EXISTING study plan and wants to adjust/refine it with a specific instruction.

STUDENT MODIFICATION REQUEST:
"${instruction.trim()}"

CURRENT STUDY PLAN:
${JSON.stringify(currentPlan, null, 2)}

INSTRUCTIONS FOR ADJUSTMENT:
1. Make targeted modifications strictly fulfilling the student's request (e.g., adjust hours, rebalance subjects, reschedule days, add revision blocks, insert a mock test, increase/decrease intensity).
2. PRESERVE the existing plan structure, exam goal (${currentPlan.examName || "Finals"}), target exam date (${currentPlan.examDate || "Upcoming"}), and any existing completed task statuses.
3. Do NOT discard the entire plan or create an unrelated one. Rebalance the existing days and weekly milestones cleanly.
4. Provide a bulleted list of 2 to 4 concise change summary items describing what was updated.

Return a strictly valid JSON object ONLY:
{
  "changeSummary": [
    "Increased focus hours for requested subject",
    "Rebalanced daily study schedule",
    "Preserved core milestones and completed progress"
  ],
  "plan": {
    "title": "${currentPlan.title || 'Personalized Study Plan'}",
    "summary": "Updated study strategy reflecting the requested adjustments.",
    "examName": "${currentPlan.examName || 'Examinations'}",
    "examDate": "${currentPlan.examDate || 'Upcoming'}",
    "totalHoursPerWeek": ${currentPlan.totalHoursPerWeek || 21},
    "weeklyMilestones": [
      {
        "weekNumber": 1,
        "theme": "Week theme",
        "focusGoals": ["Goal 1", "Goal 2"],
        "days": [
          {
            "dayName": "Monday",
            "focusSubject": "Subject",
            "tasks": [
              {
                "id": "w1-d1-t1",
                "title": "Task title",
                "durationMinutes": 60,
                "priority": "High",
                "type": "Concept Learning",
                "completed": false
              }
            ]
          }
        ]
      }
    ],
    "proTips": [
      "Updated pro tip 1",
      "Updated pro tip 2",
      "Updated pro tip 3"
    ]
  }
}`;

      const response = await executeGeminiWithFallback(
        (ai, model) =>
          ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              temperature: 0.4,
              responseMimeType: "application/json",
            },
          }),
        "Study Plan Refinement"
      );

      const raw = response.text || "{}";
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      if (!parsed || !parsed.plan) {
        throw new Error("Failed to refine study plan. Please try rephrasing your adjustment request.");
      }

      return res.json({
        plan: parsed.plan,
        changeSummary: parsed.changeSummary || ["Plan updated based on your request"],
      });
    } catch (error: any) {
      console.error("Error in /api/gemini/refine-study-plan:", error);
      const statusCode = getValidHttpStatusCode(error);
      const friendlyMessage = formatErrorMessage(error);
      return res.status(statusCode).json({ error: friendlyMessage });
    }
  });

  // 2. AI Study Plan Generator
  app.post("/api/gemini/study-plan", async (req, res) => {
    try {
      const { subjects, hoursPerDay, targetExamDate, examName, difficultyLevel, studyPace, targetScore, additionalNotes } = req.body;

      if (!subjects || subjects.length === 0) {
        return res.status(400).json({ error: "At least one subject is required." });
      }

      const prompt = `Create a comprehensive, structured study plan for a student.
Details:
- Target Exam/Goal: ${examName || "Final Exams"}
- Target Date: ${targetExamDate || "In 4 weeks"}
- Subjects/Topics: ${Array.isArray(subjects) ? subjects.join(", ") : subjects}
- Daily Study Hours: ${hoursPerDay || 3} hours/day
- Preparation Level / Difficulty: ${difficultyLevel || "Intermediate"}
- Preferred Study Pace: ${studyPace || "Balanced"}
- Target Score / Goal: ${targetScore || "A / High Distinction"}
- Additional Student Notes: ${additionalNotes || "None"}

Please generate a structured, highly actionable study plan in valid JSON format ONLY. Do not include markdown code block markers or backticks around the json, return pure raw JSON or JSON within \`\`\`json\`\`\`.

JSON structure required:
{
  "title": "Short descriptive title of plan",
  "summary": "2-3 sentence strategic overview of the plan",
  "examDate": "${targetExamDate || "In 4 weeks"}",
  "totalHoursPerWeek": ${Number(hoursPerDay || 3) * 7},
  "weeklyMilestones": [
    {
      "weekNumber": 1,
      "theme": "Core Foundations & Diagnostic Review",
      "focusGoals": ["Goal 1", "Goal 2"],
      "days": [
        {
          "dayName": "Monday",
          "focusSubject": "Subject Name",
          "tasks": [
            { "id": "w1-d1-t1", "title": "Specific Topic Study", "durationMinutes": 60, "priority": "High", "type": "Concept Learning" },
            { "id": "w1-d1-t2", "title": "Practice Problems & Flashcards", "durationMinutes": 45, "priority": "Medium", "type": "Active Recall" }
          ]
        },
        {
          "dayName": "Tuesday",
          "focusSubject": "Subject Name",
          "tasks": [
            { "id": "w1-d2-t1", "title": "Deep Dive Topic", "durationMinutes": 60, "priority": "High", "type": "Problem Solving" }
          ]
        },
        {
          "dayName": "Wednesday",
          "focusSubject": "Subject Name",
          "tasks": [
            { "id": "w1-d3-t1", "title": "Formula Review & Practice Set", "durationMinutes": 60, "priority": "High", "type": "Practice" }
          ]
        },
        {
          "dayName": "Thursday",
          "focusSubject": "Subject Name",
          "tasks": [
            { "id": "w1-d4-t1", "title": "Review tricky concepts", "durationMinutes": 60, "priority": "Medium", "type": "Review" }
          ]
        },
        {
          "dayName": "Friday",
          "focusSubject": "Subject Name",
          "tasks": [
            { "id": "w1-d5-t1", "title": "Weekly Mixed Quiz", "durationMinutes": 45, "priority": "High", "type": "Self-Assessment" }
          ]
        },
        {
          "dayName": "Saturday",
          "focusSubject": "Review & Catch-up",
          "tasks": [
            { "id": "w1-d6-t1", "title": "Error log analysis & spaced repetition", "durationMinutes": 60, "priority": "Medium", "type": "Spaced Repetition" }
          ]
        },
        {
          "dayName": "Sunday",
          "focusSubject": "Rest & Light Preview",
          "tasks": [
            { "id": "w1-d7-t1", "title": "Organize notes and preview next week", "durationMinutes": 30, "priority": "Low", "type": "Planning" }
          ]
        }
      ]
    },
    {
      "weekNumber": 2,
      "theme": "Advanced Application & Deep Practice",
      "focusGoals": ["Master complex problem types", "Timed practice sets"],
      "days": [
        {
          "dayName": "Monday",
          "focusSubject": "Subject Name",
          "tasks": [
            { "id": "w2-d1-t1", "title": "Advanced Problem Solving", "durationMinutes": 60, "priority": "High", "type": "Deep Work" }
          ]
        }
      ]
    }
  ],
  "proTips": [
    "Use 25/5 Pomodoro intervals for deep focus.",
    "Do active recall practice before looking at answers.",
    "Review your error log every 3 days."
  ]
}`;

      const response = await executeGeminiWithFallback(
        (ai, model) =>
          ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              temperature: 0.5,
              responseMimeType: "application/json",
            },
          }),
        "Study Plan Generator"
      );

      const raw = response.text || "{}";
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      const planData = JSON.parse(cleaned);

      return res.json({ plan: planData });
    } catch (error: any) {
      console.error("Error in /api/gemini/study-plan:", error);
      const statusCode = getValidHttpStatusCode(error);
      const friendlyMessage = formatErrorMessage(error);
      return res.status(statusCode).json({
        error: friendlyMessage,
      });
    }
  });

  // 3. AI Notes Generator
  app.post("/api/gemini/notes", async (req, res) => {
    try {
      const { topic, subject, academicLevel, formatStyle, keySubtopics, includeExamples = true, includeMnemonics = true, includeQuizCheck = true } = req.body;

      if (!topic) {
        return res.status(400).json({ error: "Topic is required." });
      }

      const prompt = `You are a master educator creating high-retention, high-yield study revision notes.
Topic: "${topic}"
Subject: "${subject || "General Academic"}"
Target Academic Level: "${academicLevel || "College / Undergraduate"}"
Format Style: "${formatStyle || "Comprehensive Master Notes"}"
Key Subtopics to emphasize: "${keySubtopics || "Comprehensive coverage of core concepts"}"

Generate structured, beautifully formatted revision notes with:
1. # Clear H1 Title and 1-paragraph High-Level Overview / Definition
2. ## 🎯 Core Concepts & Principles (with bold terms, explanations, and logical breakdown)
3. ## 📐 Key Formulas, Definitions & Rules (table or highlighted code/callout blocks)
4. ${includeExamples ? "## 💡 Real-World Examples & Step-by-Step Case Studies" : ""}
5. ${includeMnemonics ? "## 🧠 Memory Aids, Mnemonics & Common Pitfalls to Avoid" : ""}
6. ## ⚡ Quick Revision Summary / Cheat-Sheet (bulleted high-yield points)
7. ${includeQuizCheck ? "## 📝 3 Quick Self-Check Questions (with answers folded or provided)" : ""}

Ensure the formatting is rich Markdown with clear headings, tables, bullet points, and callouts.`;

      const response = await executeGeminiWithFallback(
        (ai, model) =>
          ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              temperature: 0.6,
            },
          }),
        "Notes Generator"
      );

      const noteContent = response.text || `# Notes on ${topic}\n\nCould not generate notes. Please try again.`;
      
      // Also generate a 1-line concise summary
      return res.json({
        topic,
        subject: subject || "General",
        academicLevel: academicLevel || "College",
        content: noteContent,
      });
    } catch (error: any) {
      console.error("Error in /api/gemini/notes:", error);
      const statusCode = getValidHttpStatusCode(error);
      const friendlyMessage = formatErrorMessage(error);
      return res.status(statusCode).json({
        error: friendlyMessage,
      });
    }
  });

  // 4. AI Quiz Generator
  app.post("/api/gemini/quiz", async (req, res) => {
    try {
      const { subject, topic, questionCount = 5, difficulty = "Intermediate", academicLevel = "High School / College", customInstructions } = req.body;

      if (!topic && !subject) {
        return res.status(400).json({ error: "Subject or topic is required." });
      }

      const count = Math.min(Math.max(Number(questionCount) || 5, 3), 15);

      const prompt = `Generate an interactive academic quiz with exactly ${count} high-quality questions.
Subject: "${subject || "General"}"
Topic: "${topic || "General Concepts"}"
Difficulty: "${difficulty}"
Academic Level: "${academicLevel}"
${customInstructions ? `Special Instructions: ${customInstructions}` : ""}

Return a strictly valid JSON object ONLY. No markdown wrapper if possible, or inside \`\`\`json\`\`\`.

Required JSON format:
{
  "title": "${topic || subject} Mastery Quiz",
  "subject": "${subject || "General"}",
  "topic": "${topic || "General"}",
  "difficulty": "${difficulty}",
  "totalQuestions": ${count},
  "questions": [
    {
      "id": 1,
      "question": "Clear, precise academic question text?",
      "options": [
        "A) Option 1 text",
        "B) Option 2 text",
        "C) Option 3 text",
        "D) Option 4 text"
      ],
      "correctOptionIndex": 0,
      "explanation": "Thorough, clear explanation of why this answer is correct and why the other alternatives are incorrect.",
      "hint": "Subtle hint to guide thinking without spoiling the answer."
    }
  ]
}`;

      const response = await executeGeminiWithFallback(
        (ai, model) =>
          ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              temperature: 0.6,
              responseMimeType: "application/json",
            },
          }),
        "Quiz Generator"
      );

      const raw = response.text || "{}";
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      const quizData = JSON.parse(cleaned);

      return res.json({ quiz: quizData });
    } catch (error: any) {
      console.error("Error in /api/gemini/quiz:", error);
      const statusCode = getValidHttpStatusCode(error);
      const friendlyMessage = formatErrorMessage(error);
      return res.status(statusCode).json({
        error: friendlyMessage,
      });
    }
  });

  // Explicit JSON 404 handler for all unmatched /api/* routes to prevent falling through to Vite SPA index.html
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
  });

  // Global error handling middleware for API routes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Server error:", err);
    if (req.path.startsWith("/api/")) {
      const statusCode = getValidHttpStatusCode(err);
      return res.status(statusCode).json({ error: formatErrorMessage(err) });
    }
    next(err);
  });

  // Vite Middleware Setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`StudyPilot AI server running on http://localhost:${PORT}`);
  });
}

startServer();
