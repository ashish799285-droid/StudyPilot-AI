import { FocusRecommendation, StudySessionRecord } from "../types";

export interface RecommendationParams {
  subject?: string;
  topic?: string;
  taskType?: string;
  taskDurationMinutes?: number;
  priority?: "High" | "Medium" | "Low";
  academicLevel?: string;
  pastSessions?: StudySessionRecord[];
}

export const BREAK_MICRO_TIPS = [
  {
    id: "tip-1",
    category: "Active Recall",
    icon: "🧠",
    title: "Mental Concept Replay",
    text: "Close your eyes for 30 seconds and mentally summarize the core idea or formula you just studied. Fast retrieval locks information into long-term memory.",
  },
  {
    id: "tip-2",
    category: "Physical Recovery",
    icon: "💧",
    title: "Hydration & Oxygen",
    text: "Drink a tall glass of water and stretch your neck and shoulders. Proper hydration keeps neural transmission and processing speed sharp.",
  },
  {
    id: "tip-3",
    category: "Eye Health",
    icon: "👁️",
    title: "The 20-20-20 Rule",
    text: "Look at an object at least 20 feet away for 20 seconds. This relaxes your ciliary eye muscles after prolonged screen reading.",
  },
  {
    id: "tip-4",
    category: "Cognitive Rest",
    icon: "📵",
    title: "Protect Working Memory",
    text: "Avoid switching immediately to fast social feeds or short-form videos. Giving your brain true low-stimulus downtime allows your hippocampus to consolidate notes.",
  },
  {
    id: "tip-5",
    category: "Kinesthetic Energy",
    icon: "🚶",
    title: "Gentle Movement",
    text: "Stand up and walk around your room for 2 minutes. Light movement boosts cerebral blood flow and resets cognitive endurance.",
  },
  {
    id: "tip-6",
    category: "Stress Relief",
    icon: "🫁",
    title: "Physiological Sigh",
    text: "Take two deep nasal inhales followed by one long, slow exhale through your mouth. Doing this twice immediately lowers autonomic nervous system stress.",
  },
  {
    id: "tip-7",
    category: "Mental Clarity",
    icon: "📝",
    title: "Brain Scratchpad",
    text: "If a stray thought or unrelated errand came to mind during your session, jot it down on paper so your mind doesn't keep looping on it.",
  },
  {
    id: "tip-8",
    category: "Task Priming",
    icon: "🎯",
    title: "Prime the Next Goal",
    text: "Think of the very first step you'll take when the next focus block begins. Having a clear entry point eliminates startup friction.",
  },
];

export function getRandomMicroTip(excludeId?: string) {
  const available = excludeId
    ? BREAK_MICRO_TIPS.filter((t) => t.id !== excludeId)
    : BREAK_MICRO_TIPS;
  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex] || BREAK_MICRO_TIPS[0];
}

/**
 * Calculates a pedagogical, AI-informed focus session length and explanation
 */
