/**
 * StudyPilot — Dynamic Score-Aware Mishra Ji Reaction & Headline System
 * 
 * Generates personalized, varied, honest, empathetic, and constructive headlines,
 * supporting messages, and reactions from Mishra Ji (the student's personal AI tutor & academic mentor)
 * based on actual score, context, previous attempts, and assessment difficulty.
 * 
 * Strict Rule: Never misrepresent performance or use false praise on low scores.
 */

export type AssessmentType =
  | "quiz"
  | "test"
  | "challenge"
  | "practice"
  | "mock_exam"
  | "revision"
  | "flashcards";

export type EmotionalTone =
  | "urgent_improvement"   // 0–39%
  | "major_improvement"    // 40–49%
  | "improvement_needed"   // 50–59%
  | "decent_progress"      // 60–69%
  | "strong_performance"   // 70–79%
  | "excellent"            // 80–89%
  | "elite"                // 90–99%
  | "perfect";             // 100%

export interface MishraJiScoreReaction {
  reaction: string;
  headline: string;
  supportingMessage: string;
  emotionalTone: EmotionalTone;
  scoreRangeLabel: string;
  statusBadgeLabel: string;
  badgeEmoji: string;
  quote?: string;
  actionSuggestion?: string;
  contextNote?: string;
  styling: {
    badgeBg: string;
    badgeText: string;
    border: string;
    cardBg: string;
    accentText: string;
    avatarRing: string;
  };
}

export interface ScoreReactionOptions {
  score: number; // 0 to 100 actual percentage
  userFirstName?: string;
  previousScore?: number | null;
  previousAttemptsCount?: number;
  recentScoresOnTopic?: number[];
  assessmentType?: AssessmentType;
  difficulty?: string;
  topic?: string;
  subject?: string;
  isFirstAttempt?: boolean;
}

// Helper to pick a random item from an array
function getRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// -------------------------------------------------------------
// 1. HEADLINES POOLS PER SCORE TIER
// -------------------------------------------------------------

const HEADLINES_0_39 = [
  "WE'VE GOT WORK TO DO, {NAME}",
  "TIME TO LEVEL UP, {NAME}",
  "NOT YOUR BEST ROUND — YET, {NAME}",
  "THE FUNDAMENTALS NEED ATTENTION, {NAME}",
  "OKAY BRO, LET'S REBUILD THIS",
  "MISSION: LEVEL UP, {NAME}",
  "THIS ONE NEEDS A COMEBACK, {NAME}",
];

const HEADLINES_40_49 = [
  "COME ON, {NAME} — WE CAN DO BETTER",
  "TIME FOR A COMEBACK, {NAME}",
  "LET'S BUILD THIS UP, {NAME}",
  "NOT THERE YET, BRO",
  "THE NEXT ATTEMPT CAN BE MUCH BETTER, {NAME}",
  "WE'RE NOT STOPPING HERE, {NAME}",
];

const HEADLINES_50_59 = [
  "YOU'RE GETTING THERE, {NAME}",
  "HALFWAY THERE, {NAME}",
  "THE FOUNDATION IS STARTING TO SHOW, {NAME}",
  "KEEP PUSHING, BRO",
  "GOOD START — NOW BUILD ON IT, {NAME}",
  "WE CAN TAKE THIS HIGHER, {NAME}",
];

const HEADLINES_60_69 = [
  "NOW WE'RE MOVING, {NAME}!",
  "LOOK AT THAT IMPROVEMENT, {NAME} 👀",
  "KEEP CLIMBING, {NAME}",
  "YOU'RE GETTING CLOSE, {NAME}",
  "NOT BAD, BRO — BUT THERE'S MORE",
  "THE LEVEL-UP IS HAPPENING, {NAME}",
];

const HEADLINES_70_79 = [
  "STRONG WORK, {NAME}! 🔥",
  "NOW THAT'S PROGRESS, {NAME}",
  "YOU'RE GETTING SERIOUS, {NAME}",
  "ALMOST AT THE NEXT LEVEL, {NAME}",
  "LOOKING GOOD, BRO",
  "JUST A LITTLE MORE, {NAME}",
];

