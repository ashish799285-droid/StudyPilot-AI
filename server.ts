import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set in environment variables. Gemini calls will fail unless configured.");
    }
    aiClient = new GoogleGenAI({ apiKey: apiKey || "" });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
    });
  });

  // 1. AI Study Chat (Conversational Tutor)
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { messages, academicLevel = "High School / College", subject = "General", tutorTone = "Encouraging & Socratic" } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages array is required." });
      }

      const ai = getGenAI();
      const systemInstruction = `You are StudyPilot AI, an elite, patient, and engaging personal academic tutor and study companion.
The student is at the academic level: "${academicLevel}".
The current subject context is: "${subject}".
Tutor style/tone: "${tutorTone}".

Your goals:
1. Explain concepts with crystal clarity, using relatable examples, step-by-step logic, and intuitive analogies.
2. Adapt vocabulary and depth to the student's level.
3. If they ask a complex homework question or math problem, provide guided steps, highlight key formulas, and invite them to think through the final steps rather than just giving a dead answer.
4. Format your responses using clean Markdown with bold keywords, bullet points, numbered steps, code blocks (if relevant), and clear math notations.
5. If helpful, provide a quick 1-question "Check for Understanding" at the end of key concept explanations.`;

      // Convert conversation history to Gemini contents format
      const contents = messages.map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const responseText = response.text || "I couldn't generate a response. Please try rephrasing your question.";
      return res.json({ reply: responseText });
    } catch (error: any) {
      console.error("Error in /api/gemini/chat:", error);
      return res.status(500).json({
        error: error.message || "Failed to communicate with AI Tutor.",
      });
    }
  });

  // 2. AI Study Plan Generator
  app.post("/api/gemini/study-plan", async (req, res) => {
    try {
      const { subjects, hoursPerDay, targetExamDate, examName, difficultyLevel, studyPace, targetScore, additionalNotes } = req.body;

      if (!subjects || subjects.length === 0) {
        return res.status(400).json({ error: "At least one subject is required." });
      }

      const ai = getGenAI();
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

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          temperature: 0.5,
          responseMimeType: "application/json",
        },
      });

      const raw = response.text || "{}";
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      const planData = JSON.parse(cleaned);

      return res.json({ plan: planData });
    } catch (error: any) {
      console.error("Error in /api/gemini/study-plan:", error);
      return res.status(500).json({
        error: error.message || "Failed to generate study plan.",
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

      const ai = getGenAI();
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

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          temperature: 0.6,
        },
      });

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
      return res.status(500).json({
        error: error.message || "Failed to generate study notes.",
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
      const ai = getGenAI();

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

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          temperature: 0.6,
          responseMimeType: "application/json",
        },
      });

      const raw = response.text || "{}";
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      const quizData = JSON.parse(cleaned);

      return res.json({ quiz: quizData });
    } catch (error: any) {
      console.error("Error in /api/gemini/quiz:", error);
      return res.status(500).json({
        error: error.message || "Failed to generate quiz.",
      });
    }
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
