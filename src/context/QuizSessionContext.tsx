import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { QuizData, QuizResult, QuizTerminationReason, ActiveQuizSession, NavigationTab } from "../types";
import { useData } from "./DataContext";
import { useAuth } from "./AuthContext";
import { gameShowAudio } from "../utils/gameShowAudio";
import confetti from "canvas-confetti";

interface QuizSessionContextType {
  activeSession: ActiveQuizSession | null;
  isQuizActive: boolean;
  isPreparing: boolean;
  isTerminal: boolean;
  leaveWarningModalOpen: boolean;
  pendingNavTab: NavigationTab | null;
  startPreparation: (quiz: QuizData, durationMinutes?: number) => void;
  startActiveQuiz: () => void;
  selectOption: (questionId: number, optionIndex: number) => void;
  lockAnswer: (questionId: number) => void;
  nextQuestion: () => void;
  submitQuiz: (reason: QuizTerminationReason) => Promise<QuizResult | null>;
  cancelLeaving: () => void;
  confirmLeaving: () => Promise<void>;
  requestTabNavigation: (tab: NavigationTab, onAllowed: () => void) => void;
  dismissResult: () => void;
  retakeQuiz: () => void;
}

const QuizSessionContext = createContext<QuizSessionContextType | undefined>(undefined);

const STORAGE_KEY = "studypilot_active_quiz_session";

