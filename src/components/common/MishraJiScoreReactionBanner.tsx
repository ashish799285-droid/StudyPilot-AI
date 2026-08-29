import React from "react";
import {
  MishraJiScoreReaction,
  getMishraJiScoreReaction,
  ScoreReactionOptions,
} from "../../utils/mishraJiScoreReactions";
import {
  Sparkles,
  BotMessageSquare,
  Quote,
  Flame,
  ArrowRight,
  RotateCcw,
  Target,
  Compass,
} from "lucide-react";

interface MishraJiScoreReactionBannerProps {
  score: number;
  userFirstName?: string;
  previousScore?: number | null;
  recentScoresOnTopic?: number[];
  assessmentType?: ScoreReactionOptions["assessmentType"];
  difficulty?: string;
  topic?: string;
  subject?: string;
  isFirstAttempt?: boolean;
  onAskMishraJi?: () => void;
  onRetake?: () => void;
  showActions?: boolean;
  className?: string;
}

export const MishraJiScoreReactionBanner: React.FC<MishraJiScoreReactionBannerProps> = ({
  score,
  userFirstName,
  previousScore,
  recentScoresOnTopic,
  assessmentType = "quiz",
  difficulty,
  topic,
  subject,
  isFirstAttempt,
  onAskMishraJi,
  onRetake,
  showActions = true,
  className = "",
}) => {
  // Generate the score reaction
  const reactionData: MishraJiScoreReaction = React.useMemo(() => {
    return getMishraJiScoreReaction({
      score,
      userFirstName,
      previousScore,
      recentScoresOnTopic,
      assessmentType,
      difficulty,
      topic,
      subject,
      isFirstAttempt,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, userFirstName, previousScore, recentScoresOnTopic, assessmentType, difficulty, topic]);

  const {
    reaction,
    headline,
    badgeEmoji,
    scoreRangeLabel,
    quote,
    actionSuggestion,
    contextNote,
    styling,
  } = reactionData;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border p-6 sm:p-8 shadow-xl text-white transition duration-300 ${styling.cardBg} ${styling.border} ${className}`}
    >
      {/* Subtle background glow effect */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-6">
        {/* Top Header: Tutor Badge + Score Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            {/* Mishra Ji Avatar with dynamic status ring */}
            <div className="relative">
              <div
                className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-indigo-950 text-indigo-300 ring-2 ${styling.avatarRing} shadow-md overflow-hidden`}
              >
                <span className="text-xl sm:text-2xl select-none">👨‍🏫</span>
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-slate-950">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm sm:text-base font-black tracking-tight text-white">
                  Mishra Ji
                </h4>
                <span className="rounded-md bg-indigo-500/30 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-200">
                  AI Academic Mentor
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                Live Performance Reaction & Reality Check
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {contextNote && (
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-500/15 px-3 py-1 text-[11px] font-bold text-sky-200">
                <Target className="h-3 w-3 text-sky-300" />
                <span>{contextNote}</span>
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-black uppercase tracking-wider shadow-xs ${styling.badgeBg}`}
            >
              <span>{badgeEmoji}</span>
              <span>{scoreRangeLabel}</span>
            </span>
          </div>
        </div>

        {/* Middle: Reaction Dialogue Box */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Quote className="h-6 w-6 text-white/30 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="text-lg sm:text-2xl font-bold tracking-tight text-white leading-snug">
                "{reaction}"
              </p>
              <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <span>— Mishra Ji</span>
                <span className="text-slate-600">•</span>
                <span className={styling.accentText}>{headline}</span>
              </p>
            </div>
          </div>

          {/* Motivational Quote (if present) */}
          {quote && (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-xs flex items-center gap-2 text-xs text-slate-300 italic">
              <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>"{quote}"</span>
            </div>
          )}
        </div>

        {/* Action Suggestion & Interactive Shortcuts */}
        <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {actionSuggestion ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Compass className="h-4 w-4 text-indigo-400 shrink-0" />
              <span>
                <strong className="text-white font-bold">Mishra Ji's Advice:</strong>{" "}
                {actionSuggestion}
              </span>
            </div>
          ) : (
            <div />
          )}

          {showActions && (
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              {onAskMishraJi && (
                <button
                  type="button"
                  onClick={onAskMishraJi}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 text-xs font-bold transition shadow-lg shadow-indigo-600/30 active:scale-95"
                >
                  <BotMessageSquare className="h-3.5 w-3.5" />
                  <span>Talk with Mishra Ji</span>
                </button>
              )}
              {onRetake && (
                <button
                  type="button"
                  onClick={onRetake}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-slate-200 px-3.5 py-2.5 text-xs font-bold transition active:scale-95"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Retake</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MishraJiScoreReactionBanner;