const HEADLINES_80_89 = [
  "EXCELLENT WORK, {NAME}! 🔥",
  "SHARP MIND, {NAME}",
  "YOU REALLY LEARN FAST, {NAME}",
  "THAT'S SOME SERIOUS PROGRESS, {NAME}",
  "NOW YOU'RE COOKING, {NAME} 🔥",
  "VERY STRONG WORK, {NAME}",
  "YOU'RE GETTING DANGEROUSLY GOOD, {NAME}",
];

const HEADLINES_90_99 = [
  "ABSOLUTELY DOMINATING, {NAME}! 🔥",
  "90+?! WHAT WAS THAT, {NAME}?",
  "YOU'VE LEVELED UP, {NAME}! 🔥",
  "BACK-BENCHER BUT STILL DOMINATING, {NAME} 😭🔥",
  "ONE STEP FROM PERFECTION, {NAME}",
  "OKAYYY, SOMEONE'S COOKING 🔥",
  "ELITE PERFORMANCE, {NAME}!",
];

const HEADLINES_100 = [
  "HANDS DOWN, {NAME}! 🫡🔥",
  "PERFECT SCORE, {NAME}!",
  "100%?! BRO WHAT?! 🔥",
  "ABSOLUTELY FLAWLESS, {NAME}",
  "YOU COOKED THIS ONE, {NAME} 🔥",
  "GENIUS MODE ACTIVATED, {NAME}",
  "PERFECTION ACHIEVED, {NAME}",
  "OKAY {NAME}, LEAVE SOME MARKS FOR EVERYONE ELSE 😭",
];

// -------------------------------------------------------------
// 2. SUPPORTING MESSAGES POOLS PER SCORE TIER
// -------------------------------------------------------------

const SUPPORTING_0_39 = [
  "{score}% — this topic needs some serious attention. Don't worry, Mishra Ji knows exactly where to start.",
  "Bro, this one needs attention 😭. Let's identify the weak concepts and rebuild them step by step.",
  "Every mistake gives us a roadmap of where to focus next. Let's rebuild the core fundamentals.",
  "Not your strongest round, but bad scores are feedback, not a final verdict. Let's get to work.",
];

const SUPPORTING_40_49 = [
  "You're on the board, but there's plenty of room to level up.",
  "There's a lot we can improve here. Let's turn those mistakes into your next advantage.",
  "The potential is clearly there, but preparation needs more precision. Let's sharpen the fundamentals.",
  "Not quite where you want to be yet, but totally within reach on the next attempt.",
];

const SUPPORTING_50_59 = [
  "{score}% shows that you've got part of the concept. Now let's turn that into mastery.",
  "You're halfway there — now let's push past average and turn solid effort into top marks.",
  "The foundation is taking shape. Let's review the tricky trap options and climb higher.",
  "Decent start, but don't settle for passing when you can dominate this subject.",
];

const SUPPORTING_60_69 = [
  "You're making progress. A little more precision and you're entering strong-score territory.",
  "You're improving. Keep pushing and those 70s and 80s are well within reach.",
  "Good discipline shown. Review the few careless slips below and retake with confidence.",
  "The momentum is building. Let's lock in the remaining key formulas and concepts.",
];

const SUPPORTING_70_79 = [
  "You're getting close to the top tier. Keep this momentum going!",
  "Solid command over the core concepts. A little fine-tuning and you're right at the top.",
  "Sharp work! Your understanding is clearly getting stronger with every session.",
  "Strong performance. Check the 2–3 questions you hesitated on to push for 85%+.",
];

const SUPPORTING_80_89 = [
  "Your understanding is getting seriously strong. High-tier execution!",
  "Sharp mind! You've genuinely understood the core logic and details of this topic.",
  "That's not luck, {name}. That's solid preparation and deep focus showing up.",
  "Very impressive performance. You've commanded this challenge with authority.",
];

