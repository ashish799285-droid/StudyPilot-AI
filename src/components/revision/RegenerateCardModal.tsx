import React, { useState } from "react";
import { RevisionCard } from "../../types";
import { useData } from "../../context/DataContext";
import { api } from "../../services/api";
import { X, Sparkles, Check, ArrowRight, RotateCw, AlertCircle } from "lucide-react";

interface RegenerateCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: RevisionCard | null;
}

export const RegenerateCardModal: React.FC<RegenerateCardModalProps> = ({
  isOpen,
  onClose,
  card,
}) => {
  const { updateRevisionCard, revisionCards } = useData();

  const [customInstructions, setCustomInstructions] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [regeneratedCard, setRegeneratedCard] = useState<{
    question: string;
    answer: string;
    explanation?: string;
    example?: string;
    keyTakeaway?: string;
    difficultyLevel?: "Beginner" | "Intermediate" | "Advanced";
  } | null>(null);

  if (!isOpen || !card) return null;

  const handleRegenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const existingQuestions = revisionCards
        .filter((c) => c.id !== card.id && c.subject === card.subject)
        .map((c) => c.question);

      const result = await api.regenerateRevisionCard({
        card: {
          subject: card.subject,
          topic: card.topic,
          question: card.question,
          answer: card.answer,
        },
        customInstructions: customInstructions.trim(),
        existingQuestions,
      });

      if (!result) {
        throw new Error("Failed to receive regenerated card from AI.");
      }

      setRegeneratedCard(result);
    } catch (err: any) {
      console.error("Failed to regenerate card:", err);
      setErrorMessage(err?.message || "Failed to regenerate card.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (!regeneratedCard || !card) return;

    try {
      await updateRevisionCard(card.id, {
        question: regeneratedCard.question,
        answer: regeneratedCard.answer,
        explanation: regeneratedCard.explanation || card.explanation,
        example: regeneratedCard.example || card.example,
        keyTakeaway: regeneratedCard.keyTakeaway || card.keyTakeaway,
        difficultyLevel: regeneratedCard.difficultyLevel || card.difficultyLevel,
        status: "Developing",
        repetitionIntervalDays: 1,
        consecutiveCorrect: 0,
        nextReviewDate: new Date().toISOString().split("T")[0],
        nextReviewTimestamp: Date.now(),
        priorityScore: 60,
      });

      onClose();
    } catch (err: any) {
      setErrorMessage("Failed to apply regenerated card updates.");
    }
  };

  return (
    <div
      id="regenerate-card-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 sm:p-6 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                AI Card Regeneration
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {card.subject} • {card.topic}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5">
          {errorMessage && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Current Card Preview */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              CURRENT QUESTION & ANSWER
            </p>
            <p className="text-sm font-bold text-slate-800">{card.question}</p>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">{card.answer}</p>
          </div>

          {/* Custom Instruction Prompt */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
              Regeneration Instructions (Optional)
            </label>
            <input
              type="text"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g. 'Make question more challenging', 'Test clinical mechanism', 'Simpler intuition'"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600 bg-slate-50/50"
            />
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-2">
            {[
              "Make it more challenging",
              "Provide a simpler intuitive example",
              "Focus on common exam pitfalls",
              "Test formula / calculation",
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setCustomInstructions(preset)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-xs font-bold transition"
              >
                + {preset}
              </button>
            ))}
          </div>

          {/* Generate Button */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleRegenerate()}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-indigo-700 active:scale-[0.99] transition shadow-md shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isLoading ? "Regenerating Card with Gemini..." : "Generate New Version"}</span>
          </button>

          {/* Regenerated Version Preview */}
          {regeneratedCard && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 sm:p-5 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">
                  REGENERATED ACTIVE RECALL CARD
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                  {regeneratedCard.difficultyLevel || "Intermediate"}
                </span>
              </div>

              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Question</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{regeneratedCard.question}</p>
              </div>

              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Answer</p>
                <p className="text-xs font-medium text-slate-700 mt-0.5 leading-relaxed">
                  {regeneratedCard.answer}
                </p>
              </div>

              {regeneratedCard.keyTakeaway && (
                <p className="text-xs font-bold text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                  🎯 Anchor: {regeneratedCard.keyTakeaway}
                </p>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleApply}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-indigo-700 transition shadow-xs flex items-center justify-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  <span>Accept & Update Card in Deck</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