export function calculateFocusRecommendation(params: RecommendationParams): FocusRecommendation {
  const {
    subject = "",
    topic = "",
    taskType = "",
    taskDurationMinutes,
    priority = "Medium",
    academicLevel = "Undergraduate",
    pastSessions = [],
  } = params;

  const textToAnalyze = `${subject} ${topic} ${taskType}`.toLowerCase();

  // Keyword categories
  const isDeepProblemSolving =
    /calculus|differential|integral|algorithm|tree|graph|proof|derivation|physics|quantum|mechanics|circuit|organic chemistry|synthesis|reaction|database|normalization|coding|compiler|recursion|dynamic programming/i.test(
      textToAnalyze
    );

  const isMemorizationReview =
    /flashcard|vocab|terminology|mnemonic|glossary|dates|anatomy|definition|quick review/i.test(
      textToAnalyze
    );

  const isReadingOrNotes =
    /reading|chapter|notes|summary|literature|history|overview|concept learning|lecture/i.test(
      textToAnalyze
    );

  const isExamSim =
    /exam|mock|past paper|simulation|timed test|diagnostic/i.test(textToAnalyze);

  // Behavioral history check
  const recentCompleted = pastSessions.slice(0, 8);
  const avgCompletedMinutes =
    recentCompleted.length > 0
      ? recentCompleted.reduce((acc, s) => acc + (s.actualDurationMinutes || 0), 0) /
        recentCompleted.length
      : 0;

  const hasHighInterruptionRate =
    recentCompleted.length >= 3 &&
    recentCompleted.filter((s) => s.status === "Interrupted" || s.status === "Cancelled").length >= 2;

  // Decision logic
  let duration = 40;
  let reason = "A balanced focus duration providing sufficient depth without cognitive fatigue.";
  let suggestedTechnique = "Structured Focus Block";

  if (taskDurationMinutes && taskDurationMinutes >= 20 && taskDurationMinutes <= 65) {
    // If study plan task already has a planned duration, align closely
    if (taskDurationMinutes <= 25) duration = 25;
    else if (taskDurationMinutes <= 35) duration = 30;
    else if (taskDurationMinutes <= 45) duration = 45;
    else if (taskDurationMinutes <= 55) duration = 50;
    else duration = 60;

    reason = `Aligned with your planned study task (${taskDurationMinutes}m) to maintain steady syllabus progression.`;
    suggestedTechnique = "Task-Aligned Sprint";
  } else if (isExamSim) {
    duration = 50;
    reason = "Simulates realistic exam endurance and sustained problem-solving concentration.";
    suggestedTechnique = "Exam Simulation & Timed Drill";
  } else if (isMemorizationReview) {
    duration = 25;
    reason = "Review and retrieval tasks work best in high-intensity, shorter sprints to prevent cognitive drift.";
    suggestedTechnique = "Active Recall & Spaced Repetition";
  } else if (isDeepProblemSolving) {
    if (academicLevel.toLowerCase().includes("beginner") || hasHighInterruptionRate) {
      duration = 40;
      reason = "This topic requires reasoning through multi-step problems; 40 minutes gives you focus time while preventing burnout.";
      suggestedTechnique = "Step-by-Step Problem Solving";
    } else {
      duration = priority === "High" ? 50 : 45;
      reason = "Multi-step reasoning and analytical proofs require sustained immersion to reach peak flow.";
      suggestedTechnique = "Deep Work Immersion";
    }
  } else if (isReadingOrNotes) {
    duration = 30;
    reason = "Focused conceptual reading paired with active note synthesis fits ideally into 30-minute intervals.";
    suggestedTechnique = "Feynman Note Synthesis";
  } else if (academicLevel.toLowerCase().includes("graduate") || academicLevel.toLowerCase().includes("pre-med")) {
    duration = 45;
    reason = "Advanced curriculum requires thorough conceptual synthesis and rigorous practice.";
    suggestedTechnique = "Advanced Concept Mapping";
  } else {
    duration = 35;
    reason = "Standard high-yield focus interval optimized for comprehension and concept retention.";
    suggestedTechnique = "Pomodoro Mastery";
  }

  // Adjust if user repeatedly interrupted long sessions
  if (hasHighInterruptionRate && duration > 35) {
    duration = 30;
    reason = "Based on your recent study rhythm, a crisp 30-minute session will help build steady momentum.";
  }

  // Calculate sensible break length
  let breakMinutes = 5;
  if (duration >= 50) {
    breakMinutes = 10;
  } else if (duration >= 40) {
    breakMinutes = 8;
  } else {
    breakMinutes = 5;
  }

  return {
    durationMinutes: duration,
    breakMinutes,
    reason,
    suggestedTechnique,
  };
}

/**
 * High quality, subtle Web Audio API chime (zero external dependencies)
 */
export function playChime(type: "start" | "complete" | "break") {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === "complete") {
      // Pleasant harmonic chime: C5 -> E5 -> G5
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.85);
      });
    } else if (type === "break") {
      // Soft gentle two-tone chime: G4 -> C5
      const notes = [392.0, 523.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);

        gain.gain.setValueAtTime(0, now + idx * 0.15);
        gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.15 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.7);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.75);
      });
    } else {
      // Subtle start blip: C5
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch (e) {
    // Audio context may be restricted by browser until user gesture
    console.warn("Audio chime prevented or unsupported:", e);
  }
}

/**
 * Formats seconds into MM:SS or HH:MM:SS
 */
export function formatSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export function formatMinutesHuman(totalMinutes: number): string {
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;
  if (remainingMins === 0) {
    return `${hours} hr${hours > 1 ? "s" : ""}`;
  }
  return `${hours}h ${remainingMins}m`;
}