const SUPPORTING_90_99 = [
  "That was seriously impressive. You're just one step away from perfection!",
  "Elite performance! You dismantled this assessment with speed and precision.",
  "Almost perfect. One tiny slip from 100% — absolutely phenomenal execution.",
  "You didn't just memorize this topic; you truly own it. Masterclass performance.",
];

const SUPPORTING_100 = [
  "100%. Every single question handled. Mishra Ji is officially impressed!",
  "Perfect score. Mishra Ji officially has nothing to complain about. 🫡",
  "Flawless execution from start to finish. You absolutely cooked this challenge!",
  "Perfection achieved! Consistency, accuracy, and deep mastery on full display.",
];

// -------------------------------------------------------------
// 3. MISHRA JI TUTOR DIALOGUE REACTION POOLS
// -------------------------------------------------------------

const REACTIONS_0_39 = [
  "Really need to work on this one, {name}. Let's fix this before it becomes a habit.",
  "Bro... this one needs attention ASAP 😭. But that's exactly why Mishra Ji is here.",
  "{name}, we're not hiding from this score. We find the weak spots and attack them.",
  "Okay bro, this is the signal. Time to level up.",
  "Not your strongest round, {name}. Good thing a bad score is feedback, not a final verdict.",
  "Mishra Ji's honest review: we've got work to do. Let's get started.",
  "Below the target today, {name}. No panic — but definitely no ignoring this either.",
  "Reality check: this topic needs serious work. Let's turn this score around.",
  "Bro, we're not normalizing this score. Let's sit down and rebuild the fundamentals.",
  "{name}, every master once struggled with these exact problems. Don't quit now.",
];

const QUOTES_0_39 = [
  "Today's score is information. Tomorrow's score depends on what you do with it.",
  "Today's score is feedback, not your identity.",
  "Every mistake is a map showing you where to improve.",
  "You haven't failed — you just found the exact concepts that need practice.",
];

const ACTIONS_0_39 = [
  "Let's identify your weakest 2–3 concepts before attempting this again.",
  "Review the missed questions below with Mishra Ji in chat to build intuition.",
  "Take a 5-minute break, revise the core notes, and we will try a fresh attempt.",
  "Focus on the step-by-step logic in the review section before retaking.",
];

const REACTIONS_40_49 = [
  "Need much improvement, bro 😭. But Mishra Ji is here 24×7 — ask me anything, just don't bring this grade again.",
  "{name}, we're not at the level we want yet. But we're absolutely capable of getting there.",
  "Bro, this score isn't the destination. It's the starting point.",
  "Okay {name}, Mishra Ji officially recommends: more practice, fewer excuses 😭.",
  "Can't let this become your standard, bro. We level up from here.",
  "Not terrible, not great — but definitely not where you can be.",
  "{name}, I know you can do better than this. Now let's prove it.",
  "Your tutor is literally here 24×7. Ask me anything, repeat anything, break anything down — but let's not settle.",
];

const QUOTES_40_49 = [
  "Consistency beats talent when talent stops practicing.",
  "Don't chase the score. Chase the understanding.",
  "Progress begins the moment you decide not to settle.",
];

const ACTIONS_40_49 = [
  "Revise the 2 weakest concepts and formulas before your next attempt.",
  "Go through the explanations below and let's clarify your doubts in chat.",
  "Turn the questions you missed into active recall flashcards.",
];

const REACTIONS_50_59 = [
  "{name}, improvement is not a myth 😭. We've got work to do.",
  "Bro, you're halfway there — now let's push past average.",
  "You know you can get to the top of the stack, right?",
  "You're going to get more than this, {name}. I know it.",
  "Not bad enough to panic. Not good enough to relax. Perfect time to improve.",
  "{name}, the foundation is there. Now build on it.",
  "You're closer than you think, bro. A little more consistency and this score changes.",
  "Decent start — but don't confuse passing with mastering.",
];

const QUOTES_50_59 = [
  "Progress begins when 'good enough' stops being enough.",
  "Mastery is just repeated improvement.",
  "Small daily improvements over time lead to stunning results.",
];

