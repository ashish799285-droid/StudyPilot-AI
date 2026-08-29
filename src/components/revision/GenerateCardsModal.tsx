import React, { useState } from "react";
import { useData } from "../../context/DataContext";
import { api } from "../../services/api";
import { RevisionCardSource } from "../../types";
import {
  X,
  Sparkles,
  Layers,
  FileText,
  CalendarDays,
  BotMessageSquare,
  Check,
  Edit2,
  Trash2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface GenerateCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTopic?: string;
  defaultSubject?: string;
  defaultContextText?: string;
  defaultSourceName?: string;
  defaultSourceType?: RevisionCardSource["type"];
}

interface DraftCard {
  selected: boolean;
  question: string;
  answer: string;
  explanation?: string;
  example?: string;
  keyTakeaway?: string;
  difficultyLevel?: "Beginner" | "Intermediate" | "Advanced";
}

export const GenerateCardsModal: React.FC<GenerateCardsModalProps> = ({
  isOpen,
  onClose,
  defaultTopic = "",
  defaultSubject = "Computer Science",
  defaultContextText = "",
  defaultSourceName = "Custom Study Topic",
  defaultSourceType = "custom",
}) => {
  const { saveRevisionCards, revisionCards, notes, activePlan } = useData();

  const [subject, setSubject] = useState<string>(defaultSubject);
  const [topic, setTopic] = useState<string>(defaultTopic);
  const [contextText, setContextText] = useState<string>(defaultContextText);
  const [customInstructions, setCustomInstructions] = useState<string>("");
  const [cardCount, setCardCount] = useState<number>(5);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Preview / Editable Draft Cards
  const [draftCards, setDraftCards] = useState<DraftCard[]>([]);
  const [step, setStep] = useState<"configure" | "preview">("configure");

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() && !contextText.trim()) {
      setErrorMessage("Please specify a topic or provide study notes.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      // Gather existing questions to prevent duplicates
      const existingQuestions = revisionCards
        .filter((c) => c.subject.toLowerCase() === subject.toLowerCase() || c.topic.toLowerCase() === topic.toLowerCase())
        .map((c) => c.question);

      const generated = await api.generateRevisionCards({
        subject: subject.trim(),
        topic: topic.trim(),
        contextText: contextText.trim(),
        sourceName: defaultSourceName,
        sourceType: defaultSourceType,
        customInstructions: customInstructions.trim(),
        existingQuestions,
        count: cardCount,
      });

      if (!generated || generated.length === 0) {
        throw new Error("No cards were generated. Please refine your topic and try again.");
      }

      setDraftCards(
        generated.map((c) => ({
          selected: true,
          question: c.question,
          answer: c.answer,
          explanation: c.explanation,
          example: c.example,
          keyTakeaway: c.keyTakeaway,
          difficultyLevel: c.difficultyLevel || "Intermediate",
        }))
      );

      setStep("preview");
    } catch (err: any) {
      console.error("Card generation failed:", err);
      setErrorMessage(err?.message || "Failed to generate revision cards. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDrafts = async () => {
    const selectedDrafts = draftCards.filter((d) => d.selected);
    if (selectedDrafts.length === 0) {
      setErrorMessage("Please select at least one card to save.");
      return;
    }

    try {
      const cardsToSave = selectedDrafts.map((d) => ({
        subject: subject.trim() || "General",
        topic: topic.trim() || "Core Concepts",
        question: d.question.trim(),
        answer: d.answer.trim(),
        explanation: d.explanation?.trim(),
        example: d.example?.trim(),
        keyTakeaway: d.keyTakeaway?.trim(),
        difficultyLevel: d.difficultyLevel || "Intermediate",
        source: {
          type: defaultSourceType || "custom",
          name: defaultSourceName || "Generated from AI",
        },
        status: "Developing" as const,
        repetitionIntervalDays: 1,
        easeFactor: 2.5,
        consecutiveCorrect: 0,
        consecutiveIncorrect: 0,
        totalReviews: 0,
        successfulRecalls: 0,
        incorrectRecalls: 0,
        nextReviewDate: new Date().toISOString().split("T")[0],
        nextReviewTimestamp: Date.now(),
        priorityScore: 60,
        isHidden: false,
        isMastered: false,
      }));

      await saveRevisionCards(cardsToSave);
      onClose();
    } catch (err: any) {
      console.error("Failed to save draft cards:", err);
      setErrorMessage(err?.message || "Failed to save cards.");
    }
  };

  const handleUseNoteContext = (noteContent: string, noteTopic: string, noteSubject: string) => {
    setTopic(noteTopic);
    setSubject(noteSubject);
    setContextText(noteContent);
  };

  return (
    <div
      id="generate-cards-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 sm:p-6 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                {step === "configure" ? "AI Spaced Revision Card Generator" : "Review & Customize Generated Cards"}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {step === "configure"
                  ? "Transforms study notes and concepts into atomic active-recall cards"
                  : `Select and tweak cards before adding to your spaced repetition queue (${draftCards.filter((d) => d.selected).length} selected)`}
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {errorMessage && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {step === "configure" ? (
            <form onSubmit={handleGenerate} className="space-y-5">
              {/* Quick source selector chips if user has notes */}
              {notes.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    QUICK IMPORT FROM REVISION NOTES
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {notes.slice(0, 3).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => handleUseNoteContext(n.content, n.topic, n.subject)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <FileText className="h-3 w-3" />
                        <span className="truncate max-w-[180px]">{n.topic}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Subject Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                    Subject / Field
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Computer Science, Organic Chemistry"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600 bg-slate-50/50"
                  />
                </div>

                {/* Topic Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                    Core Topic / Concept
                  </label>
                  <input
                    type="text"
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Database Normalization & Indexing"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Study Notes Context Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                  Optional Study Notes / Text Material
                </label>
                <textarea
                  rows={4}
                  value={contextText}
                  onChange={(e) => setContextText(e.target.value)}
                  placeholder="Paste lecture notes, summary text, or excerpt. The generator will create atomic active-recall prompts strictly based on this content."
                  className="w-full rounded-xl border border-slate-200 p-3.5 text-sm font-medium text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600 bg-slate-50/50 leading-relaxed resize-none"
                />
              </div>

              {/* Custom Instructions */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                  Custom Generation Directives (Optional)
                </label>
                <input
                  type="text"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. 'Focus on edge cases and mechanisms', 'Include mathematical formula derivations'"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600 bg-slate-50/50"
                />
              </div>

              {/* Card Count Selector */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Number of Cards to Generate
                </label>
                <div className="flex items-center gap-2">
                  {[3, 5, 8].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCardCount(num)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                        cardCount === num
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {num} Cards
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-indigo-700 active:scale-[0.99] transition shadow-md shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{isLoading ? "Synthesizing Retrieval Cards..." : "Generate Active Recall Cards"}</span>
                </button>
              </div>
            </form>
          ) : (
            /* Preview Step */
            <div className="space-y-4">
              <div className="space-y-4">
                {draftCards.map((draft, idx) => (
                  <div
                    key={idx}
                    className={`rounded-2xl border p-4 transition-all ${
                      draft.selected
                        ? "border-indigo-200 bg-indigo-50/30"
                        : "border-slate-200 bg-slate-50/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={draft.selected}
                          onChange={(e) => {
                            const updated = [...draftCards];
                            updated[idx].selected = e.target.checked;
                            setDraftCards(updated);
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                        />
                        <span className="text-xs font-black uppercase text-indigo-700">Card #{idx + 1}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {draft.difficultyLevel || "Intermediate"}
                      </span>
                    </div>

                    {/* Question Input */}
                    <div className="space-y-2 mt-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Question / Prompt
                        </label>
                        <input
                          type="text"
                          value={draft.question}
                          onChange={(e) => {
                            const updated = [...draftCards];
                            updated[idx].question = e.target.value;
                            setDraftCards(updated);
                          }}
                          className="w-full rounded-lg border border-slate-200 p-2 text-sm font-bold text-slate-900 bg-white"
                        />
                      </div>

                      {/* Answer Input */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Concise Answer
                        </label>
                        <textarea
                          rows={2}
                          value={draft.answer}
                          onChange={(e) => {
                            const updated = [...draftCards];
                            updated[idx].answer = e.target.value;
                            setDraftCards(updated);
                          }}
                          className="w-full rounded-lg border border-slate-200 p-2 text-xs font-medium text-slate-800 bg-white leading-relaxed resize-none"
                        />
                      </div>

                      {draft.keyTakeaway && (
                        <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-100">
                          🎯 Takeaway: {draft.keyTakeaway}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Strip */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep("configure")}
                  className="px-5 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition"
                >
                  ← Back to Config
                </button>
                <button
                  type="button"
                  onClick={handleSaveDrafts}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-indigo-700 transition shadow-md shadow-indigo-100 flex items-center justify-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  <span>Save {draftCards.filter((d) => d.selected).length} Cards to Deck</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
