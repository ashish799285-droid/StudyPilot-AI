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
const MODEL_PRIORITY_LIST = [PRIMARY_MODEL, FALLBACK_MODEL];

// Dynamic cooldown timestamp per model to avoid spamming a model experiencing high demand (503) or rate limits (429)
const modelCooldowns: Record<string, number> = {};

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
  if (msg.includes("503") || msg.includes("unavailable") || msg.includes("high demand") || msg.includes("overloaded") || msg.includes("spikes in demand")) return 503;
  if (msg.includes("429") || msg.includes("resource exhausted") || msg.includes("quota") || msg.includes("rate limit")) return 429;
  if (msg.includes("401") || msg.includes("unauthenticated") || msg.includes("api_key") || msg.includes("api key")) return 401;
  if (msg.includes("403") || msg.includes("permission_denied")) return 403;
  if (msg.includes("404") || msg.includes("not_found")) return 404;
  if (msg.includes("400") || msg.includes("invalid_argument")) return 400;
  return 500;
}

/**
 * Checks if an error is due to high server demand (503) or rate limits / quota (429).
 */
function isOverloadedOrQuotaError(error: any): boolean {
  if (!error) return false;
  const status = error.status || error.statusCode || error.code || (error.response && error.response.status);
  if (status === 503 || status === 429) return true;
  const msg = (error.message || String(error)).toLowerCase();
  return (
    msg.includes("503") ||
    msg.includes("429") ||
    msg.includes("high demand") ||
    msg.includes("spikes in demand") ||
    msg.includes("unavailable") ||
    msg.includes("overloaded") ||
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
 * Executes a Gemini operation with exponential backoff and randomized jitter for transient network glitches.
 */
async function callWithRetry<T>(
  operation: (ai: GoogleGenAI) => Promise<T>,
  contextName: string = "Gemini API",
  maxRetries: number = 1
): Promise<T> {
  const ai = getGenAI();
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation(ai);
    } catch (error: any) {
      lastError = error;
      const isTransient = isTransientError(error);
      const isOverloaded = isOverloadedOrQuotaError(error);
      const isLastAttempt = attempt > maxRetries;

      console.warn(
        `[${contextName}] Attempt ${attempt}/${maxRetries + 1} failed: ${error.message || error}`
      );

      // If the model is experiencing 503 high demand or 429 quota, don't wait on the same overloaded model;
      // throw immediately so executeGeminiWithFallback can switch to the backup model with zero delay.
      if (isOverloaded || !isTransient || isLastAttempt) {
        throw error;
      }

      // Quick retry for transient connection glitches
      const delayMs = 500 + Math.floor(Math.random() * 200);
      console.log(`[${contextName}] Retrying in ${delayMs}ms due to network glitch...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/**
 * Executes Gemini requests with automatic fallback across models.
 * If a model is on cooldown (due to recent 503/429), available healthy models are prioritized first.
 */
async function executeGeminiWithFallback<T>(
  generator: (ai: GoogleGenAI, model: string) => Promise<T>,
  contextName: string = "Gemini API"
): Promise<T> {
  const now = Date.now();

  // Sort candidate models so active healthy models run before models currently in cooldown
  const candidateModels = [...MODEL_PRIORITY_LIST].sort((a, b) => {
    const aInCooldown = (modelCooldowns[a] || 0) > now ? 1 : 0;
    const bInCooldown = (modelCooldowns[b] || 0) > now ? 1 : 0;
    return aInCooldown - bInCooldown;
  });

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const result = await callWithRetry(
        (ai) => generator(ai, model),
        `${contextName} [${model}]`,
        0 // 0 retries on same model if overloaded, switch directly to next candidate model
      );
      // Clear cooldown on success
      if (modelCooldowns[model]) {
        delete modelCooldowns[model];
      }
      return result;
    } catch (err: any) {
      lastError = err;
      if (isOverloadedOrQuotaError(err)) {
        // Set a 2-minute cooldown on this model so other requests switch immediately to backup models
        modelCooldowns[model] = Date.now() + 2 * 60 * 1000;
        console.warn(`[${contextName}] ${model} experiencing high demand or rate limit. Cooling down for 2m. Falling back to alternative model...`);
      } else {
        console.warn(`[${contextName}] Model ${model} encountered an issue. Falling back to next candidate...`);
      }
    }
  }

  throw lastError;
}

/**
 * Safely extracts and parses JSON from model responses, stripping any markdown wrappers or stray characters.
 */
function extractAndParseJSON(rawText: string, fallback: any = null): any {
  if (!rawText || typeof rawText !== "string") return fallback;
  try {
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    try {
      const match = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (e) {
      console.warn("JSON extraction regex fallback failed:", e);
    }
  }
  return fallback;
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

  // 1. AI Study Chat (Conversational Tutor with Mishra Ji's Identity & Study Room Personality)
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const {
        messages,
        academicLevel = "High School / College",
        subject = "General",
        tutorTone = "Encouraging & Socratic",
        attachments = [],
        studentName = "",
        timeOfDay = "afternoon",
        activeNoteContext = null,
        userNotes = [],
      } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages array is required." });
      }

      // Extract clean first name from student's profile name (if provided)
      let firstName = "";
      if (typeof studentName === "string" && studentName.trim()) {
        const cleaned = studentName.trim().replace(/^(mr\.|mrs\.|ms\.|dr\.|prof\.)\s+/i, "");
        const firstWord = cleaned.split(/\s+/)[0];
        const genericNames = ["user", "student", "guest", "admin", "anonymous", "null", "undefined"];
        if (firstWord && firstWord.length >= 2 && !genericNames.includes(firstWord.toLowerCase())) {
          firstName = firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
        }
      }

      const namePersonalizationRule = firstName
        ? `STUDENT IDENTITY & PERSONALIZATION:
- The student's first name is "${firstName}".
- You are their dedicated personal AI tutor Mishra Ji sitting with them in their personal digital study library room.
- Use "${firstName}" naturally, warmly, and respectfully during the conversation.
- Use their name particularly when:
  • Starting an explanation or welcoming them ("Awesome start, ${firstName}! 👏", "Nice question, ${firstName}.")
  • Acknowledging progress ("I see where you're going, ${firstName}.", "That's a strong observation, ${firstName}.")
  • Encouraging them ("Good move, ${firstName}.", "You're very close, ${firstName}.")
  • Celebrating breakthroughs ("Exactly, ${firstName} — that's the key idea! 🔥")
  • Breaking down difficult problems ("Don't worry, ${firstName}. Let's break this down.")
  • Taking reasoning further ("Good thinking, ${firstName}. Now let's take it one step further.")
- CRITICAL: Do NOT mention their name in every single sentence or robotically. Make it feel natural, empathetic, and warm.`
        : `STUDENT IDENTITY & PERSONALIZATION:
- No student first name was provided. Provide warm, authentic encouragement without inventing a name or using generic placeholders like "Student" or "User".`;

      let noteLibraryContext = "";
      if (activeNoteContext) {
        noteLibraryContext += `\n\n--- ACTIVE REVISION NOTE OPEN ON DESK: [${activeNoteContext.topic || activeNoteContext.title}] ---
Subject: ${activeNoteContext.subject || "General"}
Academic Level: ${activeNoteContext.academicLevel || "Standard"}
Created By: Mishra Ji
Content:
${activeNoteContext.content}
--- END OF ACTIVE REVISION NOTE ---\n`;
      }

      if (Array.isArray(userNotes) && userNotes.length > 0) {
        const noteSummaries = userNotes.slice(0, 8).map((n: any, idx: number) => 
          `[Note #${idx + 1}] Title: "${n.topic || n.title}" | Subject: "${n.subject}" | Summary/Preview: "${(n.content || "").slice(0, 300)}..."`
        ).join("\n");
        noteLibraryContext += `\n\n--- STUDENT'S REVISION LIBRARY SHELVES (Accessible to you as Mishra Ji) ---\n${noteSummaries}\n--- END OF STUDENT REVISION LIBRARY ---\n`;
      }

      const systemInstruction = `You are MISHRA JI — the student's personal AI tutor inside StudyPilot.
Internally and externally, you know: "My name is Mishra Ji. I am the user's personal AI tutor inside StudyPilot."

MISHRA JI'S ROLE & PURPOSE:
- You are the student's:
  • Personal tutor
  • Study companion
  • Revision assistant
  • Quiz mentor
  • Note creator
  • Learning guide

MISHRA JI'S PERSONALITY & DEMEANOR:
- Intelligent, patient, warm, respectful, encouraging, knowledgeable, calm, slightly witty, supportive, academically serious when necessary, and conversational.
- You are sitting with the student in their personal Digital Study Library room. Current room ambience: ${timeOfDay}.
- You can naturally refer to yourself by name when fitting (e.g., "Mishra Ji is here with you${firstName ? `, ${firstName}` : ""}. Let's master this concept.", "Don't worry — let Mishra Ji show you the intuition behind this formula.", "Come on, let's solve this together."), but do not overuse it.

${namePersonalizationRule}

Student Academic Level: "${academicLevel}"
Current Subject: "${subject}"
Preferred Tutoring Tone/Style: "${tutorTone}"

CORE TUTOR BEHAVIORAL & PEDAGOGICAL PRINCIPLES:

1. DYNAMIC & NATURAL ENCOURAGEMENT (ROTATE DIVERSE PHRASES)
- Proactively provide genuine, varied encouragement matching the student's exact state:
  • New question or inquiry: "Awesome start${firstName ? `, ${firstName}` : ""}! 👏", "I see where you're going.", "Good move — this is exactly the right place to begin.", "That's a strong observation."
  • Close or developing reasoning: "You're very close.", "Good thinking. Now let's take it one step further.", "You're on the right track."
  • Breakthroughs & correct logic: "Exactly — that's the key idea! 🔥", "Spot on! That's excellent reasoning.", "Perfect — you connected the concepts."
  • Confusion or tricky topic: "Don't worry${firstName ? `, ${firstName}` : ""}. Let's break this down into simple, intuitive steps.", "This is a concept many students find tricky at first. Let's look at the underlying picture."
- Never overuse or repeat the exact same phrase mechanically.

2. TEACHING-FIRST & CONCEPTUAL CLARITY
- Provide crystal-clear explanations, physical intuition, and step-by-step logic before or alongside mathematical formulations.
- Structure responses cleanly with readable formatting, markdown bullet points, bold key terms, and code/math blocks.

3. MATHEMATICAL, SCIENTIFIC & CHEMICAL FORMULA RENDERING:
- Use standard, clean LaTeX formatting for all mathematical equations, scientific variables, and chemical formulas so they typeset beautifully.
- Display Equations (Standalone formulas): Wrap with $$ ... $$ on separate lines.
  Examples:
  $$MSE = \\frac{1}{n}\\sum_{i=1}^{n}(y_i-\\hat{y}_i)^2$$
  $$CaCO_3 \\xrightarrow{\\Delta} CaO + CO_2$$
  $$2H_2O \\xrightarrow{\\text{electricity}} 2H_2 + O_2$$
- Inline Math & Chemical Species: Wrap with $ ... $.
  Examples: $E = mc^2$, $A + B \\rightarrow AB$, $AB \\rightarrow A + B$, $A + BC \\rightarrow AC + B$, $AB + CD \\rightarrow AD + CB$, $\\text{Hydrocarbon} + O_2 \\rightarrow CO_2 + H_2O$, $H_2O$, $CO_2$, $Na^+$, $SO_4^{2-}$.
- Ensure formulas are cleanly formatted with matching delimiters and proper LaTeX syntax.

4. REVISION NOTES INTEGRATION
- You are also the creator of the student's revision notes in their StudyPilot Revision Library.
- When the student asks about their notes (e.g., "Explain section 2 of my notes", "Quiz me on my Linear Regression notes", "Summarize my notes"), use the provided revision notes context seamlessly to teach and guide them.

5. MULTIMODAL & ATTACHED DOCUMENTS
- Attached documents (PDFs, images, slides, notes) are primary study materials. Ground your answers directly on their text and figures while providing deep conceptual clarity.

6. AVOID ROBOTIC CLICHÉS
- Avoid generic AI phrases like "As an AI language model...", "Certainly!", or "I hope this helps!". Speak like Mishra Ji, a dedicated, wise, and supportive tutor in the student's study room.
${noteLibraryContext}`;

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

  // 1.05 Automatic Chat Title Generator
  app.post("/api/gemini/chat-title", async (req, res) => {
    try {
      const { userMessage, subject = "General" } = req.body;
      if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
        return res.json({ title: `${subject || "General"} Study Session` });
      }

      const prompt = `Generate a very concise, high-yield academic topic title (2 to 4 words maximum) for a study session that starts with this student message:
"${userMessage.trim().slice(0, 300)}"

Examples:
- "How does gradient descent actually work?" -> "Understanding Gradient Descent"
- "Explain MSE." -> "Mean Squared Error"
- "Help me solve this quadratic equation" -> "Quadratic Equations"
- "Can you review my biology notes on photosynthesis?" -> "Photosynthesis Review"

Rules:
1. Return ONLY the 2-4 word plain title string. No quotes, no markdown, no punctuation at the end.`;

      const response = await executeGeminiWithFallback(
        (ai, model) =>
          ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              temperature: 0.2,
              maxOutputTokens: 20,
            },
          }),
        "Chat Title Generator"
      );

      const rawTitle = response.text ? response.text.trim().replace(/^["']|["']$/g, "") : "";
      const safeTitle = rawTitle && rawTitle.length > 2 && rawTitle.length < 50
        ? rawTitle
        : (userMessage.length > 30 ? userMessage.slice(0, 30) + "..." : userMessage);

      return res.json({ title: safeTitle });
    } catch (error) {
      console.error("Error generating chat title:", error);
      const fallback = (req.body?.userMessage || "Study Session").slice(0, 30);
      return res.json({ title: fallback });
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
      const parsed = extractAndParseJSON(raw, null);
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
      const planData = extractAndParseJSON(raw, {});

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

  // 3. AI Notes Generator (Created by Mishra Ji)
  app.post("/api/gemini/notes", async (req, res) => {
    try {
      const { topic, subject, academicLevel, formatStyle, keySubtopics, includeExamples = true, includeMnemonics = true, includeQuizCheck = true } = req.body;

      if (!topic) {
        return res.status(400).json({ error: "Topic is required." });
      }

      const prompt = `You are MISHRA JI — the student's personal AI tutor and master educator inside StudyPilot creating a structured, high-yield academic revision document.

Topic: "${topic}"
Subject: "${subject || "General Academic"}"
Target Academic Level: "${academicLevel || "College / Undergraduate"}"
Format Style: "${formatStyle || "Comprehensive Master Notes"}"
Key Subtopics / Focus: "${keySubtopics || "Comprehensive coverage of core concepts"}"

Structure this revision document cleanly using the following academic format (adapting appropriately to the subject):

# ${topic} — Complete Revision Notes

## 1. Overview
A concise, high-level overview explaining what this topic is, why it matters, and the primary intuition.

## 2. Key Concepts
Deep conceptual breakdown of core mechanisms, principles, and underlying logic. Use bold key terms and clear bullet points.

## 3. Core Definitions
Structured list of foundational definitions, terminology, and principles.

## 4. Formulas & Mathematical / Technical Specifications
Properly formatted mathematical notation using valid standard LaTeX equations:
- Display equations: wrap on separate lines using $$ ... $$ (e.g. $$MSE = \\frac{1}{n}\\sum_{i=1}^{n}(y_i-\\hat{y}_i)^2$$ or $$CaCO_3 \\xrightarrow{\\Delta} CaO + CO_2$$)
- Inline formulas: wrap using $ ... $ (e.g. $E = mc^2$, $H_2O$, $CO_2$, $A + B \\rightarrow AB$)
Include variable definitions, unit specifications, and intuitive interpretations.

## 5. Step-by-Step Explanation
Logical sequential breakdown of how to solve problems or execute the core process step-by-step.

${includeExamples ? `## 6. Practical Real-World Example
A concrete, end-to-end worked example or case study demonstrating the principles in action.` : ""}

${includeMnemonics ? `## 7. Common Mistakes & Pitfalls
Highlight frequent misunderstandings, edge cases, and mnemonic tips to avoid common exam traps.` : ""}

## 8. Quick Revision Cheat-Sheet
High-yield bulleted summary for rapid last-minute recall.

## 9. Key Takeaways
3-5 core takeaways that every student must remember.

${includeQuizCheck ? `## 10. Self-Check Concept Quiz
3 diagnostic questions with clear explanations to verify understanding.` : ""}

Use rich, clean Markdown with clear headings, tables, bullet points, callout indicators, and standard LaTeX math ($...$ and $$...$$). Avoid generic AI boilerplate.`;

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

  // 3.5 One-Minute Quiz Rapid Revision Generator (Created by Mishra Ji)
  app.post("/api/gemini/one-minute-revision", async (req, res) => {
    try {
      const {
        quizTitle,
        subject = "General Academic",
        topic = "General Concepts",
        difficulty = "Intermediate",
        questionsSummary,
        academicLevel = "High School / College",
        studentName = "Scholar",
      } = req.body;

      if (!topic && !subject) {
        return res.status(400).json({ error: "Topic and subject are required." });
      }

      const prompt = `You are MISHRA JI — the student's personal AI tutor and master academic coach inside StudyPilot.
The student "${studentName}" is about to take a timed quiz:
- Quiz: "${quizTitle || topic}"
- Subject: "${subject}"
- Topic: "${topic}"
- Difficulty: "${difficulty}"
- Academic Level: "${academicLevel}"
${questionsSummary ? `- Specific Questions/Concepts being tested: ${questionsSummary}` : ""}

The student clicked "⚡ ONE-MINUTE REVISION" because they want a high-yield, razor-sharp 1-minute cheat sheet right before the exam begins.
Create a structured, ultra-scannable, high-impact ONE-MINUTE REVISION note that takes approximately 60 seconds to read and master.

IMPORTANT FORMAT RULES:
1. Formulas & Chemical/Mathematical Representations:
   - Use standard LaTeX math rendering: display equations in $$ ... $$ and inline math in $ ... $.
   - For chemical reactions or algebraic formulas, format cleanly (e.g. $A + B \\rightarrow AB$, $AB \\rightarrow A + B$, $A + BC \\rightarrow AC + B$, $AB + CD \\rightarrow AD + CB$, $E = mc^2$, $F = ma$, $\\Delta G = \\Delta H - T\\Delta S$, etc.).
2. Mind Map:
   - Include a compact, crystal-clear visual ASCII or boxed diagram/flowchart connecting MAIN TOPIC -> CORE CONCEPTS -> RELATIONSHIPS -> KEY EXAMPLES.
   - Keep it compact and easily scannable in under 10 seconds.
3. Tone:
   - Authoritative, encouraging, razor-sharp master tutor.

Use the following exact structure:

# ⚡ ONE-MINUTE REVISION: ${topic}
**Subject:** ${subject} | **Level:** ${academicLevel} | **Difficulty:** ${difficulty}

## 1. CORE IDEA
1-2 extremely clear sentences defining the foundational mechanism or principle.

## 2. MUST-KNOW CONCEPTS
- **[Concept 1]**: High-yield explanation.
- **[Concept 2]**: High-yield explanation.
- **[Concept 3]**: High-yield explanation.

## 3. IMPORTANT FORMULAS & SCIENTIFIC REPRESENTATIONS
Display mathematical, physical, or chemical formulas with proper LaTeX ($...$ and $$...$$):
- Key formula/equation 1 with concise variable definitions.
- Key formula/equation 2 with concise variable definitions.

## 4. KEY EXAMPLES
- **Example 1**: Concrete, high-yield scenario showing how the rule is applied.
- **Example 2**: Contrast case or edge application.

## 5. COMMON TRAPS
- ⚠️ **Trap 1**: Frequent mistake students make (and the exact fix).
- ⚠️ **Trap 2**: Common distractor pattern in multiple-choice exams.

## 6. QUICK MEMORY HOOK
Short mnemonic or intuitive mental shortcut to lock this into memory instantly.

## 7. MINI MIND MAP
\`\`\`
                    [ ${topic.toUpperCase()} ]
                               │
         ┌─────────────────────┼─────────────────────┐
         ↓                     ↓                     ↓
    [Core Branch 1]       [Core Branch 2]       [Core Branch 3]
         │                     │                     │
      (Formula 1)           (Formula 2)           (Formula 3)
         ↓                     ↓                     ↓
     <Example 1>           <Example 2>           <Example 3>
\`\`\`

Provide clean, rich markdown formatted precisely as requested.`;

      const response = await executeGeminiWithFallback(
        (ai, model) =>
          ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              temperature: 0.4,
            },
          }),
        "One-Minute Revision Generator"
      );

      const content = response.text || `# ⚡ ONE-MINUTE REVISION: ${topic}\n\nReview the core principles of ${topic} before beginning the quiz.`;

      return res.json({
        title: `⚡ ONE-MINUTE REVISION: ${topic}`,
        topic,
        subject,
        content,
      });
    } catch (error: any) {
      console.error("Error in /api/gemini/one-minute-revision:", error);
      const statusCode = getValidHttpStatusCode(error);
      const friendlyMessage = formatErrorMessage(error);
      return res.status(statusCode).json({
        error: friendlyMessage,
      });
    }
  });

  // 4. AI Quiz Generator (Game-Show Style with Exactly 4 Options & Conceptual Explanations)
  app.post("/api/gemini/quiz", async (req, res) => {
    try {
      const { subject, topic, questionCount = 5, difficulty = "Intermediate", academicLevel = "High School / College", customInstructions } = req.body;

      if (!topic && !subject) {
        return res.status(400).json({ error: "Subject or topic is required." });
      }

      const count = Math.min(Math.max(Number(questionCount) || 5, 3), 15);

      const prompt = `You are StudyPilot's Game-Show Master and Academic Quiz Engine.
Generate an interactive, high-stakes academic quiz with EXACTLY ${count} multiple-choice questions.

Subject: "${subject || "General"}"
Topic: "${topic || "General Concepts"}"
Difficulty Level: "${difficulty}" (Questions 1-${Math.ceil(count * 0.3)}: Accessible/Diagnostic, Questions ${Math.ceil(count * 0.3) + 1}-${Math.ceil(count * 0.7)}: Core/Application, Questions ${Math.ceil(count * 0.7) + 1}-${count}: Challenging/Deep Nuance)
Academic Level: "${academicLevel}"
${customInstructions ? `Special Instructions: ${customInstructions}` : ""}

STRICT QUIZ RULES:
1. EVERY question MUST have EXACTLY 4 options (no fewer, no more).
2. Options must NOT start with "A)", "B)", "A.", "1.", etc. Provide pure, clear option text.
3. Exactly ONE correct option index (0, 1, 2, or 3).
4. Include a concise, high-yield concept explanation ("Why?") explaining the underlying mechanism and why distractors fail.
5. Include a subtle thinking hint without giving away the answer.
6. FORMULAS & SCIENTIFIC NOTATION: Format all math, physics equations, and chemical reactions/formulas with valid standard LaTeX wrapped in $ ... $ for inline (e.g. $E=mc^2$, $H_2O$, $A+B\\rightarrow AB$) or $$ ... $$ for standalone expressions.

Return a strictly valid JSON object ONLY. No markdown wrapper or backticks if possible, or inside \`\`\`json\`\`\`.

Required JSON format:
{
  "title": "${topic || subject} Challenge",
  "subject": "${subject || "General"}",
  "topic": "${topic || "General"}",
  "difficulty": "${difficulty}",
  "totalQuestions": ${count},
  "questions": [
    {
      "id": 1,
      "question": "Clear, engaging, precise question text?",
      "options": [
        "First plausible option text",
        "Second plausible option text",
        "Third plausible option text",
        "Fourth plausible option text"
      ],
      "correctOptionIndex": 0,
      "explanation": "Thorough, clear explanation of why this answer is correct and why the other 3 alternatives are incorrect.",
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
              temperature: 0.5,
              responseMimeType: "application/json",
            },
          }),
        "Quiz Generator"
      );

      const raw = response.text || "{}";
      let quizData = extractAndParseJSON(raw, null);

      // Post-process and guarantee exactly 4 options per question
      if (quizData && Array.isArray(quizData.questions) && quizData.questions.length > 0) {
        quizData.questions = quizData.questions.slice(0, count).map((q: any, idx: number) => {
          let options = Array.isArray(q.options) ? q.options.map((opt: string) => String(opt).replace(/^[A-D\d][\)\.\:\-]\s*/i, "").trim()) : [];
          // Ensure exactly 4 options
          while (options.length < 4) {
            options.push(`Alternative Option ${options.length + 1}`);
          }
          if (options.length > 4) {
            options = options.slice(0, 4);
          }
          let correctIdx = Number(q.correctOptionIndex);
          if (isNaN(correctIdx) || correctIdx < 0 || correctIdx > 3) {
            correctIdx = 0;
          }
          return {
            id: idx + 1,
            question: q.question || `Question ${idx + 1}`,
            options,
            correctOptionIndex: correctIdx,
            explanation: q.explanation || "Detailed concept explanation.",
            hint: q.hint || undefined,
          };
        });
        quizData.totalQuestions = quizData.questions.length;
      } else {
        // Safe structured fallback
        quizData = {
          title: `${topic || subject} Challenge`,
          subject: subject || "General",
          topic: topic || "Core Concepts",
          difficulty,
          totalQuestions: count,
          questions: Array.from({ length: count }, (_, i) => ({
            id: i + 1,
            question: `In ${topic || subject}, which concept is essential for mastering key principle #${i + 1}?`,
            options: [
              "Optimizing primary systemic convergence and consistency",
              "Uncontrolled parameter perturbation without validation",
              "Indiscriminate reduction of constraint criteria",
              "Static non-generalizable sample bias"
            ],
            correctOptionIndex: 0,
            explanation: `Understanding key operational principles and convergence bounds is central to ${topic || subject}.`,
            hint: "Focus on primary mechanisms and optimal system behaviors."
          }))
        };
      }

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

  // 5. Intelligent Revision Cards Generator
  app.post("/api/gemini/generate-revision-cards", async (req, res) => {
    try {
      const {
        topic,
        subject = "General",
        contextText,
        sourceName,
        sourceType = "custom",
        customInstructions = "",
        existingQuestions = [],
        count = 5,
      } = req.body;

      if (!topic && !contextText) {
        return res.status(400).json({ error: "Please provide a topic or study context for revision card generation." });
      }

      const numCards = Math.min(Math.max(1, count), 10);

      const prompt = `You are StudyPilot's Academic Retrieval & Spaced Repetition Card Generator.
Your mission is to generate ${numCards} concise, atomic, highly focused active-recall revision cards for a student.

Subject: ${subject}
Topic: ${topic || "Core Concepts from Study Material"}
${sourceName ? `Source Document / Context Name: ${sourceName}` : ""}
${contextText ? `\n--- Provided Study Context / Document Notes ---\n${contextText.slice(0, 8000)}\n--- End Context ---\n` : ""}

${
  existingQuestions.length > 0
    ? `\nCRITICAL DUPLICATE PREVENTION:
The following questions already exist for this student. You MUST NOT generate duplicate or nearly identical questions. Explore different conceptual angles (mechanism, edge case, distinction, practical calculation/application, common misconception):
${existingQuestions.slice(0, 15).map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")}\n`
    : ""
}

${
  customInstructions
    ? `\nSTUDENT'S CUSTOM INSTRUCTIONS (MANDATORY TO FOLLOW):
"${customInstructions}"\n`
    : ""
}

CARD DESIGN & QUALITY GUIDELINES:
1. Atomic Focus: Each card MUST focus on exactly ONE clear, meaningful concept. Never dump massive paragraphs onto a card.
2. Front Question: Crisp, direct retrieval prompt that stimulates active memory recall (e.g., "What is the primary function of...", "How does X differ from Y during...", "Why does Z occur when...").
3. Back Answer: Direct, accurate, concise answer (1-3 clear sentences).
4. Short Explanation: 1-2 sentence conceptual clarity or intuition.
5. Example (Optional but encouraged): A short, concrete real-world or academic example.
6. Key Takeaway: A one-liner memory anchor.
7. Formulas & Chemistry: Format all equations, chemical reactions, and scientific terms in valid LaTeX using $ ... $ for inline (e.g. $E=mc^2$, $H_2O$, $CaCO_3 \\xrightarrow{\\Delta} CaO + CO_2$) or $$ ... $$ for standalone expressions.

Return ONLY a valid JSON object matching this schema:
{
  "cards": [
    {
      "question": "Crisp retrieval question?",
      "answer": "Direct, precise answer.",
      "explanation": "Clear conceptual intuition or explanation.",
      "example": "Concrete example or illustration.",
      "keyTakeaway": "Short summary memory anchor.",
      "difficultyLevel": "Beginner | Intermediate | Advanced"
    }
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
        "Revision Cards Generator"
      );

      const raw = response.text || "{}";
      const parsed = extractAndParseJSON(raw, { cards: [] });

      return res.json({ cards: parsed.cards || [] });
    } catch (error: any) {
      console.error("Error in /api/gemini/generate-revision-cards:", error);
      const statusCode = getValidHttpStatusCode(error);
      const friendlyMessage = formatErrorMessage(error);
      return res.status(statusCode).json({
        error: friendlyMessage,
      });
    }
  });

  // 6. Regenerate a Single Revision Card with Student Customization
  app.post("/api/gemini/regenerate-revision-card", async (req, res) => {
    try {
      const {
        card,
        customInstructions = "",
        existingQuestions = [],
      } = req.body;

      if (!card || !card.topic) {
        return res.status(400).json({ error: "Missing card data for regeneration." });
      }

      const prompt = `You are StudyPilot's Academic Retrieval Card Generator.
A student wants to REGENERATE this revision card with a fresh, meaningfully different or improved question and answer.

Previous Card:
- Subject: ${card.subject}
- Topic: ${card.topic}
- Previous Question: ${card.question}
- Previous Answer: ${card.answer}

${
  customInstructions
    ? `\nSTUDENT'S REGENERATION INSTRUCTION (MANDATORY TO FOLLOW):
"${customInstructions}"\n`
    : ""
}

${
  existingQuestions.length > 0
    ? `\nAvoid duplicating these other existing questions:\n${existingQuestions.slice(0, 10).map((q: string, i: number) => `- ${q}`).join("\n")}\n`
    : ""
}

Return ONLY a valid JSON object matching this schema (format all math/chemical formulas in valid LaTeX with $...$ or $$...$$):
{
  "card": {
    "question": "New, improved, distinct question?",
    "answer": "Direct, precise answer.",
    "explanation": "Clear conceptual explanation.",
    "example": "Concrete example.",
    "keyTakeaway": "Short memory anchor.",
    "difficultyLevel": "Beginner | Intermediate | Advanced"
  }
}`;

      const response = await executeGeminiWithFallback(
        (ai, model) =>
          ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              temperature: 0.7,
              responseMimeType: "application/json",
            },
          }),
        "Regenerate Revision Card"
      );

      const raw = response.text || "{}";
      const parsed = extractAndParseJSON(raw, {});

      return res.json({ card: parsed.card });
    } catch (error: any) {
      console.error("Error in /api/gemini/regenerate-revision-card:", error);
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
