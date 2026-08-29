import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import {
  ActiveTimerSession,
  StudySessionRecord,
  TimerMode,
  TimerState,
  FocusRecommendation,
} from "../types";
import { useAuth } from "./AuthContext";
import { useData } from "./DataContext";
import { db } from "../services/firebaseConfig";
import { cleanFirestoreData } from "../utils/firestoreSanitizer";
import {
  calculateFocusRecommendation,
  getRandomMicroTip,
  playChime,
  BREAK_MICRO_TIPS,
} from "../utils/pomodoroEngine";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

interface PendingTimerSetup {
  subject: string;
  topic: string;
  taskTitle?: string;
  planId?: string;
  taskId?: string;
  taskDurationMinutes?: number;
  priority?: "High" | "Medium" | "Low";
}

interface TimerContextType {
  // Session history
  studySessions: StudySessionRecord[];
  activeSession: ActiveTimerSession | null;
  pendingSetup: PendingTimerSetup | null;
  setPendingSetup: (setup: PendingTimerSetup | null) => void;
  
  // Timer State & Controls
  timerMode: TimerMode;
  timerState: TimerState;
  timeRemainingSeconds: number;
  totalFocusedSeconds: number;
  isSoundEnabled: boolean;
  toggleSound: () => void;
  currentMicroTip: typeof BREAK_MICRO_TIPS[0];
  rotateMicroTip: () => void;
  
  // Operations
  startFocusSession: (params: {
    subject: string;
    topic: string;
    durationMinutes: number;
    breakMinutes?: number;
    taskTitle?: string;
    planId?: string;
    taskId?: string;
    reason?: string;
  }) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endFocusSession: (options?: { markTaskCompleted?: boolean; notes?: string }) => Promise<StudySessionRecord | null>;
  cancelSession: () => Promise<void>;
  startBreakSession: (customBreakMinutes?: number) => void;
  skipBreak: () => void;
  startNextSession: (newSubject?: string, newTopic?: string) => void;
  resetTimer: () => void;
  deleteSessionRecord: (id: string) => Promise<void>;
  
  // AI Recommendation Helper
  getRecommendation: (params: {
    subject?: string;
    topic?: string;
    taskType?: string;
    taskDurationMinutes?: number;
    priority?: "High" | "Medium" | "Low";
  }) => FocusRecommendation;
  
  // Daily Summary Telemetry
  todaySummary: {
    totalSessions: number;
    totalFocusedMinutes: number;
    completedCount: number;
    uniqueTopics: string[];
    topSubject: string;
  };
}

