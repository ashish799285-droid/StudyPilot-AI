import React, { useState, useEffect } from "react";
import { RevisionCard } from "../../types";
import { useData } from "../../context/DataContext";
import { X, Check, Trash2, RotateCw, AlertCircle, Edit3 } from "lucide-react";

interface EditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardToEdit?: RevisionCard | null;
  defaultSubject?: string;
  defaultTopic?: string;
}

export const EditCardModal: React.FC<EditCardModalProps> = ({
  isOpen,
  onClose,
  cardToEdit,
  defaultSubject = "Computer Science",
  defaultTopic = "",
}) => {
  const { updateRevisionCard, saveRevisionCards, deleteRevisionCard } = useData();

  const [subject, setSubject] = useState<string>(defaultSubject);
  const [topic, setTopic] = useState<string>(defaultTopic);
  const [question, setQuestion] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [explanation, setExplanation] = useState<string>("");
  const [example, setExample] = useState<string>("");
  const [keyTakeaway, setKeyTakeaway] = useState<string>("");
  const [difficultyLevel, setDifficultyLevel] = useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate");
  const [resetStats, setResetStats] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (cardToEdit) {
      setSubject(cardToEdit.subject || "");
      setTopic(cardToEdit.topic || "");
      setQuestion(cardToEdit.question || "");
      setAnswer(cardToEdit.answer || "");
      setExplanation(cardToEdit.explanation || "");
      setExample(cardToEdit.example || "");
      setKeyTakeaway(cardToEdit.keyTakeaway || "");
      setDifficultyLevel(cardToEdit.difficultyLevel || "Intermediate");
      setResetStats(false);
    } else {
      setSubject(defaultSubject);
      setTopic(defaultTopic);
      setQuestion("");
      setAnswer("");
      setExplanation("");
      setExample("");
      setKeyTakeaway("");
      setDifficultyLevel("Intermediate");
      setResetStats(false);
    }
    setErrorMessage("");
  }, [cardToEdit, defaultSubject, defaultTopic, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
      setErrorMessage("Please provide both a retrieval question and an answer.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      if (cardToEdit) {
        // Update existing card
        const updates: Partial<RevisionCard> = {
          subject: subject.trim() || "General",
          topic: topic.trim() || "Core Concepts",
          question: question.trim(),
          answer: answer.trim(),
          explanation: explanation.trim() || undefined,
          example: example.trim() || undefined,
          keyTakeaway: keyTakeaway.trim() || undefined,
          difficultyLevel,
        };

        if (resetStats) {
          updates.status = "Developing";
          updates.repetitionIntervalDays = 1;
          updates.easeFactor = 2.5;
          updates.consecutiveCorrect = 0;
          updates.consecutiveIncorrect = 0;
          updates.totalReviews = 0;
          updates.successfulRecalls = 0;
          updates.incorrectRecalls = 0;
          updates.nextReviewDate = new Date().toISOString().split("T")[0];
          updates.nextReviewTimestamp = Date.now();
          updates.priorityScore = 60;
          updates.isMastered = false;
        }

        await updateRevisionCard(cardToEdit.id, updates);
      } else {
        // Create new card
        await saveRevisionCards([
          {
            subject: subject.trim() || "General",
            topic: topic.trim() || "Core Concepts",
            question: question.trim(),
            answer: answer.trim(),
            explanation: explanation.trim() || undefined,
            example: example.trim() || undefined,
            keyTakeaway: keyTakeaway.trim() || undefined,
            difficultyLevel,
            source: { type: "custom", name: "Manual Card Creation" },
            status: "Developing",
            repetitionIntervalDays: 1,
            easeFactor: 2.5,
            consecutiveCorrect: 0,
            consecutiveIncorrect: 0,
            totalReviews: 0,
            successfulRecalls: 0,
            incorrectRecalls: 0,
            nextReviewDate: new Date().toISOString().split("T")[0],
            nextReviewTimestamp: Date.now(),
            priorityScore: 50,
            isHidden: false,
            isMastered: false,
          },
        ]);
      }

      onClose();
    } catch (err: any) {
      console.error("Failed to save card:", err);
      setErrorMessage(err?.message || "Failed to save card.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!cardToEdit) return;
    try {
      await deleteRevisionCard(cardToEdit.id);
      onClose();
    } catch (err: any) {
      setErrorMessage("Failed to delete card.");
    }
  };

  return (
    <div
      id="edit-card-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 sm:p-6 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                {cardToEdit ? "Edit Revision Card" : "Create New Revision Card"}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {cardToEdit ? "Fine-tune question, answer, and memory cues" : "Add an atomic active-recall card to your deck"}
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

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5">
          {errorMessage && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                Subject
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Organic Chemistry"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600 bg-slate-50/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                Topic
              </label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. SN1 vs SN2 Mechanisms"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Question / Retrieval Prompt */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
              Retrieval Question (Front)
            </label>
            <textarea
              rows={3}
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Crisp, direct question that prompts active retrieval..."
              className="w-full rounded-xl border border-slate-200 p-3.5 text-sm font-bold text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600 bg-slate-50/50 leading-relaxed resize-none"
            />
          </div>

          {/* Answer */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
              Concise Direct Answer (Back)
            </label>
            <textarea
              rows={3}
              required
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Direct, accurate answer (1-3 sentences)..."
              className="w-full rounded-xl border border-slate-200 p-3.5 text-sm font-medium text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600 bg-slate-50/50 leading-relaxed resize-none"
            />
          </div>

          {/* Explanation & Example Collapsible / Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                Conceptual Explanation (Optional)
              </label>
              <textarea
                rows={2}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Intuition or 'why' behind the concept..."
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600 bg-slate-50/50 leading-relaxed resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                Concrete Example (Optional)
              </label>
              <textarea
                rows={2}
                value={example}
                onChange={(e) => setExample(e.target.value)}
                placeholder="Specific academic or real-world example..."
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600 bg-slate-50/50 leading-relaxed resize-none"
              />
            </div>
          </div>

          {/* Key Takeaway */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
              Memory Anchor / Takeaway (Optional)
            </label>
            <input
              type="text"
              value={keyTakeaway}
              onChange={(e) => setKeyTakeaway(e.target.value)}
              placeholder="Short one-line memory hook..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600 bg-slate-50/50"
            />
          </div>

          {/* Difficulty Level & Reset Stats */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Difficulty:</span>
              {(["Beginner", "Intermediate", "Advanced"] as const).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficultyLevel(diff)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    difficultyLevel === diff
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>

            {cardToEdit && (
              <label className="flex items-center gap-2 text-xs font-bold text-amber-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetStats}
                  onChange={(e) => setResetStats(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span>Reset spaced repetition history</span>
              </label>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
            {cardToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-3 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-indigo-700 transition shadow-md shadow-indigo-100 flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                <span>{cardToEdit ? "Update Card" : "Save Card"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