const ACTIONS_50_59 = [
  "Check the questions you hesitated on and do a targeted retake.",
  "Review the detailed reasoning below to catch the subtle trap options.",
  "Ask Mishra Ji in chat to test you on the trickiest edge cases.",
];

const REACTIONS_60_69 = [
  "Whoa, {name}... seems like a little improvement 👀.",
  "Okay bro, NOW we're moving.",
  "Just a little more and we're entering serious territory.",
  "{name}, you're only a few steps away from turning this into a strong score.",
  "Not bad! But Mishra Ji knows you can squeeze more out of this brain.",
  "Okayyy... we're leveling up.",
  "You're getting there, {name}. Now don't slow down.",
  "60s are progress. 70s are calling.",
  "Bro, this is exactly where consistency starts paying off.",
];

const QUOTES_60_69 = [
  "Consistency beats intensity.",
  "Small gains every day compound into massive breakthroughs.",
  "Momentum is built one correct concept at a time.",
];

const ACTIONS_60_69 = [
  "You're close — check those 2-3 careless slips and retake for 75%+.",
  "Brush up on the tricky edge cases and let's jump straight to 80s.",
  "Review the missed explanations below to lock in the remaining concepts.",
];

const REACTIONS_70_79 = [
  "Wow, {name}! Now THAT looks like improvement 🔥.",
  "Just a few grades away from A+ territory.",
  "Okayyy bro, I see the upgrade.",
  "You're getting seriously close now, {name}.",
  "Strong work. But I know there's still another level in you.",
  "That's a solid score, bro. Now let's chase the 80s.",
  "Mishra Ji approves 👏. But we're not stopping here.",
  "You're officially out of the danger zone. Now let's dominate.",
  "Good work, {name}. Keep this momentum.",
];

const QUOTES_70_79 = [
  "Good is the enemy of great. Keep pushing.",
  "When the foundation is strong, the sky is the limit.",
  "Discipline turns strong performance into effortless mastery.",
];

const ACTIONS_70_79 = [
  "Review the couple of tricky questions you missed and aim for 85%+ next.",
  "Strong score! Ready to test yourself on an Advanced difficulty challenge?",
  "Solid work — review the explanations below to turn 70s into 90s.",
];

const REACTIONS_80_89 = [
  "You really learn fast, {name}. 🔥",
  "Sharp mind detected.",
  "Okay {name}, someone's getting dangerous with this topic.",
  "Bro, that's some serious improvement.",
  "Your brain is clearly cooperating today 😭.",
  "Excellent work. Now we're talking.",
  "That's not luck, {name}. That's understanding.",
  "You've got a sharp mind. Keep challenging it.",
  "80+! Mishra Ji is officially impressed.",
  "{name}, this is high-tier execution. You've genuinely understood the core.",
];

const QUOTES_80_89 = [
  "Mastery is when what was once difficult becomes second nature.",
  "Discipline turns talent into mastery.",
  "Understanding is a weapon no exam can take from you.",
];

const ACTIONS_80_89 = [
  "Strong score. Now try a Mastery-level challenge to test your limits.",
  "Check the single question you missed below to aim for 100% next time.",
  "Teach this concept to Mishra Ji in chat to solidify it forever.",
];

const REACTIONS_90_99 = [
  "Back-bencher but still dominating, {name} 😭🔥.",
  "WOAH. Leveled up ahhh!",
  "Bro came here to study and accidentally became the topper.",
  "{name}... Mishra Ji wasn't ready for that score.",
  "90+?! Okay, someone's cooking 🔥.",
  "That's elite territory, bro.",
  "One tiny step away from perfection.",
  "Okayyy {name}, I see what you're doing.",
  "At this point, I'm starting to think you're secretly reading my notes beforehand 😭.",
  "90+ means you didn't just memorize it — you're starting to own it.",
  "{name}, you absolutely dismantled this test. Phenomenal work.",
];

const QUOTES_90_99 = [
  "Excellence is not an act, but a habit.",
  "When preparation meets opportunity, 90%+ is the result.",
  "Confidence comes from competence, and you just proved both.",
];

