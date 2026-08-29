import { RevisionCard, RecallRating, RevisionDailyQueue, RevisionStatus } from "../types";

/**
 * Calculates days difference between today and a given date string (YYYY-MM-DD)
 */
export function getDaysDifference(targetDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(targetDateStr);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Formats a timestamp or date string to YYYY-MM-DD in local time
 */
export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculates priority score for queue ordering
 */
export function calculateCardPriorityScore(
  card: RevisionCard,
  daysToExam?: number | null
): number {
  const todayStr = toLocalDateString();
  const daysOverdue = Math.max(0, -getDaysDifference(card.nextReviewDate));

  let score = 0;

  // 1. Urgency / Overdue Weight
  score += daysOverdue * 18;

  // 2. Memory Weakness
  if (card.status === "Needs Review") {
    score += 45;
  } else if (card.status === "Developing") {
    score += 20;
  }

  score += card.consecutiveIncorrect * 25;

  if (card.totalReviews > 0) {
    const failureRate = card.incorrectRecalls / card.totalReviews;
    score += Math.round(failureRate * 35);
  } else {
    // Brand new cards get a baseline discovery priority
    score += 25;
  }

  // 3. Exam Proximity Relevance
  if (typeof daysToExam === "number" && daysToExam >= 0) {
    if (daysToExam === 0) {
      // Exam day: lightweight recall, moderate boost for high-yield
      score += 30;
    } else if (daysToExam <= 2) {
      // 1-2 days away: high priority for weak/high-yield cards
      score += card.status === "Needs Review" ? 75 : 45;
    } else if (daysToExam <= 6) {
      // 3-6 days away: prioritize core concepts
      score += card.status === "Needs Review" ? 40 : 25;
    } else {
      // 7+ days away: standard priority
      score += 10;
    }
  }

  return score;
}

/**
 * Computes updated spaced repetition metrics after a student attempts recall
 */
export function calculateNextReview(
  card: RevisionCard,
  rating: RecallRating,
  examDate?: string
): {
  repetitionIntervalDays: number;
  easeFactor: number;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  status: RevisionStatus;
  isMastered: boolean;
  nextReviewDate: string;
  nextReviewTimestamp: number;
  priorityScore: number;
  feedbackMessage: string;
} {
  const currentEase = card.easeFactor || 2.5;
  const currentInterval = card.repetitionIntervalDays || 1;

  let newEase = currentEase;
  let newConsecutiveCorrect = card.consecutiveCorrect || 0;
  let newConsecutiveIncorrect = card.consecutiveIncorrect || 0;
  let newInterval = 1;
  let newStatus: RevisionStatus = "Developing";
  let isMastered = false;
  let feedbackMessage = "";

  switch (rating) {
    case "forgot": {
      // 😣 Concept needs immediate near-term reinforcement
      newConsecutiveCorrect = 0;
      newConsecutiveIncorrect = (card.consecutiveIncorrect || 0) + 1;
      newEase = Math.max(1.3, currentEase - 0.2);
      newInterval = 1; // Return in 1 day or near-term queue
      newStatus = "Needs Review";
      isMastered = false;
      feedbackMessage = "🔁 Added to your near-term revision queue for reinforcement.";
      break;
    }

    case "difficult": {
      // 🤔 Recalled with struggle - moderate interval increase
      newConsecutiveCorrect = (card.consecutiveCorrect || 0) + 1;
      newConsecutiveIncorrect = 0;
      newEase = Math.max(1.3, currentEase - 0.12);
      newInterval = Math.max(1, Math.round(currentInterval * 1.25));
      if (newInterval > 3) newInterval = 3;
      newStatus = "Developing";
      isMastered = false;
      feedbackMessage = `📈 Developing recall — next spaced review in ${newInterval} ${newInterval === 1 ? "day" : "days"}.`;
      break;
    }

    case "good": {
      // 🙂 Solid recall
      newConsecutiveCorrect = (card.consecutiveCorrect || 0) + 1;
      newConsecutiveIncorrect = 0;
      // Interval progression based on spaced repetition principle
      if (currentInterval <= 1) {
        newInterval = 3;
      } else if (currentInterval === 2 || currentInterval === 3) {
        newInterval = 6;
      } else {
        newInterval = Math.round(currentInterval * newEase);
      }

      newStatus = newConsecutiveCorrect >= 3 ? "Strong" : "Developing";
      isMastered = newConsecutiveCorrect >= 5;
      feedbackMessage = `✨ Solid retrieval! Spaced interval extended to ${newInterval} days.`;
      break;
    }

    case "easy": {
      // 🧠 Effortless recall
      newConsecutiveCorrect = (card.consecutiveCorrect || 0) + 1;
      newConsecutiveIncorrect = 0;
      newEase = Math.min(3.0, currentEase + 0.15);

      if (currentInterval <= 1) {
        newInterval = 4;
      } else if (currentInterval <= 3) {
        newInterval = 8;
      } else {
        newInterval = Math.round(currentInterval * newEase * 1.3);
      }

      newStatus = "Strong";
      if (newConsecutiveCorrect >= 4) {
        isMastered = true;
        newStatus = "Mastered";
      }
      feedbackMessage = `🏆 High memory retention! Next review spaced out by ${newInterval} days.`;
      break;
    }
  }

  // Adjust if exam is closely approaching
  if (examDate) {
    const daysToExam = getDaysDifference(examDate);
    if (daysToExam > 0 && daysToExam <= 7 && newInterval > daysToExam) {
      // Pull back interval so it is revised right before the exam
      newInterval = Math.max(1, daysToExam - 1);
    }
  }

  const nextReviewDateObj = new Date();
  nextReviewDateObj.setDate(nextReviewDateObj.getDate() + newInterval);
  const nextReviewDate = toLocalDateString(nextReviewDateObj);
  const nextReviewTimestamp = nextReviewDateObj.getTime();

  // Create temporary card clone to calculate new priority score
  const updatedCardMock: RevisionCard = {
    ...card,
    status: newStatus,
    easeFactor: newEase,
    repetitionIntervalDays: newInterval,
    consecutiveCorrect: newConsecutiveCorrect,
    consecutiveIncorrect: newConsecutiveIncorrect,
    nextReviewDate,
    nextReviewTimestamp,
  };

  const priorityScore = calculateCardPriorityScore(
    updatedCardMock,
    examDate ? getDaysDifference(examDate) : null
  );

  return {
    repetitionIntervalDays: newInterval,
    easeFactor: Number(newEase.toFixed(2)),
    consecutiveCorrect: newConsecutiveCorrect,
    consecutiveIncorrect: newConsecutiveIncorrect,
    status: newStatus,
    isMastered,
    nextReviewDate,
    nextReviewTimestamp,
    priorityScore,
    feedbackMessage,
  };
}

/**
 * Builds the Daily Revision Queue with priority categories
 */
export function buildDailyRevisionQueue(
  cards: RevisionCard[],
  activeExamDate?: string,
  dailyLimit: number = 25
): RevisionDailyQueue {
  const todayStr = toLocalDateString();
  const visibleCards = cards.filter((c) => !c.isHidden);

  const daysToExam = activeExamDate ? getDaysDifference(activeExamDate) : null;

  // Filter cards due on or before today, or newly created with no reviews
  const dueCards = visibleCards.filter((card) => {
    return card.nextReviewDate <= todayStr || card.totalReviews === 0;
  });

  // Calculate and assign priority scores
  const scoredCards = dueCards.map((card) => ({
    card,
    score: calculateCardPriorityScore(card, daysToExam),
  }));

  // Sort by highest priority first
  scoredCards.sort((a, b) => b.score - a.score);

  // Categorize
  const priorityCards: RevisionCard[] = [];
  const reinforceCards: RevisionCard[] = [];
  const maintainCards: RevisionCard[] = [];

  for (const item of scoredCards) {
    const c = item.card;
    if (c.status === "Needs Review" || c.consecutiveIncorrect > 0) {
      priorityCards.push(c);
    } else if (c.status === "Developing" || c.totalReviews === 0) {
      reinforceCards.push(c);
    } else {
      maintainCards.push(c);
    }
  }

  let examApproachingMessage: string | undefined;
  if (typeof daysToExam === "number" && daysToExam >= 0) {
    if (daysToExam === 0) {
      examApproachingMessage = "📅 Exam Day: Quick high-yield recall review prioritized.";
    } else if (daysToExam === 1) {
      examApproachingMessage = "📅 Exam Tomorrow: Weak and high-yield concepts prioritized for peak retention.";
    } else if (daysToExam <= 3) {
      examApproachingMessage = `📅 Exam in ${daysToExam} days: High-value revision prioritized.`;
    } else if (daysToExam <= 7) {
      examApproachingMessage = `📅 Exam in ${daysToExam} days: Targeted revision active.`;
    }
  }

  const overdueCount = dueCards.filter((c) => c.nextReviewDate < todayStr).length;

  return {
    priorityCards: dailyLimit > 0 ? priorityCards.slice(0, dailyLimit) : priorityCards,
    reinforceCards: dailyLimit > 0 ? reinforceCards.slice(0, dailyLimit) : reinforceCards,
    maintainCards: dailyLimit > 0 ? maintainCards.slice(0, dailyLimit) : maintainCards,
    totalDueCount: dueCards.length,
    overdueCount,
    examApproachingMessage,
  };
}

/**
 * Returns upcoming revision schedule forecast (Tomorrow, 2-3 days, 4-7 days)
 */
export function getUpcomingForecast(cards: RevisionCard[]): {
  tomorrowCount: number;
  in3DaysCount: number;
  in7DaysCount: number;
  futureMasteredCount: number;
} {
  const visible = cards.filter((c) => !c.isHidden);
  let tomorrowCount = 0;
  let in3DaysCount = 0;
  let in7DaysCount = 0;
  let futureMasteredCount = 0;

  for (const card of visible) {
    const diff = getDaysDifference(card.nextReviewDate);
    if (diff === 1) tomorrowCount++;
    else if (diff >= 2 && diff <= 3) in3DaysCount++;
    else if (diff >= 4 && diff <= 7) in7DaysCount++;
    else if (diff > 7 && card.isMastered) futureMasteredCount++;
  }

  return {
    tomorrowCount,
    in3DaysCount,
    in7DaysCount,
    futureMasteredCount,
  };
}

/**
 * Analyzes topic retention health across all cards
 */
export function getRetentionInsights(cards: RevisionCard[]): {
  weakTopics: { topic: string; subject: string; count: number; failureRate: number }[];
  developingTopics: { topic: string; subject: string; count: number }[];
  strongTopics: { topic: string; subject: string; count: number }[];
  retentionRatePercent: number;
  suggestion: string;
} {
  if (cards.length === 0) {
    return {
      weakTopics: [],
      developingTopics: [],
      strongTopics: [],
      retentionRatePercent: 0,
      suggestion: "Create your first revision cards to begin tracking memory retention curves.",
    };
  }

  const topicMap = new Map<
    string,
    { subject: string; topic: string; total: number; correct: number; incorrect: number; needsReview: number }
  >();

  let totalRecalls = 0;
  let totalSuccessful = 0;

  for (const card of cards) {
    const key = `${card.subject}:::${card.topic}`;
    const existing = topicMap.get(key) || {
      subject: card.subject,
      topic: card.topic,
      total: 0,
      correct: 0,
      incorrect: 0,
      needsReview: 0,
    };

    existing.total += 1;
    existing.correct += card.successfulRecalls || 0;
    existing.incorrect += card.incorrectRecalls || 0;
    if (card.status === "Needs Review") {
      existing.needsReview += 1;
    }

    totalRecalls += (card.successfulRecalls || 0) + (card.incorrectRecalls || 0);
    totalSuccessful += card.successfulRecalls || 0;

    topicMap.set(key, existing);
  }

  const weakTopics: { topic: string; subject: string; count: number; failureRate: number }[] = [];
  const developingTopics: { topic: string; subject: string; count: number }[] = [];
  const strongTopics: { topic: string; subject: string; count: number }[] = [];

  topicMap.forEach((val) => {
    const totalAttempts = val.correct + val.incorrect;
    const failureRate = totalAttempts > 0 ? Math.round((val.incorrect / totalAttempts) * 100) : 0;

    if (val.needsReview > 0 || failureRate >= 40) {
      weakTopics.push({
        topic: val.topic,
        subject: val.subject,
        count: val.needsReview || val.total,
        failureRate,
      });
    } else if (failureRate >= 20 || totalAttempts < 3) {
      developingTopics.push({
        topic: val.topic,
        subject: val.subject,
        count: val.total,
      });
    } else {
      strongTopics.push({
        topic: val.topic,
        subject: val.subject,
        count: val.total,
      });
    }
  });

  const retentionRatePercent =
    totalRecalls > 0 ? Math.round((totalSuccessful / totalRecalls) * 100) : 100;

  let suggestion = "Consistent retrieval practice strengthens long-term memory retention.";
  if (weakTopics.length > 0) {
    suggestion = `Prioritize revising **${weakTopics[0].topic}** in your next session to reinforce high-friction concepts before they decay.`;
  } else if (developingTopics.length > 0) {
    suggestion = `Solid foundation! Reviewing **${developingTopics[0].topic}** will shift developing recall into durable long-term storage.`;
  } else if (strongTopics.length > 0) {
    suggestion = `Excellent recall! Your concepts in **${strongTopics[0].topic}** are well consolidated.`;
  }

  return {
    weakTopics: weakTopics.slice(0, 5),
    developingTopics: developingTopics.slice(0, 5),
    strongTopics: strongTopics.slice(0, 5),
    retentionRatePercent,
    suggestion,
  };
}

/**
 * Evidence-based smart micro-tips
 */
export const EVIDENCE_BASED_MICRO_TIPS = [
  {
    title: "Active Retrieval Practice",
    tip: "Formulate your answer mentally or speak it aloud before flipping. The cognitive effort of retrieval builds much stronger neural pathways than passive recognition.",
  },
  {
    title: "Spaced Spacing Effect",
    tip: "Allowing a slight delay between reviews forces your brain to reconstruct the memory, multiplying durability over time.",
  },
  {
    title: "Desirable Difficulty",
    tip: "If a card felt challenging to recall, that is a positive signal. Moderate struggle is where durable learning occurs.",
  },
  {
    title: "Self-Explanation",
    tip: "Try explaining why the answer makes sense in your own words. Connecting new ideas to existing concepts cements long-term memory.",
  },
  {
    title: "Interleaving Concepts",
    tip: "Mixing related concepts during revision improves your brain's ability to discriminate between problem types during exams.",
  },
];