export const QuizSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { saveQuizResult } = useData();
  const { user, recordStudySession } = useAuth();

  const [activeSession, setActiveSession] = useState<ActiveQuizSession | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ActiveQuizSession;
        // If restored from storage and it was active, check integrity
        if (parsed.status === "active") {
          const elapsedSinceStart = Math.floor((Date.now() - parsed.startTime) / 1000);
          const remaining = parsed.totalDurationSeconds - elapsedSinceStart;
          if (remaining <= 0) {
            parsed.timeRemainingSeconds = 0;
            parsed.status = "terminal";
            parsed.terminationReason = "time_expired";
          } else {
            parsed.timeRemainingSeconds = remaining;
          }
        }
        return parsed;
      }
    } catch (e) {
      console.warn("Error restoring quiz session:", e);
    }
    return null;
  });

  const [leaveWarningModalOpen, setLeaveWarningModalOpen] = useState(false);
  const [pendingNavTab, setPendingNavTab] = useState<NavigationTab | null>(null);
  const pendingNavCallbackRef = useRef<(() => void) | null>(null);

  // Sync to local storage for crash/reload resilience
  useEffect(() => {
    if (activeSession) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(activeSession));
      } catch (e) {}
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [activeSession]);

  const isQuizActive = activeSession?.status === "active";
  const isPreparing = activeSession?.status === "preparing";
  const isTerminal = activeSession?.status === "terminal";

  // Calculate default quiz duration: ~30 seconds per question, min 2 mins, max 15 mins
  const calculateDefaultDurationSeconds = (questionCount: number): number => {
    if (questionCount <= 5) return 3 * 60; // 3 mins for 5 Qs
    if (questionCount <= 10) return 5 * 60; // 5 mins for 10 Qs
    return Math.min(questionCount * 35, 15 * 60);
  };

  // Start preparation screen
  const startPreparation = useCallback((quiz: QuizData, durationMinutes?: number) => {
    const totalSeconds = durationMinutes ? durationMinutes * 60 : calculateDefaultDurationSeconds(quiz.questions.length);
    const newSession: ActiveQuizSession = {
      sessionId: `session_${Date.now()}`,
      quiz,
      currentQuestionIndex: 0,
      selectedAnswers: {},
      lockedAnswers: {},
      startTime: Date.now(),
      totalDurationSeconds: totalSeconds,
      timeRemainingSeconds: totalSeconds,
      status: "preparing",
    };
    setActiveSession(newSession);
    setLeaveWarningModalOpen(false);
    setPendingNavTab(null);
  }, []);

  // Enter active game-show arena
  const startActiveQuiz = useCallback(() => {
    setActiveSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        status: "active",
        startTime: Date.now(),
        timeRemainingSeconds: prev.totalDurationSeconds,
      };
    });
  }, []);

  // Option selection
  const selectOption = useCallback((questionId: number, optionIndex: number) => {
    setActiveSession((prev) => {
      if (!prev || prev.status !== "active") return prev;
      // Cannot change if already locked
      if (prev.lockedAnswers[questionId] !== undefined) return prev;
      gameShowAudio.playSelectOption();
      return {
        ...prev,
        selectedAnswers: {
          ...prev.selectedAnswers,
          [questionId]: optionIndex,
        },
      };
    });
  }, []);

  // Lock answer
  const lockAnswer = useCallback((questionId: number) => {
    setActiveSession((prev) => {
      if (!prev || prev.status !== "active") return prev;
      const selected = prev.selectedAnswers[questionId];
      if (selected === undefined) return prev;

      gameShowAudio.playLockAnswer();
      const updatedLocked = {
        ...prev.lockedAnswers,
        [questionId]: selected,
      };

      return {
        ...prev,
        lockedAnswers: updatedLocked,
      };
    });
  }, []);

  // Advance question
  const nextQuestion = useCallback(() => {
    setActiveSession((prev) => {
      if (!prev || prev.status !== "active") return prev;
      const nextIdx = prev.currentQuestionIndex + 1;
      if (nextIdx < prev.quiz.questions.length) {
        return {
          ...prev,
          currentQuestionIndex: nextIdx,
        };
      }
      return prev;
    });
  }, []);

  // Submit Quiz (Finalize session)
  const submitQuiz = useCallback(
    async (reason: QuizTerminationReason): Promise<QuizResult | null> => {
      if (!activeSession || !activeSession.quiz) return null;

      const quiz = activeSession.quiz;
      const timeSpent = Math.max(
        1,
        activeSession.totalDurationSeconds - activeSession.timeRemainingSeconds
      );

      let correctCount = 0;
      let incorrectCount = 0;
      let unansweredCount = 0;

      const answersBreakdown = quiz.questions.map((q) => {
        // Locked answer takes precedence, then selected
        const selected = activeSession.lockedAnswers[q.id] ?? activeSession.selectedAnswers[q.id] ?? -1;
        if (selected === -1) {
          unansweredCount++;
          return {
            questionId: q.id,
            selectedOptionIndex: -1,
            isCorrect: false,
          };
        }
        const isCorrect = selected === q.correctOptionIndex;
        if (isCorrect) {
          correctCount++;
        } else {
          incorrectCount++;
        }
        return {
          questionId: q.id,
          selectedOptionIndex: selected,
          isCorrect,
        };
      });

      const score = correctCount;
      const totalQuestions = quiz.questions.length;
      const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

      // Sound & celebration handling
      if (reason === "completed") {
        if (percentage >= 70) {
          gameShowAudio.playVictoryFanfare();
          try {
            confetti({
              particleCount: 100,
              spread: 80,
              origin: { y: 0.6 },
            });
          } catch (e) {}
        } else {
          gameShowAudio.playLockAnswer();
        }
      } else if (reason === "time_expired") {
        gameShowAudio.playTimeExpired();
      } else if (reason === "left_quiz") {
        gameShowAudio.playEarlyLeaveAlert();
      }

      let savedResult: QuizResult;
      try {
        savedResult = await saveQuizResult({
          quizId: quiz.id,
          quizTitle: quiz.title,
          subject: quiz.subject,
          topic: quiz.topic,
          difficulty: quiz.difficulty,
          score,
          totalQuestions,
          percentage,
          correctCount,
          incorrectCount,
          unansweredCount,
          answers: answersBreakdown,
          timeSpentSeconds: timeSpent,
          terminationReason: reason,
        });

        // Record active study minutes
        const studyMins = Math.max(Math.ceil(timeSpent / 60), 2);
        await recordStudySession(studyMins).catch(() => {});
      } catch (err) {
        console.warn("Quiz result save fallback:", err);
        savedResult = {
          id: `res_local_${Date.now()}`,
          userId: user?.uid || "guest",
          quizId: quiz.id,
          quizTitle: quiz.title,
          subject: quiz.subject,
          topic: quiz.topic,
          difficulty: quiz.difficulty,
          score,
          totalQuestions,
          percentage,
          correctCount,
          incorrectCount,
          unansweredCount,
          answers: answersBreakdown,
          timeSpentSeconds: timeSpent,
          completedAt: Date.now(),
          terminationReason: reason,
        };
      }

      setActiveSession({
        ...activeSession,
        status: "terminal",
        terminationReason: reason,
        result: savedResult,
      });

      return savedResult;
    },
    [activeSession, saveQuizResult, recordStudySession, user]
  );

  // Countdown timer effect
  useEffect(() => {
    if (!isQuizActive || !activeSession) return;

    const interval = setInterval(() => {
      setActiveSession((prev) => {
        if (!prev || prev.status !== "active") return prev;
        const newRemaining = prev.timeRemainingSeconds - 1;

        // Audio countdown alerts
        if (newRemaining <= 10 && newRemaining > 0) {
          gameShowAudio.playCountdownTick(newRemaining);
        }

        if (newRemaining <= 0) {
          clearInterval(interval);
          // Trigger auto-submit for time expired
          setTimeout(() => {
            submitQuiz("time_expired");
          }, 50);
          return {
            ...prev,
            timeRemainingSeconds: 0,
          };
        }

        return {
          ...prev,
          timeRemainingSeconds: newRemaining,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isQuizActive, submitQuiz]);

  // Quiz Integrity System: Listen for visibility changes, window blur, and tab switching
  useEffect(() => {
    if (!isQuizActive) return;

    let hasTriggered = false;

    const handleEarlyLeave = () => {
      if (hasTriggered) return;
      hasTriggered = true;
      console.warn("[Quiz Integrity] Browser visibility changed or window blurred during active quiz. Enforcing auto-submission.");
      submitQuiz("left_quiz");
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleEarlyLeave();
      }
    };

    const handleWindowBlur = () => {
      // In web applets / dev environments, check document.activeElement before immediate blur submit
      if (document.visibilityState === "hidden") {
        handleEarlyLeave();
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Leaving now will automatically submit your quiz responses.";
      submitQuiz("left_quiz");
      return e.returnValue;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isQuizActive, submitQuiz]);

  // Request Tab Navigation interception
  const requestTabNavigation = useCallback(
    (tab: NavigationTab, onAllowed: () => void) => {
      if (isQuizActive) {
        setPendingNavTab(tab);
        pendingNavCallbackRef.current = onAllowed;
        setLeaveWarningModalOpen(true);
      } else {
        onAllowed();
      }
    },
    [isQuizActive]
  );

  const cancelLeaving = useCallback(() => {
    setLeaveWarningModalOpen(false);
    setPendingNavTab(null);
    pendingNavCallbackRef.current = null;
  }, []);

  const confirmLeaving = useCallback(async () => {
    setLeaveWarningModalOpen(false);
    await submitQuiz("left_quiz");
    if (pendingNavCallbackRef.current) {
      pendingNavCallbackRef.current();
      pendingNavCallbackRef.current = null;
    }
    setPendingNavTab(null);
  }, [submitQuiz]);

  // Dismiss result & unlock quizzes
  const dismissResult = useCallback(() => {
    setActiveSession(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }, []);

  // Retake quiz
  const retakeQuiz = useCallback(() => {
    if (activeSession?.quiz) {
      startPreparation(activeSession.quiz);
    }
  }, [activeSession, startPreparation]);

  return (
    <QuizSessionContext.Provider
      value={{
        activeSession,
        isQuizActive,
        isPreparing,
        isTerminal,
        leaveWarningModalOpen,
        pendingNavTab,
        startPreparation,
        startActiveQuiz,
        selectOption,
        lockAnswer,
        nextQuestion,
        submitQuiz,
        cancelLeaving,
        confirmLeaving,
        requestTabNavigation,
        dismissResult,
        retakeQuiz,
      }}
    >
      {children}
    </QuizSessionContext.Provider>
  );
};

export const useQuizSession = () => {
  const context = useContext(QuizSessionContext);
  if (!context) {
    throw new Error("useQuizSession must be used within a QuizSessionProvider");
  }
  return context;
};