const ACTIONS_90_99 = [
  "One question away from 100%. Check that single slip and lock in perfection.",
  "You've crushed this topic! Ready for timed speed challenges or higher difficulty?",
  "Save this momentum and jump straight into your next chapter.",
];

const REACTIONS_100 = [
  "HANDS DOWN, {name}! 🫡🔥",
  "100%. Absolutely ridiculous. In the best possible way.",
  "Very intelligent ahhh 😭🔥.",
  "Okay bro... perfection has entered the chat.",
  "Seems like you found the loophole 😭.",
  "Cheers to that result, {name}! 🥂🔥",
  "PERFECT SCORE. Mishra Ji officially has nothing to complain about.",
  "100%?! Bro understood the assignment.",
  "That's not a score. That's a statement.",
  "{name}, you absolutely cooked this one. 🔥",
  "Perfect. Clean. No notes. 👏",
  "Mishra Ji is proud today.",
  "Okayyy genius, leave some marks for the rest of the class 😭.",
];

const QUOTES_100 = [
  "Flawless execution. Consistency delivered perfection.",
  "When you understand the root concepts, perfection follows naturally.",
  "Peak performance is when preparation meets total focus.",
];

const ACTIONS_100 = [
  "Take a bow! Then carry this unbeatable momentum into your next subject.",
  "You own this topic completely. Ready to conquer the next chapter?",
  "Add this topic to your mastered library and keep your streak alive.",
];

// -------------------------------------------------------------
// 4. HELPER FORMATTER FUNCTIONS
// -------------------------------------------------------------

function formatTemplate(template: string, name?: string, score?: number): string {
  const cleanName = name?.trim();
  let result = template;

  if (cleanName) {
    result = result
      .replace(/\{NAME\}/g, cleanName.toUpperCase())
      .replace(/\{name\}/g, cleanName)
      .replace(/\{FIRST NAME\}/g, cleanName.toUpperCase())
      .replace(/\{firstName\}/g, cleanName);
  } else {
    result = result
      .replace(/,\s*\{NAME\}/g, "")
      .replace(/\{NAME\},\s*/g, "")
      .replace(/\{NAME\}/g, "SCHOLAR")
      .replace(/,\s*\{name\}/g, "")
      .replace(/\{name\},\s*/g, "")
      .replace(/\{name\}/g, "my friend")
      .replace(/,\s*\{FIRST NAME\}/g, "")
      .replace(/\{FIRST NAME\},\s*/g, "")
      .replace(/\{FIRST NAME\}/g, "SCHOLAR")
      .replace(/,\s*\{firstName\}/g, "")
      .replace(/\{firstName\},\s*/g, "")
      .replace(/\{firstName\}/g, "my friend");
  }

  if (typeof score === "number") {
    result = result.replace(/\{score\}/g, `${score}`);
  }

  return result;
}

/**
 * Returns a score-aware result headline matching the exact score range.
 * Supports historical comparison overrides when previous score data is available.
 */
export function getResultHeadline(
  score: number,
  firstName?: string,
  _assessmentType: AssessmentType = "quiz",
  previousScore?: number | null
): string {
  const cleanScore = Math.max(0, Math.min(100, Math.round(score)));
  const name = firstName?.trim() || "";

  // Check historical delta override if previousScore is provided
  if (typeof previousScore === "number" && !isNaN(previousScore)) {
    const delta = cleanScore - previousScore;
    if (delta >= 18) {
      return formatTemplate("NOW THAT'S A LEVEL-UP, {NAME}! 🔥", name, cleanScore);
    }
    if (delta <= -18) {
      return formatTemplate("SMALL SETBACK THIS TIME, {NAME}", name, cleanScore);
    }
  }

  let pool: string[];
  if (cleanScore === 100) {
    pool = HEADLINES_100;
  } else if (cleanScore >= 90) {
    pool = HEADLINES_90_99;
  } else if (cleanScore >= 80) {
    pool = HEADLINES_80_89;
  } else if (cleanScore >= 70) {
    pool = HEADLINES_70_79;
  } else if (cleanScore >= 60) {
    pool = HEADLINES_60_69;
  } else if (cleanScore >= 50) {
    pool = HEADLINES_50_59;
  } else if (cleanScore >= 40) {
    pool = HEADLINES_40_49;
  } else {
    pool = HEADLINES_0_39;
  }

  const raw = getRandomItem(pool);
  return formatTemplate(raw, name, cleanScore);
}