const LOCAL_STORAGE_TIMER_KEY = "studypilot_active_timer_v1";
const LOCAL_STORAGE_SOUND_KEY = "studypilot_timer_sound_v1";

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, recordStudySession } = useAuth();
  const { activePlan, toggleTaskCompletion } = useData();
  const userId = user?.uid;

  const [studySessions, setStudySessions] = useState<StudySessionRecord[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveTimerSession | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_TIMER_KEY);
      if (saved) {
        const parsed: ActiveTimerSession = JSON.parse(saved);
        // Calculate elapsed time if it was running
        if (parsed.state === "running") {
          const now = Date.now();
          const remaining = Math.max(0, Math.ceil((parsed.targetEndTime - now) / 1000));
          const elapsedSinceLastTick = Math.max(0, Math.floor((now - parsed.lastTickTime) / 1000));
          const updatedTotalFocused = parsed.mode === "focus"
            ? (parsed.totalFocusedSeconds || 0) + elapsedSinceLastTick
            : (parsed.totalFocusedSeconds || 0);

          if (remaining <= 0) {
            return {
              ...parsed,
              state: "completed",
              timeRemainingSeconds: 0,
              totalFocusedSeconds: updatedTotalFocused,
            };
          }
          return {
            ...parsed,
            timeRemainingSeconds: remaining,
            totalFocusedSeconds: updatedTotalFocused,
            lastTickTime: now,
          };
        }
        return parsed;
      }
    } catch (e) {
      console.warn("Could not restore timer from localStorage:", e);
    }
    return null;
  });

  const [pendingSetup, setPendingSetup] = useState<PendingTimerSetup | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem(LOCAL_STORAGE_SOUND_KEY) !== "false";
  });
  const [currentMicroTip, setCurrentMicroTip] = useState(() => getRandomMicroTip());

  // Prevent duplicate concurrent database writes
  const isSavingRef = useRef<boolean>(false);

  // Firestore Real-time listener for study session history
  useEffect(() => {
    if (!userId || !db) {
      setStudySessions([]);
      return;
    }

    const sessionsQuery = query(collection(db, "studySessions"), where("userId", "==", userId));
    const unsubscribe = onSnapshot(
      sessionsQuery,
      async (snapshot) => {
        if (snapshot.empty) {
          const seededKey = `studypilot_timer_seeded_${userId}`;
          if (!localStorage.getItem(seededKey)) {
            localStorage.setItem(seededKey, "true");
            const todayStr = new Date().toISOString().split("T")[0];
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split("T")[0];

            const seed1Id = `session_${Date.now()}_1`;
            const seed2Id = `session_${Date.now()}_2`;

            const seed1: StudySessionRecord = {
              id: seed1Id,
              userId,
              subject: "Organic Chemistry",
              topic: "SN1 vs SN2 Reaction Mechanisms",
              taskTitle: "Review SN1/SN2 Reaction Mechanisms & Energy Diagrams",
              plannedDurationMinutes: 45,
              actualDurationMinutes: 45,
              status: "Completed",
              date: todayStr,
              startedAt: Date.now() - 3600000 * 2,
              completedAt: Date.now() - 3600000 * 2 + 45 * 60000,
              notes: "Mastered the 4 primary factors determining substitution pathways.",
            };

            const seed2: StudySessionRecord = {
              id: seed2Id,
              userId,
              subject: "Computer Science",
              topic: "Binary Search Trees & AVL Balances",
              taskTitle: "Binary Search Trees, Rotations & AVL Tree Balances",
              plannedDurationMinutes: 50,
              actualDurationMinutes: 48,
              status: "Completed",
              date: yesterdayStr,
              startedAt: Date.now() - 86400000,
              completedAt: Date.now() - 86400000 + 48 * 60000,
              notes: "Walked through LL, RR, LR, RL rotation invariant rules.",
            };

            await setDoc(doc(db, "studySessions", seed1Id), cleanFirestoreData(seed1)).catch(() => {});
            await setDoc(doc(db, "studySessions", seed2Id), cleanFirestoreData(seed2)).catch(() => {});
          } else {
            setStudySessions([]);
          }
        } else {
          const loaded: StudySessionRecord[] = [];
          snapshot.forEach((snap) => loaded.push(snap.data() as StudySessionRecord));
          loaded.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
          setStudySessions(loaded);
        }
      },
      (error) => {
        console.warn("Study sessions listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Persist active timer to localStorage whenever updated
  useEffect(() => {
    try {
      if (activeSession) {
        localStorage.setItem(LOCAL_STORAGE_TIMER_KEY, JSON.stringify(activeSession));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_TIMER_KEY);
      }
    } catch (e) {
      console.warn("Failed to persist timer to localStorage:", e);
    }
  }, [activeSession]);

  const toggleSound = () => {
    setIsSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(LOCAL_STORAGE_SOUND_KEY, String(next));
      return next;
    });
  };

  const rotateMicroTip = () => {
    setCurrentMicroTip(getRandomMicroTip(currentMicroTip.id));
  };

  // High-precision clock tick (every 250ms) using Date.now() delta
  useEffect(() => {
    if (!activeSession || activeSession.state !== "running") return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remainingSeconds = Math.max(0, Math.ceil((activeSession.targetEndTime - now) / 1000));
      const deltaSeconds = Math.max(0, (now - activeSession.lastTickTime) / 1000);

      const addedFocusedSeconds =
        activeSession.mode === "focus"
          ? (activeSession.totalFocusedSeconds || 0) + deltaSeconds
          : activeSession.totalFocusedSeconds || 0;

      if (remainingSeconds <= 0) {
        // Mode countdown completed!
        if (activeSession.mode === "focus") {
          if (isSoundEnabled) playChime("complete");
          setActiveSession({
            ...activeSession,
            mode: "completed",
            state: "completed",
            timeRemainingSeconds: 0,
            totalFocusedSeconds: addedFocusedSeconds,
            lastTickTime: now,
          });
          // Auto record session progress in background
          endFocusSession();
        } else if (activeSession.mode === "break") {
          if (isSoundEnabled) playChime("break");
          setActiveSession({
            ...activeSession,
            mode: "completed",
            state: "idle",
            timeRemainingSeconds: 0,
            lastTickTime: now,
          });
        }
      } else {
        setActiveSession({
          ...activeSession,
          timeRemainingSeconds: remainingSeconds,
          totalFocusedSeconds: addedFocusedSeconds,
          lastTickTime: now,
        });
      }
    }, 250);

    return () => clearInterval(interval);
  }, [activeSession?.state, activeSession?.targetEndTime, activeSession?.mode, isSoundEnabled]);

  // Recommendation engine bound to current user's past sessions
  const getRecommendation = useCallback(
    (params: {
      subject?: string;
      topic?: string;
      taskType?: string;
      taskDurationMinutes?: number;
      priority?: "High" | "Medium" | "Low";
    }): FocusRecommendation => {
      return calculateFocusRecommendation({
        ...params,
        academicLevel: user?.gradeLevel || "Undergraduate",
        pastSessions: studySessions,
      });
    },
    [user?.gradeLevel, studySessions]
  );

  // START FOCUS SESSION
  const startFocusSession = (params: {
    subject: string;
    topic: string;
    durationMinutes: number;
    breakMinutes?: number;
    taskTitle?: string;
    planId?: string;
    taskId?: string;
    reason?: string;
  }) => {
    const now = Date.now();
    const duration = Math.max(1, params.durationMinutes);
    const breakMins = params.breakMinutes || (duration >= 50 ? 10 : duration >= 40 ? 8 : 5);
    const targetEnd = now + duration * 60 * 1000;
    const sessionId = `session_${now}_${Math.random().toString(36).substring(2, 6)}`;

    const newSession: ActiveTimerSession = {
      sessionId,
      mode: "focus",
      state: "running",
      subject: params.subject.trim() || "General Study",
      topic: params.topic.trim() || "Core Concepts",
      taskTitle: params.taskTitle?.trim() || undefined,
      planId: params.planId || undefined,
      taskId: params.taskId || undefined,
      plannedFocusMinutes: duration,
      breakMinutes: breakMins,
      startTime: now,
      targetEndTime: targetEnd,
      timeRemainingSeconds: duration * 60,
      totalFocusedSeconds: 0,
      lastTickTime: now,
      reason: params.reason,
    };

    if (isSoundEnabled) playChime("start");
    setActiveSession(newSession);
    setPendingSetup(null);
  };

  // PAUSE SESSION
  const pauseSession = () => {
    if (!activeSession || activeSession.state !== "running") return;
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((activeSession.targetEndTime - now) / 1000));
    const delta = Math.max(0, (now - activeSession.lastTickTime) / 1000);
    const addedFocused =
      activeSession.mode === "focus"
        ? (activeSession.totalFocusedSeconds || 0) + delta
        : activeSession.totalFocusedSeconds || 0;

    setActiveSession({
      ...activeSession,
      state: "paused",
      timeRemainingSeconds: remaining,
      totalFocusedSeconds: addedFocused,
      lastTickTime: now,
    });
  };

  // RESUME SESSION
  const resumeSession = () => {
    if (!activeSession || activeSession.state !== "paused") return;
    const now = Date.now();
    const targetEnd = now + activeSession.timeRemainingSeconds * 1000;

    if (isSoundEnabled) playChime("start");
    setActiveSession({
      ...activeSession,
      state: "running",
      targetEndTime: targetEnd,
      lastTickTime: now,
    });
  };

  // END / COMPLETE FOCUS SESSION
  const endFocusSession = async (options?: {
    markTaskCompleted?: boolean;
    notes?: string;
  }): Promise<StudySessionRecord | null> => {
    if (!activeSession) return null;
    if (isSavingRef.current) return null;

    isSavingRef.current = true;
    const now = Date.now();
    const focusedMinutes = Math.max(
      1,
      Math.round((activeSession.totalFocusedSeconds || (now - activeSession.startTime) / 1000) / 60)
    );

    const isFullyCompleted =
      activeSession.mode === "completed" ||
      focusedMinutes >= Math.floor(activeSession.plannedFocusMinutes * 0.85);

    const status = isFullyCompleted ? "Completed" : "Partially completed";
    const todayStr = new Date().toISOString().split("T")[0];

    const record: StudySessionRecord = {
      id: activeSession.sessionId,
      userId: userId || "local_user",
      subject: activeSession.subject,
      topic: activeSession.topic,
      taskTitle: activeSession.taskTitle,
      planId: activeSession.planId,
      taskId: activeSession.taskId,
      plannedDurationMinutes: activeSession.plannedFocusMinutes,
      actualDurationMinutes: focusedMinutes,
      status,
      date: todayStr,
      startedAt: activeSession.startTime,
      completedAt: now,
      notes: options?.notes,
    };

    // 1. Optimistically update session history state
    setStudySessions((prev) => [record, ...prev.filter((s) => s.id !== record.id)]);

    // 2. Update user cumulative study minutes & streak
    try {
      await recordStudySession(focusedMinutes);
    } catch (e) {
      console.warn("Failed to record study session minutes:", e);
    }

    // 3. Mark study plan task completed if requested
    if (options?.markTaskCompleted && activeSession.planId && activeSession.taskId) {
      const plan = activePlan || null;
      if (plan && plan.id === activeSession.planId) {
        // Find week and day
        let targetWeek = 1;
        let targetDay = "";
        plan.weeklyMilestones.forEach((w) => {
          w.days.forEach((d) => {
            if (d.tasks.some((t) => t.id === activeSession.taskId)) {
              targetWeek = w.weekNumber;
              targetDay = d.dayName;
            }
          });
        });
        if (targetDay) {
          await toggleTaskCompletion(plan.id, targetWeek, targetDay, activeSession.taskId);
        }
      }
    }

    // 4. Persist to Firestore
    if (userId && db) {
      try {
        await setDoc(
          doc(db, "studySessions", record.id),
          cleanFirestoreData(record)
        );
      } catch (e) {
        console.warn("Failed to save study session to Firestore:", e);
      }
    }

    // Update active timer mode to completed
    setActiveSession({
      ...activeSession,
      mode: "completed",
      state: "completed",
      totalFocusedSeconds: focusedMinutes * 60,
    });

    isSavingRef.current = false;
    return record;
  };

  // CANCEL SESSION
  const cancelSession = async () => {
    if (!activeSession) return;
    const now = Date.now();
    const focusedMinutes = Math.floor((activeSession.totalFocusedSeconds || 0) / 60);

    if (focusedMinutes >= 2 && userId && db) {
      // Record as cancelled/interrupted if at least 2 minutes elapsed
      const record: StudySessionRecord = {
        id: activeSession.sessionId,
        userId,
        subject: activeSession.subject,
        topic: activeSession.topic,
        taskTitle: activeSession.taskTitle,
        planId: activeSession.planId,
        taskId: activeSession.taskId,
        plannedDurationMinutes: activeSession.plannedFocusMinutes,
        actualDurationMinutes: 0, // Does not count toward completed study time
        status: "Cancelled",
        date: new Date().toISOString().split("T")[0],
        startedAt: activeSession.startTime,
        completedAt: now,
      };

      try {
        await setDoc(doc(db, "studySessions", record.id), cleanFirestoreData(record));
        setStudySessions((prev) => [record, ...prev.filter((s) => s.id !== record.id)]);
      } catch (e) {
        console.warn("Could not save cancelled session record:", e);
      }
    }

    setActiveSession(null);
  };

  // START BREAK SESSION
  const startBreakSession = (customBreakMinutes?: number) => {
    if (!activeSession) return;
    const now = Date.now();
    const breakMins = customBreakMinutes || activeSession.breakMinutes || 5;
    const targetEnd = now + breakMins * 60 * 1000;

    setCurrentMicroTip(getRandomMicroTip());
    if (isSoundEnabled) playChime("break");

    setActiveSession({
      ...activeSession,
      mode: "break",
      state: "running",
      targetEndTime: targetEnd,
      timeRemainingSeconds: breakMins * 60,
      lastTickTime: now,
    });
  };

  // SKIP BREAK
  const skipBreak = () => {
    if (!activeSession) return;
    setActiveSession(null);
  };

  // START NEXT SESSION
  const startNextSession = (newSubject?: string, newTopic?: string) => {
    const subject = newSubject || activeSession?.subject || "General Study";
    const topic = newTopic || activeSession?.topic || "Core Review";
    const rec = getRecommendation({ subject, topic });
    startFocusSession({
      subject,
      topic,
      durationMinutes: rec.durationMinutes,
      breakMinutes: rec.breakMinutes,
      reason: rec.reason,
    });
  };

  // RESET TIMER
  const resetTimer = () => {
    setActiveSession(null);
  };

  // DELETE HISTORY RECORD
  const deleteSessionRecord = async (id: string) => {
    setStudySessions((prev) => prev.filter((s) => s.id !== id));
    if (userId && db) {
      try {
        await deleteDoc(doc(db, "studySessions", id));
      } catch (e) {
        console.warn("Failed to delete study session record:", e);
      }
    }
  };

  // Calculate Today's Summary Telemetry
  const todayStr = new Date().toISOString().split("T")[0];
  const todayRecords = studySessions.filter(
    (s) => s.date === todayStr && s.status !== "Cancelled"
  );
  const totalFocusedMinutes = todayRecords.reduce(
    (sum, s) => sum + (s.actualDurationMinutes || 0),
    0
  );
  const uniqueTopics = Array.from(new Set(todayRecords.map((s) => s.topic).filter(Boolean)));

  const subjectCounts: { [subject: string]: number } = {};
  todayRecords.forEach((r) => {
    subjectCounts[r.subject] = (subjectCounts[r.subject] || 0) + (r.actualDurationMinutes || 0);
  });
  let topSubject = "";
  let topSubjectMins = 0;
  Object.entries(subjectCounts).forEach(([subj, mins]) => {
    if (mins > topSubjectMins) {
      topSubject = subj;
      topSubjectMins = mins;
    }
  });

  const todaySummary = {
    totalSessions: todayRecords.length,
    totalFocusedMinutes,
    completedCount: todayRecords.filter((s) => s.status === "Completed").length,
    uniqueTopics,
    topSubject: topSubject || (todayRecords[0]?.subject ?? "None yet"),
  };

  return (
    <TimerContext.Provider
      value={{
        studySessions,
        activeSession,
        pendingSetup,
        setPendingSetup,
        timerMode: activeSession?.mode || "focus",
        timerState: activeSession?.state || "idle",
        timeRemainingSeconds: activeSession?.timeRemainingSeconds ?? 25 * 60,
        totalFocusedSeconds: activeSession?.totalFocusedSeconds ?? 0,
        isSoundEnabled,
        toggleSound,
        currentMicroTip,
        rotateMicroTip,
        startFocusSession,
        pauseSession,
        resumeSession,
        endFocusSession,
        cancelSession,
        startBreakSession,
        skipBreak,
        startNextSession,
        resetTimer,
        deleteSessionRecord,
        getRecommendation,
        todaySummary,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error("useTimer must be used within a TimerProvider");
  }
  return context;
};
