import React, { useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { useQuizSession } from "../../context/QuizSessionContext";
import StudyPilotContentRenderer from "../common/StudyPilotContentRenderer";
import MishraJiScoreReactionBanner from "../common/MishraJiScoreReactionBanner";
import { getMishraJiScoreReaction } from "../../utils/mishraJiScoreReactions";
import {
  Award,
  AlertTriangle,
  Clock,
  RotateCcw,
  PlusCircle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BotMessageSquare,
  Flame,
} from "lucide-react";

interface GameShowResultScreenProps {
  onAskMishraJi?: (prompt: string, subject?: string) => void;
}

export const GameShowResultScreen: React.FC<GameShowResultScreenProps> = ({ onAskMishraJi }) => {
  const { user } = useAuth();
  const { quizResults } = useData();
  const { activeSession, dismissResult, retakeQuiz } = useQuizSession();
  const [expandedExplanations, setExpandedExplanations] = useState<Record<number, boolean>>({});

  if (!activeSession || activeSession.status !== "terminal" || !activeSession.result) {
    return null;
  }

  const result = activeSession.result;
  const quiz = activeSession.quiz;
  const firstName = user?.name ? user.name.split(" ")[0] : "Student";

  const isEarlyLeft = result.terminationReason === "left_quiz";
  const isTimeExpired = result.terminationReason === "time_expired";
  const isNormalCompletion = !isEarlyLeft && !isTimeExpired;

  // Real historical data computation (no fabricated numbers)
  const previousAttempts = useMemo(() => {
    return quizResults
      .filter((r) => r.quizId === quiz.id || (r.topic === quiz.topic && r.subject === quiz.subject))
      .sort((a, b) => b.completedAt - a.completedAt);
  }, [quizResults, quiz.id, quiz.topic, quiz.subject]);

  const lastAttempt = useMemo(() => {
    return previousAttempts.length > 1
      ? previousAttempts[1]
      : previousAttempts.length === 1 && previousAttempts[0].id !== result.id
      ? previousAttempts[0]
      : null;
  }, [previousAttempts, result.id]);

  const isFirstAttempt = !lastAttempt && previousAttempts.length <= 1;
  const previousScore = lastAttempt ? lastAttempt.percentage : null;
  const recentScoresOnTopic = useMemo(() => previousAttempts.map((r) => r.percentage), [previousAttempts]);

  // Compute dynamic score reaction data
  const reactionData = useMemo(() => {
    return getMishraJiScoreReaction({
      score: result.percentage,
      userFirstName: firstName,
      previousScore: previousScore,
      recentScoresOnTopic: recentScoresOnTopic,
      assessmentType: "quiz",
      difficulty: quiz.difficulty,
      topic: quiz.topic,
      subject: quiz.subject,
      isFirstAttempt: isFirstAttempt,
    });
  }, [
    result.percentage,
    firstName,
    previousScore,
    recentScoresOnTopic,
    quiz.difficulty,
    quiz.topic,
    quiz.subject,
    isFirstAttempt,
  ]);

  const minsUsed = Math.floor(result.timeSpentSeconds / 60);
  const secsUsed = result.timeSpentSeconds % 60;
  const timeFormatted = `${minsUsed}m ${secsUsed}s`;

  const optionLetters = ["A", "B", "C", "D"];

  const toggleExplanation = (qId: number) => {
    setExpandedExplanations((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  const handleAskMishraJiAboutMistakes = () => {
    if (!onAskMishraJi) return;
    const incorrectQuestions = quiz.questions.filter((q) => {
      const ans = result.answers.find((a) => a.questionId === q.id);
      return !ans || !ans.isCorrect;
    });

    const summaryText = incorrectQuestions
      .slice(0, 3)
      .map(
        (q, idx) =>
          `${idx + 1}. "${q.question}" (Correct: ${q.options[q.correctOptionIndex]})`
      )
      .join("\n");

    const prompt = `Hey Mishra Ji, I just completed a quiz challenge on "${quiz.title}" (${quiz.subject}) and scored ${result.score}/${result.totalQuestions} (${result.percentage}%). I would love your help understanding the key concepts behind the questions I missed:\n\n${summaryText}\n\nCould you break down the underlying concepts and give me an intuitive explanation and practice tips?`;

    dismissResult();
    onAskMishraJi(prompt, quiz.subject);
  };

  return (
    <div className="mx-auto max-w-4xl py-4 sm:py-8 space-y-6 sm:space-y-8 animate-fadeIn">
      {/* 1. Dynamic Mishra Ji Personalized Score Reaction Hero Banner */}
      <MishraJiScoreReactionBanner
        score={result.percentage}
        userFirstName={firstName}
        previousScore={previousScore}
        recentScoresOnTopic={recentScoresOnTopic}
        assessmentType="quiz"
        difficulty={quiz.difficulty}
        topic={quiz.topic}
        subject={quiz.subject}
        isFirstAttempt={isFirstAttempt}
        onAskMishraJi={
          onAskMishraJi ? handleAskMishraJiAboutMistakes : undefined
        }
        onRetake={retakeQuiz}
        showActions={true}
      />

      {/* 2. Header Card (Completion status + Full Statistics HUD) */}
      <div
        className={`overflow-hidden rounded-3xl border p-6 sm:p-10 shadow-2xl text-white relative transition duration-300 ${
          isEarlyLeft
            ? "border-rose-500/60 bg-gradient-to-b from-rose-950 via-slate-950 to-slate-950 ring-4 ring-rose-500/15"
            : isTimeExpired
            ? "border-amber-500/60 bg-gradient-to-b from-amber-950 via-slate-950 to-slate-950 ring-4 ring-amber-500/15"
            : `${reactionData.styling.cardBg} ${reactionData.styling.border}`
        }`}
      >
        <div className="relative z-10 text-center space-y-4">
          {/* Status Badge */}
          {isEarlyLeft ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/20 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-rose-300">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              <span>🔴 QUIZ ENDED EARLY — INTEGRITY AUTO-SUBMIT</span>
            </div>
          ) : isTimeExpired ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/20 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-amber-300">
              <Clock className="h-4 w-4 text-amber-400" />
              <span>⏰ TIME EXPIRED</span>
            </div>
          ) : (
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-widest shadow-xs ${reactionData.styling.badgeBg}`}
            >
              <span>{reactionData.badgeEmoji}</span>
              <span>{reactionData.statusBadgeLabel}</span>
            </div>
          )}

          {/* Main Dynamic Headline */}
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            {isEarlyLeft
              ? "QUIZ SUBMITTED"
              : isTimeExpired
              ? "TIME RUN OUT"
              : reactionData.headline}
          </h1>

          {/* Dynamic Supporting Text */}
          <p className="text-sm sm:text-base font-medium text-slate-300 max-w-xl mx-auto">
            {isEarlyLeft
              ? "You switched browser tabs or navigated away from the active quiz. In accordance with the quiz integrity rules, your current responses were submitted and remaining questions were marked Unanswered."
              : isTimeExpired
              ? "The countdown timer reached 00:00. Your locked answers have been scored and unanswered questions were recorded."
              : reactionData.supportingMessage}
          </p>

          {/* Score Meters HUD */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-6 gap-3 pt-4 border-t border-slate-800/80">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center">
              <span className="text-2xl sm:text-3xl font-black text-indigo-400">
                {result.score}/{result.totalQuestions}
              </span>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                Score
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center">
              <span
                className={`text-2xl sm:text-3xl font-black ${
                  result.percentage >= 70
                    ? "text-emerald-400"
                    : result.percentage >= 50
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              >
                {result.percentage}%
              </span>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                Accuracy
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                {result.correctCount}
              </span>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                Correct
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center">
              <span className="text-2xl sm:text-3xl font-black text-rose-400">
                {result.incorrectCount}
              </span>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                Incorrect
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center">
              <span className="text-2xl sm:text-3xl font-black text-slate-400">
                {result.unansweredCount}
              </span>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                Unanswered
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center">
              <span className="text-xl sm:text-2xl font-black text-amber-300">
                {timeFormatted}
              </span>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                Time Spent
              </p>
            </div>
          </div>

          {/* Action Decision Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              id="quiz-unlock-new-btn"
              onClick={dismissResult}
              className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-xl shadow-indigo-600/30 hover:bg-indigo-500 transition active:scale-95"
            >
              <PlusCircle className="h-4 w-4" />
              <span>START NEW QUIZ</span>
            </button>

            <button
              type="button"
              id="quiz-retake-btn"
              onClick={retakeQuiz}
              className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-xs sm:text-sm font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition active:scale-95"
            >
              <RotateCcw className="h-4 w-4" />
              <span>RETAKE CHALLENGE</span>
            </button>

            {onAskMishraJi && result.incorrectCount + result.unansweredCount > 0 && (
              <button
                type="button"
                id="quiz-ask-mishraji-btn"
                onClick={handleAskMishraJiAboutMistakes}
                className="flex items-center gap-2 rounded-2xl border border-sky-500/40 bg-sky-950/40 px-5 py-3 text-xs sm:text-sm font-bold text-sky-300 hover:bg-sky-900/50 hover:text-white transition active:scale-95"
              >
                <BotMessageSquare className="h-4 w-4 text-sky-400" />
                <span>Review Missed Concepts with Mishra Ji</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Question-by-Question Detailed Review */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
              Question-by-Question Review & Explanations
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {quiz.questions.length} Total Questions
          </span>
        </div>

        <div className="space-y-4">
          {quiz.questions.map((q, idx) => {
            const answerRec = result.answers.find((a) => a.questionId === q.id);
            const selectedIdx = answerRec ? answerRec.selectedOptionIndex : -1;
            const isUnanswered = selectedIdx === -1;
            const isCorrect = answerRec?.isCorrect;
            const isExpanded = !!expandedExplanations[q.id];

            return (
              <div
                key={q.id}
                className={`overflow-hidden rounded-2xl border bg-white p-5 sm:p-6 shadow-xs transition ${
                  isCorrect
                    ? "border-emerald-200"
                    : isUnanswered
                    ? "border-slate-200"
                    : "border-rose-200"
                }`}
              >
                {/* Question Header & Status Badge */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-700">
                        Question {idx + 1}
                      </span>
                      {isCorrect ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" /> Correct
                        </span>
                      ) : isUnanswered ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                          <MinusCircle className="h-3 w-3" /> Unanswered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                          <XCircle className="h-3 w-3" /> Incorrect
                        </span>
                      )}
                    </div>

                    <div className="text-sm sm:text-base font-bold text-slate-900 leading-snug pt-1">
                      <StudyPilotContentRenderer content={q.question} />
                    </div>
                  </div>
                </div>

                {/* Choices breakdown */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {q.options.slice(0, 4).map((optText, optIdx) => {
                    const isUserChoice = selectedIdx === optIdx;
                    const isRightAnswer = optIdx === q.correctOptionIndex;
                    const letter = optionLetters[optIdx] || `${optIdx + 1}`;

                    let optionBorder = "border-slate-200 bg-slate-50/60 text-slate-600";
                    if (isRightAnswer) {
                      optionBorder = "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold";
                    } else if (isUserChoice && !isRightAnswer) {
                      optionBorder = "border-rose-400 bg-rose-50 text-rose-900 font-bold";
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`flex items-center justify-between rounded-xl border p-3 ${optionBorder}`}
                      >
                        <div className="flex items-center gap-2.5 flex-1 pr-2">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black uppercase ${
                              isRightAnswer
                                ? "bg-emerald-600 text-white"
                                : isUserChoice
                                ? "bg-rose-600 text-white"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {letter}
                          </span>
                          <div className="leading-snug flex-1">
                            <StudyPilotContentRenderer content={optText} compact inlineOnly />
                          </div>
                        </div>
                        {isRightAnswer && (
                          <span className="rounded bg-emerald-200/80 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-900 shrink-0">
                            CORRECT
                          </span>
                        )}
                        {isUserChoice && !isRightAnswer && (
                          <span className="rounded bg-rose-200/80 px-1.5 py-0.5 text-[10px] font-extrabold text-rose-900 shrink-0">
                            YOUR CHOICE
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Concept Explanation Box ("Why?") */}
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 text-xs text-slate-700 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                      <Lightbulb className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Why? Concept Explanation:</span>
                    </div>
                    <div className="leading-relaxed text-slate-700">
                      <StudyPilotContentRenderer content={q.explanation} compact />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