/**
 * Returns a score-aware supporting description matching the exact score range.
 */
export function getResultSupportingText(
  score: number,
  firstName?: string,
  _assessmentTitle?: string,
  previousScore?: number | null
): string {
  const cleanScore = Math.max(0, Math.min(100, Math.round(score)));
  const name = firstName?.trim() || "";

  if (typeof previousScore === "number" && !isNaN(previousScore)) {
    const delta = cleanScore - previousScore;
    if (delta >= 18) {
      return `You jumped +${delta} points from your previous attempt (${previousScore}%). Excellent improvement!`;
    }
    if (delta <= -18) {
      return `Dipped -${Math.abs(delta)} points from your previous score (${previousScore}%). Let's review the missed concepts and bounce right back.`;
    }
  }

  let pool: string[];
  if (cleanScore === 100) {
    pool = SUPPORTING_100;
  } else if (cleanScore >= 90) {
    pool = SUPPORTING_90_99;
  } else if (cleanScore >= 80) {
    pool = SUPPORTING_80_89;
  } else if (cleanScore >= 70) {
    pool = SUPPORTING_70_79;
  } else if (cleanScore >= 60) {
    pool = SUPPORTING_60_69;
  } else if (cleanScore >= 50) {
    pool = SUPPORTING_50_59;
  } else if (cleanScore >= 40) {
    pool = SUPPORTING_40_49;
  } else {
    pool = SUPPORTING_0_39;
  }

  const raw = getRandomItem(pool);
  return formatTemplate(raw, name, cleanScore);
}

/**
 * Core function to generate Mishra Ji's personalized dynamic score reaction object
 */
export function getMishraJiScoreReaction(
  scoreOrOptions: number | ScoreReactionOptions,
  userFirstName?: string,
  previousScore?: number | null,
  assessmentType: AssessmentType = "quiz",
  difficulty?: string
): MishraJiScoreReaction {
  let opts: ScoreReactionOptions;

  if (typeof scoreOrOptions === "number") {
    opts = {
      score: scoreOrOptions,
      userFirstName,
      previousScore,
      assessmentType,
      difficulty,
    };
  } else {
    opts = scoreOrOptions;
  }

  const score = Math.max(0, Math.min(100, Math.round(opts.score)));
  const name = opts.userFirstName?.trim() || "";

  // 1. Determine Score Range and Tone
  let tone: EmotionalTone;
  let scoreRangeLabel: string;
  let statusBadgeLabel: string;
  let badgeEmoji: string;
  let reactionsPool: string[];
  let quotesPool: string[];
  let actionsPool: string[];
  let styling: MishraJiScoreReaction["styling"];

  if (score === 100) {
    tone = "perfect";
    scoreRangeLabel = "100% — Flawless Perfection";
    statusBadgeLabel = "PERFECT SCORE 👑";
    badgeEmoji = "👑";
    reactionsPool = REACTIONS_100;
    quotesPool = QUOTES_100;
    actionsPool = ACTIONS_100;
    styling = {
      badgeBg: "bg-amber-400/20 text-amber-300 border-amber-400/40",
      badgeText: "text-amber-300",
      border: "border-amber-400/50",
      cardBg: "bg-gradient-to-br from-slate-900 via-amber-950/40 to-slate-950",
      accentText: "text-amber-400",
      avatarRing: "ring-amber-400/50",
    };
  } else if (score >= 90) {
    tone = "elite";
    scoreRangeLabel = "90–99% — Elite Performance";
    statusBadgeLabel = "ELITE PERFORMANCE 🔥";
    badgeEmoji = "🔥";
    reactionsPool = REACTIONS_90_99;
    quotesPool = QUOTES_90_99;
    actionsPool = ACTIONS_90_99;
    styling = {
      badgeBg: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
      badgeText: "text-indigo-300",
      border: "border-indigo-500/40",
      cardBg: "bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-950",
      accentText: "text-indigo-400",
      avatarRing: "ring-indigo-400/50",
    };
  } else if (score >= 80) {
    tone = "excellent";
    scoreRangeLabel = "80–89% — Excellent Performance";
    statusBadgeLabel = "EXCELLENT MASTERY ⚡";
    badgeEmoji = "⚡";
    reactionsPool = REACTIONS_80_89;
    quotesPool = QUOTES_80_89;
    actionsPool = ACTIONS_80_89;
    styling = {
      badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      badgeText: "text-emerald-300",
      border: "border-emerald-500/40",
      cardBg: "bg-gradient-to-br from-slate-900 via-emerald-950/30 to-slate-950",
      accentText: "text-emerald-400",
      avatarRing: "ring-emerald-400/50",
    };
  } else if (score >= 70) {
    tone = "strong_performance";
    scoreRangeLabel = "70–79% — Strong Performance";
    statusBadgeLabel = "STRONG PERFORMANCE 👏";
    badgeEmoji = "👏";
    reactionsPool = REACTIONS_70_79;
    quotesPool = QUOTES_70_79;
    actionsPool = ACTIONS_70_79;
    styling = {
      badgeBg: "bg-teal-500/20 text-teal-300 border-teal-500/40",
      badgeText: "text-teal-300",
      border: "border-teal-500/40",
      cardBg: "bg-gradient-to-br from-slate-900 via-teal-950/30 to-slate-950",
      accentText: "text-teal-400",
      avatarRing: "ring-teal-400/50",
    };
  } else if (score >= 60) {
    tone = "decent_progress";
    scoreRangeLabel = "60–69% — Decent Progress";
    statusBadgeLabel = "PROGRESS DETECTED 📈";
    badgeEmoji = "📈";
    reactionsPool = REACTIONS_60_69;
    quotesPool = QUOTES_60_69;
    actionsPool = ACTIONS_60_69;
    styling = {
      badgeBg: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
      badgeText: "text-cyan-300",
      border: "border-cyan-500/40",
      cardBg: "bg-gradient-to-br from-slate-900 via-cyan-950/30 to-slate-950",
      accentText: "text-cyan-400",
      avatarRing: "ring-cyan-400/50",
    };
  } else if (score >= 50) {
    tone = "improvement_needed";
    scoreRangeLabel = "50–59% — Improvement Needed";
    statusBadgeLabel = "KEEP BUILDING 🎯";
    badgeEmoji = "🎯";
    reactionsPool = REACTIONS_50_59;
    quotesPool = QUOTES_50_59;
    actionsPool = ACTIONS_50_59;
    styling = {
      badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      badgeText: "text-amber-300",
      border: "border-amber-500/40",
      cardBg: "bg-gradient-to-br from-slate-900 via-amber-950/30 to-slate-950",
      accentText: "text-amber-400",
      avatarRing: "ring-amber-400/50",
    };
  } else if (score >= 40) {
    tone = "major_improvement";
    scoreRangeLabel = "40–49% — Major Improvement Needed";
    statusBadgeLabel = "COMEBACK MODE ⚠️";
    badgeEmoji = "⚠️";
    reactionsPool = REACTIONS_40_49;
    quotesPool = QUOTES_40_49;
    actionsPool = ACTIONS_40_49;
    styling = {
      badgeBg: "bg-orange-500/20 text-orange-300 border-orange-500/40",
      badgeText: "text-orange-300",
      border: "border-orange-500/40",
      cardBg: "bg-gradient-to-br from-slate-900 via-orange-950/30 to-slate-950",
      accentText: "text-orange-400",
      avatarRing: "ring-orange-400/50",
    };
  } else {
    tone = "urgent_improvement";
    scoreRangeLabel = "0–39% — Urgent Improvement";
    statusBadgeLabel = "NEEDS ATTENTION 🚨";
    badgeEmoji = "🚨";
    reactionsPool = REACTIONS_0_39;
    quotesPool = QUOTES_0_39;
    actionsPool = ACTIONS_0_39;
    styling = {
      badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40",
      badgeText: "text-rose-300",
      border: "border-rose-500/40",
      cardBg: "bg-gradient-to-br from-slate-900 via-rose-950/30 to-slate-950",
      accentText: "text-rose-400",
      avatarRing: "ring-rose-400/50",
    };
  }

  // 2. Compute Dynamic Headline and Supporting Text
  const headline = getResultHeadline(score, name, opts.assessmentType, opts.previousScore);
  const supportingMessage = getResultSupportingText(score, name, opts.topic, opts.previousScore);

  // 3. Contextual Historical Comparisons for Mishra Ji's direct spoken reaction
  let selectedReaction = "";
  let contextNote: string | undefined = undefined;

  const prev = opts.previousScore;
  const recentScores = opts.recentScoresOnTopic || [];

  if (opts.isFirstAttempt) {
    contextNote = "First Attempt Record";
    if (Math.random() < 0.35) {
      selectedReaction = name
        ? `First attempt on this, ${name}. Don't overthink it — now we know where you stand, and we build from here.`
        : "First attempt on this topic. Don't overthink it — now we know where you stand, and we build from here.";
    }
  } else if (typeof prev === "number" && !isNaN(prev)) {
    const delta = score - prev;
    if (delta >= 18) {
      contextNote = `Jumped +${delta}% from previous attempt (${prev}%)`;
      if (Math.random() < 0.6) {
        selectedReaction = name
          ? `WAIT... ${name}, that's a serious jump from your last attempt (+${delta}%) 🔥.`
          : `WAIT... that's a serious jump from your last attempt (+${delta}%) 🔥.`;
      }
    } else if (delta <= -18) {
      contextNote = `Dipped -${Math.abs(delta)}% from previous attempt (${prev}%)`;
      if (Math.random() < 0.6) {
        selectedReaction = name
          ? `Okay ${name}, we slipped a little this time compared to last round (${prev}%). Let's figure out why before the next attempt.`
          : `Okay, we slipped a little this time compared to last round (${prev}%). Let's figure out why before the next attempt.`;
      }
    }
  } else if (recentScores.length >= 3) {
    const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    if (avgRecent < 45 && score < 50) {
      if (Math.random() < 0.5) {
        selectedReaction = name
          ? `Bro ${name}, we've seen this topic test you a few times now. Time to stop fighting the symptoms and fix the core concept with Mishra Ji.`
          : "Bro, we've seen this topic test you a few times now. Time to stop fighting the symptoms and fix the core concept with Mishra Ji.";
      }
    } else if (avgRecent >= 85 && score >= 85) {
      if (Math.random() < 0.5) {
        selectedReaction = name
          ? `${name}, you're making this look way too easy now! Ready for higher difficulty?`
          : "You're making this look way too easy now! Ready for higher difficulty?";
      }
    }
  }

  // Fallback to pool if contextual override was not triggered
  if (!selectedReaction) {
    const rawTemplate = getRandomItem(reactionsPool);
    selectedReaction = formatTemplate(rawTemplate, name, score);
  }

  // Pick quote
  let quote: string | undefined = undefined;
  if (Math.random() < 0.65 || score === 100 || score < 40) {
    quote = getRandomItem(quotesPool);
  }

  // Pick action suggestion
  let actionSuggestion: string | undefined = undefined;
  if (Math.random() < 0.85 || score < 50) {
    actionSuggestion = getRandomItem(actionsPool);
  }

  return {
    reaction: selectedReaction,
    headline,
    supportingMessage,
    emotionalTone: tone,
    scoreRangeLabel,
    statusBadgeLabel,
    badgeEmoji,
    quote,
    actionSuggestion,
    contextNote,
    styling,
  };
}
export default getMishraJiScoreReaction;
