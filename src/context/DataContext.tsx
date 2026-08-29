import React, { createContext, useContext, useState, useEffect } from "react";
import {
  StudyPlan,
  NoteItem,
  QuizData,
  QuizResult,
  ChatSession,
  ChatMessage,
  RevisionCard,
  RecallRating,
} from "../types";
import { useAuth } from "./AuthContext";
import { db } from "../services/firebaseConfig";
import { cleanFirestoreData } from "../utils/firestoreSanitizer";
import {
  calculateNextReview,
  toLocalDateString,
  calculateCardPriorityScore,
  getDaysDifference,
} from "../utils/spacedRepetitionEngine";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  arrayUnion,
} from "firebase/firestore";

interface DataContextType {
  // Study Plans
  studyPlans: StudyPlan[];
  activePlan: StudyPlan | null;
  saveStudyPlan: (plan: Omit<StudyPlan, "id" | "userId" | "createdAt" | "active">) => Promise<StudyPlan>;
  updateStudyPlan: (planId: string, updates: Partial<StudyPlan>) => Promise<void>;
  setActivePlan: (planId: string) => Promise<void>;
  toggleTaskCompletion: (planId: string, weekNumber: number, dayName: string, taskId: string) => Promise<void>;
  deleteStudyPlan: (planId: string) => Promise<void>;
  deleteAllStudyPlans: () => Promise<void>;

  // Notes
  notes: NoteItem[];
  saveNote: (topic: string, subject: string, academicLevel: string, content: string, tags?: string[]) => Promise<NoteItem>;
  updateNote: (id: string, updates: Partial<NoteItem>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  toggleNoteFavorite: (id: string) => Promise<void>;

  // Quizzes & Results
  quizzes: QuizData[];
  quizResults: QuizResult[];
  saveQuiz: (quiz: Omit<QuizData, "id" | "userId" | "createdAt">) => Promise<QuizData>;
  saveQuizResult: (result: Omit<QuizResult, "id" | "userId" | "completedAt">) => Promise<QuizResult>;
  deleteQuiz: (id: string) => Promise<void>;

  // Chat Sessions
  chatSessions: ChatSession[];
  activeSession: ChatSession | null;
  createChatSession: (subject: string, academicLevel: string, sessionTitle?: string) => Promise<ChatSession>;
  selectChatSession: (sessionId: string) => void;
  addMessageToActiveSession: (message: Omit<ChatMessage, "id" | "timestamp">, targetSessionId?: string) => Promise<void>;
  deleteChatSession: (sessionId: string) => Promise<void>;
  clearChatSession: (sessionId: string) => Promise<void>;
  updateChatSessionTitle: (sessionId: string, title: string) => Promise<void>;

  // Spaced Repetition Revision Cards
  revisionCards: RevisionCard[];
  saveRevisionCards: (
    cards: Array<Omit<RevisionCard, "id" | "userId" | "createdAt" | "updatedAt">>
  ) => Promise<RevisionCard[]>;
  recordCardReview: (
    cardId: string,
    rating: RecallRating,
    examDate?: string
  ) => Promise<{ card: RevisionCard; feedbackMessage: string }>;
  updateRevisionCard: (cardId: string, updates: Partial<RevisionCard>) => Promise<void>;
  deleteRevisionCard: (cardId: string) => Promise<void>;
  deleteMultipleCards: (cardIds: string[]) => Promise<void>;
  deleteAllRevisionCards: () => Promise<void>;
  clearRevisionHistory: () => Promise<void>;
  toggleHideCard: (cardId: string) => Promise<void>;

  // Overview Stats
  stats: {
    totalNotes: number;
    totalQuizzesTaken: number;
    averageScore: number;
    tasksCompleted: number;
    activePlanProgress: number;
    studyStreak: number;
    totalRevisionCards: number;
    dueRevisionCards: number;
    masteredCardsCount: number;
  };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, recordTaskCompleted } = useAuth();
  const userId = user?.uid;

  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [quizzes, setQuizzes] = useState<QuizData[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [revisionCards, setRevisionCards] = useState<RevisionCard[]>([]);

  // Firestore Real-Time Listeners & Seeding for authenticated user
  useEffect(() => {
    if (!userId || !db) {
      setStudyPlans([]);
      setNotes([]);
      setQuizzes([]);
      setQuizResults([]);
      setChatSessions([]);
      setRevisionCards([]);
      setActiveSessionId(null);
      return;
    }

    // 1. Study Plans Listener
    const plansQuery = query(collection(db, "studyPlans"), where("userId", "==", userId));
    const unsubPlans = onSnapshot(plansQuery, async (snapshot) => {
      const seededKey = `studypilot_plans_seeded_${userId}`;
      if (snapshot.empty) {
        if (!localStorage.getItem(seededKey)) {
          // Seed default comprehensive plan into Firestore for instant first-time experience
          localStorage.setItem(seededKey, "true");
          const defaultPlanId = `plan_${Date.now()}_seed`;
          const defaultPlan: StudyPlan = {
            id: defaultPlanId,
            userId: userId,
            title: "Midterm Mastery & Core Concept Sprint",
            summary: "A high-impact 2-week structured roadmap balancing active recall, deep problem solving, and spaced review.",
            examName: "College Midterm Examinations",
            examDate: "In 14 Days",
            totalHoursPerWeek: 18,
            active: true,
            createdAt: Date.now(),
            weeklyMilestones: [
              {
                weekNumber: 1,
                theme: "Core Foundations, Mechanism Synthesis & Active Drills",
                focusGoals: ["Master reaction mechanisms", "Solve 50+ medium practice problems", "Complete formula sheets"],
                days: [
                  {
                    dayName: "Monday",
                    focusSubject: "Organic Chemistry",
                    tasks: [
                      { id: "t-1", title: "Review SN1/SN2 Reaction Mechanisms & Energy Diagrams", durationMinutes: 45, priority: "High", type: "Concept Learning", completed: true },
                      { id: "t-2", title: "Practice Problem Set #4: Stereochemistry & Nucleophilicity", durationMinutes: 45, priority: "High", type: "Active Recall", completed: true },
                      { id: "t-3", title: "Flashcard session on reagent tables (30 cards)", durationMinutes: 20, priority: "Medium", type: "Flashcards", completed: true },
                    ],
                  },
                  {
                    dayName: "Tuesday",
                    focusSubject: "Data Structures & Algorithms",
                    tasks: [
                      { id: "t-4", title: "Binary Search Trees, Rotations & AVL Tree Balances", durationMinutes: 60, priority: "High", type: "Deep Work", completed: true },
                      { id: "t-5", title: "Implement 3 Tree Traversal algorithms on code editor", durationMinutes: 45, priority: "High", type: "Coding Drill", completed: false },
                    ],
                  },
                  {
                    dayName: "Wednesday",
                    focusSubject: "Cell Biology & Genetics",
                    tasks: [
                      { id: "t-6", title: "Cellular Respiration & Krebs Cycle Electron Transport Chain", durationMinutes: 50, priority: "High", type: "Concept Learning", completed: false },
                      { id: "t-7", title: "Diagram drawing & oxidative phosphorylation pathway", durationMinutes: 30, priority: "Medium", type: "Active Recall", completed: false },
                    ],
                  },
                  {
                    dayName: "Thursday",
                    focusSubject: "Calculus II & Differential Equations",
                    tasks: [
                      { id: "t-8", title: "Integration by Parts & Trigonometric Substitution practice", durationMinutes: 60, priority: "High", type: "Practice Problems", completed: false },
                      { id: "t-9", title: "Error Log Review: redo tricky improper integrals", durationMinutes: 30, priority: "Medium", type: "Review", completed: false },
                    ],
                  },
                  {
                    dayName: "Friday",
                    focusSubject: "Mixed Subject Review",
                    tasks: [
                      { id: "t-10", title: "Timed 30-minute Mock Diagnostic Quiz across all subjects", durationMinutes: 45, priority: "High", type: "Self-Assessment", completed: false },
                      { id: "t-11", title: "Consolidate week 1 cheat sheets and summary notes", durationMinutes: 35, priority: "Medium", type: "Synthesis", completed: false },
                    ],
                  },
                ],
              },
              {
                weekNumber: 2,
                theme: "Advanced Exam Simulation & Speed Optimization",
                focusGoals: ["Complete 2 full timed past papers", "Zero in on weak areas"],
                days: [
                  {
                    dayName: "Monday",
                    focusSubject: "Organic Chemistry",
                    tasks: [
                      { id: "t-12", title: "Multi-step Synthesis Retrosynthesis challenge problems", durationMinutes: 60, priority: "High", type: "Deep Work", completed: false },
                    ],
                  },
                  {
                    dayName: "Wednesday",
                    focusSubject: "Data Structures",
                    tasks: [
                      { id: "t-13", title: "Graph Traversals (BFS, DFS, Dijkstra) mock test", durationMinutes: 60, priority: "High", type: "Exam Simulation", completed: false },
                    ],
                  },
                ],
              },
            ],
            proTips: [
              "Use 50-minute study blocks followed by 10-minute active stretch breaks.",
              "Write explanations in your own words (Feynman Technique) before reading lecture slides.",
              "Never look at answer keys before attempting a problem for at least 8 solid minutes.",
            ],
          };
          await setDoc(doc(db, "studyPlans", defaultPlanId), defaultPlan).catch((e) => console.warn("Seed plan err:", e));
        } else {
          setStudyPlans([]);
        }
      } else {
        localStorage.setItem(seededKey, "true");
        const loaded: StudyPlan[] = [];
        snapshot.forEach((docSnap) => loaded.push(docSnap.data() as StudyPlan));
        loaded.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setStudyPlans(loaded);
      }
    });

    // 2. Notes Listener
    const notesQuery = query(collection(db, "notes"), where("userId", "==", userId));
    const unsubNotes = onSnapshot(notesQuery, async (snapshot) => {
      if (snapshot.empty) {
        const note1Id = `note_${Date.now()}_1`;
        const note2Id = `note_${Date.now()}_2`;
        const defaultNotes: NoteItem[] = [
          {
            id: note1Id,
            userId: userId,
            topic: "Binary Search Trees & AVL Balance Invariants",
            subject: "Computer Science",
            academicLevel: "Undergraduate",
            isFavorite: true,
            tags: ["Data Structures", "Algorithms", "Trees"],
            createdAt: Date.now() - 86400000,
            updatedAt: Date.now() - 86400000,
            content: `# Binary Search Trees (BST) & AVL Balance Invariants

## 🎯 Overview
A **Binary Search Tree (BST)** is a node-based binary tree data structure with the property that for every node $X$:
- All nodes in the left subtree have keys **strictly less** than $X.key$.
- All nodes in the right subtree have keys **strictly greater** than $X.key$.

---

## 📐 Key Operations & Time Complexities

| Operation | Average Case | Worst Case (Degenerate) | AVL Tree (Balanced) |
| :--- | :--- | :--- | :--- |
| **Search** | $O(\\log n)$ | $O(n)$ | $\\mathbf{O(\\log n)}$ |
| **Insert** | $O(\\log n)$ | $O(n)$ | $\\mathbf{O(\\log n)}$ |
| **Delete** | $O(\\log n)$ | $O(n)$ | $\\mathbf{O(\\log n)}$ |

---

## ⚖️ AVL Balance Invariant
An **AVL Tree** is a self-balancing BST where the **Balance Factor ($BF$)** of every node is strictly between $-1$ and $+1$:
$$\\text{BalanceFactor}(N) = \\text{Height}(\\text{LeftChild}) - \\text{Height}(\\text{RightChild}) \\in \\{-1, 0, +1\\}$$

### 4 Rotation Cases:
1. **Left-Left (LL)**: Single Right Rotation on root.
2. **Right-Right (RR)**: Single Left Rotation on root.
3. **Left-Right (LR)**: Left rotation on left child, then Right rotation on root.
4. **Right-Left (RL)**: Right rotation on right child, then Left rotation on root.

---

## 💡 Quick Recall Mnemonics
- **"Opposite direction rotation"**: If heavy on Left, rotate to the Right.
- **In-Order Traversal (L-N-R)** on a BST always produces elements in **sorted ascending order**!`,
          },
          {
            id: note2Id,
            userId: userId,
            topic: "Cellular Respiration: Glycolysis & Krebs Cycle",
            subject: "Biology / Biochemistry",
            academicLevel: "College Pre-Med",
            isFavorite: false,
            tags: ["Biochemistry", "Metabolism", "Mitochondria"],
            createdAt: Date.now() - 86400000 * 3,
            updatedAt: Date.now() - 86400000 * 3,
            content: `# Cellular Respiration: Complete Metabolic Breakdown

## 🎯 4 Primary Phases
1. **Glycolysis** (Cytosol, Anaerobic)
2. **Pyruvate Oxidation** (Mitochondrial Matrix)
3. **Citric Acid / Krebs Cycle** (Mitochondrial Matrix)
4. **Oxidative Phosphorylation & ETC** (Inner Mitochondrial Membrane)

---

## ⚡ Energy Balance & Net ATP Yield (Per 1 Glucose Molecule)
- **Glycolysis**: Net $2\\text{ ATP} + 2\\text{ NADH}$
- **Pyruvate Oxidation**: $2\\text{ NADH} + 2\\text{ CO}_2$
- **Krebs Cycle**: $2\\text{ ATP} (\\text{GTP}) + 6\\text{ NADH} + 2\\text{ FADH}_2 + 4\\text{ CO}_2$
- **Total Theoretical Yield**: $\\approx 30 - 32\\text{ ATP}$

---

## 🧠 High-Yield Exam Traps
- **Oxygen Role**: $O_2$ is the **final electron acceptor** at Complex IV, forming $H_2O$.
- **Proton Gradient**: $H^+$ protons are pumped into the **Intermembrane Space**, driving ATP Synthase as they flow back into the matrix.`,
          },
        ];

        for (const note of defaultNotes) {
          await setDoc(doc(db, "notes", note.id), note).catch((e) => console.warn("Seed note err:", e));
        }
      } else {
        const loaded: NoteItem[] = [];
        snapshot.forEach((docSnap) => loaded.push(docSnap.data() as NoteItem));
        loaded.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        setNotes(loaded);
      }
    });

    // 3. Quizzes Listener
    const quizzesQuery = query(collection(db, "quizzes"), where("userId", "==", userId));
    const unsubQuizzes = onSnapshot(quizzesQuery, async (snapshot) => {
      if (snapshot.empty) {
        const defaultQuizId = `quiz_${Date.now()}_seed`;
        const defaultQuiz: QuizData = {
          id: defaultQuizId,
          userId: userId,
          title: "Data Structures & Tree Traversal Mastery",
          subject: "Computer Science",
          topic: "Binary Trees & Graphs",
          difficulty: "Intermediate",
          totalQuestions: 4,
          createdAt: Date.now() - 86400000 * 2,
          questions: [
            {
              id: 1,
              question: "Which tree traversal on a Binary Search Tree produces values in strictly sorted ascending order?",
              options: ["A) Pre-order (Node, Left, Right)", "B) In-order (Left, Node, Right)", "C) Post-order (Left, Right, Node)", "D) Level-order (Breadth-First)"],
              correctOptionIndex: 1,
              explanation: "In-order traversal visits the entire left subtree first (all smaller elements), then the current node, then the right subtree (all larger elements), yielding perfectly sorted output for any BST.",
              hint: "Think about visiting the smallest branch before the root.",
            },
            {
              id: 2,
              question: "What is the worst-case time complexity of searching in an unbalanced binary search tree with N elements?",
              options: ["A) O(1)", "B) O(log N)", "C) O(N)", "D) O(N log N)"],
              correctOptionIndex: 2,
              explanation: "When elements are inserted in already sorted order, a standard BST degenerates into a linear linked list where height = N, making worst-case search O(N).",
              hint: "Imagine a tree where every node only has a right child.",
            },
            {
              id: 3,
              question: "In an AVL tree, what is the maximum permissible difference in height between left and right subtrees for any node?",
              options: ["A) 0", "B) 1", "C) 2", "D) log N"],
              correctOptionIndex: 1,
              explanation: "The AVL balance factor rule strictly enforces that |Height(Left) - Height(Right)| <= 1 at every single node in the tree.",
            },
            {
              id: 4,
              question: "Which data structure is typically used to implement Breadth-First Search (BFS) on a graph or tree?",
              options: ["A) Stack (LIFO)", "B) Queue (FIFO)", "C) Priority Heap", "D) Hash Map"],
              correctOptionIndex: 1,
              explanation: "BFS explores vertices level by level in First-In-First-Out order, which is naturally maintained using a Queue.",
            },
          ],
        };
        await setDoc(doc(db, "quizzes", defaultQuizId), defaultQuiz).catch((e) => console.warn("Seed quiz err:", e));
      } else {
        const loaded: QuizData[] = [];
        snapshot.forEach((docSnap) => loaded.push(docSnap.data() as QuizData));
        loaded.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setQuizzes(loaded);
      }
    });

    // 4. Quiz Results Listener
    const resultsQuery = query(collection(db, "quizResults"), where("userId", "==", userId));
    const unsubResults = onSnapshot(resultsQuery, (snapshot) => {
      const loaded: QuizResult[] = [];
      snapshot.forEach((docSnap) => loaded.push(docSnap.data() as QuizResult));
      loaded.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
      setQuizResults(loaded);
    });

    // 5. Chat Sessions Listener
    const chatsQuery = query(collection(db, "chatSessions"), where("userId", "==", userId));
    const unsubChats = onSnapshot(chatsQuery, async (snapshot) => {
      if (snapshot.empty) {
        const defaultChatId = `chat_${Date.now()}_seed`;
        const defaultChat: ChatSession = {
          id: defaultChatId,
          userId: userId,
          title: "Mechanisms of SN1 vs SN2 Reactions",
          subject: "Organic Chemistry",
          academicLevel: "Undergraduate",
          createdAt: Date.now() - 86400000,
          updatedAt: Date.now() - 86400000,
          messages: [
            {
              id: "msg-1",
              role: "user",
              content: "How do I easily remember when an organic chemistry reaction will proceed via SN1 versus SN2 mechanism?",
              timestamp: Date.now() - 86400000 + 1000,
            },
            {
              id: "msg-2",
              role: "assistant",
              content: `Hello! Great question. Distinguishing **$\\text{S}_\\text{N}1$** from **$\\text{S}_\\text{N}2$** comes down to **4 primary factors**.

Here is the high-yield framework:

### 1. 🎯 Substrate Steric Hindrance (The #1 Factor)
- **$\\text{S}_\\text{N}2$ (Backside Attack)** loves **unhindered** carbons:
  $$\\text{Methyl} > 1^\\circ > 2^\\circ \\gg 3^\\circ \\text{ (Never } 3^\\circ\\text{)}$$
- **$\\text{S}_\\text{N}1$ (Carbocation Intermediate)** loves **stable carbocations**:
  $$3^\\circ > 2^\\circ \\gg 1^\\circ / \\text{Methyl} \\text{ (Never } 1^\\circ\\text{/Methyl)}$$

---

### 2. ⚡ Nucleophile Strength
- **$\\text{S}_\\text{N}2$ requires a strong nucleophile** (usually negatively charged like $\\text{OH}^-, \\text{CN}^-, \\text{I}^-$) to push off the leaving group in one concerted step.
- **$\\text{S}_\\text{N}1$ works fine with weak/neutral nucleophiles** (like $\\text{H}_2\\text{O}, \\text{ROH}$) because the leaving group departs first on its own.

---

### 3. 🧪 Solvent Type
- **Polar Aprotic** (DMSO, Acetone, DMF) boosts $\\mathbf{S_\\text{N}2}$ by not solvating nucleophilic anions.
- **Polar Protic** (Water, Ethanol) stabilizes carbocations, favoring $\\mathbf{S_\\text{N}1}$.

---

### 🧠 Quick Memory Hook:
> **$\\text{S}_\\text{N}2$ = "Two" things happening at once (concerted attack), needs space!**
> **$\\text{S}_\\text{N}1$ = "One" molecule in the slow step (carbocation waits).**

Would you like to try a practice substrate together to test this rule?`,
              timestamp: Date.now() - 86400000 + 4000,
            },
          ],
        };
        await setDoc(doc(db, "chatSessions", defaultChatId), defaultChat).catch((e) => console.warn("Seed chat err:", e));
      } else {
        const loaded: ChatSession[] = [];
        snapshot.forEach((docSnap) => loaded.push(docSnap.data() as ChatSession));
        loaded.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        setChatSessions(loaded);
        if (!activeSessionId && loaded.length > 0) {
          setActiveSessionId(loaded[0].id);
        }
      }
    });

    // 6. Spaced Repetition Revision Cards Listener
    const cardsQuery = query(collection(db, "revisionCards"), where("userId", "==", userId));
    const unsubCards = onSnapshot(cardsQuery, async (snapshot) => {
      const seededCardsKey = `studypilot_cards_seeded_${userId}`;
      if (snapshot.empty) {
        if (!localStorage.getItem(seededCardsKey)) {
          localStorage.setItem(seededCardsKey, "true");
          const todayStr = toLocalDateString();
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = toLocalDateString(tomorrow);

          const defaultCards: RevisionCard[] = [
            {
              id: `card_${Date.now()}_1`,
              userId,
              subject: "Computer Science",
              topic: "Database Normalization",
              question: "What specific anomaly does Third Normal Form (3NF) eliminate after 2NF is satisfied?",
              answer: "3NF eliminates transitive functional dependencies by ensuring non-key attributes depend strictly and solely on the primary candidate key.",
              explanation: "If attribute X determines Y and Y determines Z, then Z transitively depends on X. 3NF removes Y -> Z into a dedicated relation.",
              example: "Moving 'DepartmentCode -> DepartmentBuilding' out of an Employee record into a separate Department table.",
              keyTakeaway: "Every non-key attribute must depend on the key, the whole key, and nothing but the key.",
              source: { type: "notes", name: "Database Systems Notes" },
              difficultyLevel: "Intermediate",
              status: "Needs Review",
              repetitionIntervalDays: 1,
              easeFactor: 2.3,
              consecutiveCorrect: 0,
              consecutiveIncorrect: 1,
              totalReviews: 2,
              successfulRecalls: 1,
              incorrectRecalls: 1,
              lastReviewedAt: Date.now() - 86400000,
              nextReviewDate: todayStr,
              nextReviewTimestamp: Date.now(),
              priorityScore: 85,
              isHidden: false,
              isMastered: false,
              createdAt: Date.now() - 86400000 * 2,
              updatedAt: Date.now() - 86400000,
            },
            {
              id: `card_${Date.now()}_2`,
              userId,
              subject: "Biology",
              topic: "Cellular Respiration",
              question: "What is the precise molecular role of Oxygen in oxidative phosphorylation?",
              answer: "Oxygen serves as the terminal electron acceptor at Complex IV, reacting with protons (H+) to yield metabolic Water (H2O).",
              explanation: "Without oxygen drawing electrons down the potential gradient, electron flow stops, collapsing the proton-motive force needed for ATP synthesis.",
              example: "Cyanide toxicity is lethal because it binds Complex IV and prevents electron handoff to oxygen.",
              keyTakeaway: "Oxygen = Final Electron Acceptor creating Water.",
              source: { type: "plan", name: "Biology Midterm Sprint" },
              difficultyLevel: "Intermediate",
              status: "Developing",
              repetitionIntervalDays: 2,
              easeFactor: 2.5,
              consecutiveCorrect: 1,
              consecutiveIncorrect: 0,
              totalReviews: 1,
              successfulRecalls: 1,
              incorrectRecalls: 0,
              lastReviewedAt: Date.now() - 86400000 * 2,
              nextReviewDate: todayStr,
              nextReviewTimestamp: Date.now(),
              priorityScore: 50,
              isHidden: false,
              isMastered: false,
              createdAt: Date.now() - 86400000 * 2,
              updatedAt: Date.now() - 86400000 * 2,
            },
            {
              id: `card_${Date.now()}_3`,
              userId,
              subject: "Organic Chemistry",
              topic: "SN1 vs SN2 Reactions",
              question: "Why do tertiary substrates undergo substitution exclusively via SN1 rather than SN2?",
              answer: "Steric congestion physically blocks backside nucleophilic attack (ruling out SN2), while three alkyl groups inductively stabilize the carbocation intermediate (promoting SN1).",
              explanation: "SN2 transition state is extremely hindered by bulky substituents. SN1 proceeds via a planar carbocation that forms readily at tertiary carbons.",
              example: "tert-Butyl chloride reacts with H2O in polar protic solvent via SN1.",
              keyTakeaway: "Tertiary = high steric barrier + stable carbocation = SN1 exclusively.",
              source: { type: "tutor", name: "SN1 vs SN2 Dialogue" },
              difficultyLevel: "Advanced",
              status: "Strong",
              repetitionIntervalDays: 5,
              easeFactor: 2.6,
              consecutiveCorrect: 3,
              consecutiveIncorrect: 0,
              totalReviews: 3,
              successfulRecalls: 3,
              incorrectRecalls: 0,
              lastReviewedAt: Date.now() - 86400000 * 5,
              nextReviewDate: todayStr,
              nextReviewTimestamp: Date.now(),
              priorityScore: 30,
              isHidden: false,
              isMastered: false,
              createdAt: Date.now() - 86400000 * 7,
              updatedAt: Date.now() - 86400000 * 5,
            },
            {
              id: `card_${Date.now()}_4`,
              userId,
              subject: "Computer Science",
              topic: "Database Indexing",
              question: "Why are B+ Trees favored over Binary Search Trees for disk-based relational storage?",
              answer: "B+ Trees have massive branching factors (shallow height), dramatically reducing disk I/O seek operations, and leaf nodes are linked for linear range scans.",
              explanation: "Disk access is thousands of times slower than RAM. Minimizing tree depth is essential for fast storage reads.",
              example: "PostgreSQL and MySQL InnoDB default to B+ Tree indexes for primary and secondary keys.",
              keyTakeaway: "High fan-out = minimal disk seeks + linked leaves for range queries.",
              source: { type: "notes", name: "Database Systems Notes" },
              difficultyLevel: "Intermediate",
              status: "Developing",
              repetitionIntervalDays: 3,
              easeFactor: 2.5,
              consecutiveCorrect: 2,
              consecutiveIncorrect: 0,
              totalReviews: 2,
              successfulRecalls: 2,
              incorrectRecalls: 0,
              lastReviewedAt: Date.now() - 86400000 * 2,
              nextReviewDate: tomorrowStr,
              nextReviewTimestamp: Date.now() + 86400000,
              priorityScore: 25,
              isHidden: false,
              isMastered: false,
              createdAt: Date.now() - 86400000 * 3,
              updatedAt: Date.now() - 86400000 * 2,
            },
            {
              id: `card_${Date.now()}_5`,
              userId,
              subject: "Calculus",
              topic: "Chain Rule",
              question: "State the mathematical formula for the Chain Rule of a composite function h(x) = f(g(x)).",
              answer: "h'(x) = f'(g(x)) · g'(x) — differentiate the outer function keeping the inner intact, then multiply by the inner derivative.",
              explanation: "The rate of change of the overall composite equals the rate of change of the outer with respect to the inner, multiplied by the rate of change of the inner.",
              example: "d/dx [sin(x²)] = cos(x²) · 2x = 2x cos(x²).",
              keyTakeaway: "Outer derivative evaluated at inner × inner derivative.",
              source: { type: "custom", name: "Calculus Formula Practice" },
              difficultyLevel: "Beginner",
              status: "Strong",
              repetitionIntervalDays: 6,
              easeFactor: 2.6,
              consecutiveCorrect: 3,
              consecutiveIncorrect: 0,
              totalReviews: 3,
              successfulRecalls: 3,
              incorrectRecalls: 0,
              lastReviewedAt: Date.now() - 86400000 * 6,
              nextReviewDate: todayStr,
              nextReviewTimestamp: Date.now(),
              priorityScore: 20,
              isHidden: false,
              isMastered: false,
              createdAt: Date.now() - 86400000 * 10,
              updatedAt: Date.now() - 86400000 * 6,
            },
          ];

          for (const card of defaultCards) {
            await setDoc(doc(db, "revisionCards", card.id), card).catch((e) =>
              console.warn("Seed card err:", e)
            );
          }
        }
      } else {
        const loaded: RevisionCard[] = [];
        snapshot.forEach((docSnap) => loaded.push(docSnap.data() as RevisionCard));
        loaded.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
        setRevisionCards(loaded);
      }
    });

    return () => {
      unsubPlans();
      unsubNotes();
      unsubQuizzes();
      unsubResults();
      unsubChats();
      unsubCards();
    };
  }, [userId]);

  // Active Plan helper
  const activePlan = studyPlans.find((p) => p.active) || studyPlans[0] || null;

  // Study Plans Actions
  const saveStudyPlan = async (planData: Omit<StudyPlan, "id" | "userId" | "createdAt" | "active">): Promise<StudyPlan> => {
    if (!userId || !db) throw new Error("Please sign in to save study plans.");

    const planId = `plan_${Date.now()}`;
    const newPlan: StudyPlan = {
      ...planData,
      id: planId,
      userId,
      createdAt: Date.now(),
      active: true,
    };

    // Mark previous plans as inactive in Firestore
    for (const p of studyPlans) {
      if (p.active) {
        await updateDoc(doc(db, "studyPlans", p.id), { active: false }).catch(() => {});
      }
    }

    await setDoc(doc(db, "studyPlans", planId), cleanFirestoreData(newPlan));
    return newPlan;
  };

  const setActivePlan = async (planId: string) => {
    if (!userId || !db) return;
    for (const p of studyPlans) {
      const shouldBeActive = p.id === planId;
      if (p.active !== shouldBeActive) {
        await updateDoc(doc(db, "studyPlans", p.id), { active: shouldBeActive }).catch(() => {});
      }
    }
  };

  const toggleTaskCompletion = async (planId: string, weekNumber: number, dayName: string, taskId: string) => {
    if (!userId || !db) return;
    const targetPlan = studyPlans.find((p) => p.id === planId);
    if (!targetPlan) return;

    let isCompletedNow = false;
    const updatedWeeklyMilestones = targetPlan.weeklyMilestones.map((week) => {
      if (week.weekNumber !== weekNumber) return week;
      return {
        ...week,
        days: week.days.map((day) => {
          if (day.dayName !== dayName) return day;
          return {
            ...day,
            tasks: day.tasks.map((task) => {
              if (task.id !== taskId) return task;
              const newCompleted = !task.completed;
              if (newCompleted) isCompletedNow = true;
              return { ...task, completed: newCompleted };
            }),
          };
        }),
      };
    });

    if (isCompletedNow) {
      await recordTaskCompleted();
    }

    await updateDoc(doc(db, "studyPlans", planId), cleanFirestoreData({
      weeklyMilestones: updatedWeeklyMilestones,
    }));
  };

  const updateStudyPlan = async (planId: string, updates: Partial<StudyPlan>) => {
    if (!userId || !db) return;
    await updateDoc(doc(db, "studyPlans", planId), cleanFirestoreData({
      ...updates,
      updatedAt: Date.now(),
    }));
  };

  const deleteStudyPlan = async (planId: string): Promise<void> => {
    if (!userId || !db) return;
    // Optimistic UI state update
    setStudyPlans((prev) => {
      const remaining = prev.filter((p) => p.id !== planId);
      const wasActive = prev.find((p) => p.id === planId)?.active;
      if (wasActive && remaining.length > 0) {
        remaining[0] = { ...remaining[0], active: true };
      }
      return remaining;
    });

    try {
      await deleteDoc(doc(db, "studyPlans", planId));
    } catch (err) {
      console.error(`[Firestore Error] Failed to delete studyPlans/${planId}:`, err);
      throw err;
    }
  };

  const deleteAllStudyPlans = async (): Promise<void> => {
    if (!userId || !db) return;
    const plansToDelete = studyPlans.filter((p) => p.userId === userId);
    // Optimistic UI state update
    setStudyPlans([]);

    try {
      const deletePromises = plansToDelete.map((p) => deleteDoc(doc(db, "studyPlans", p.id)));
      await Promise.all(deletePromises);
    } catch (err) {
      console.error("[Firestore Error] Failed to delete all study plans:", err);
      throw err;
    }
  };

  // Notes Actions
  const saveNote = async (
    topic: string,
    subject: string,
    academicLevel: string,
    content: string,
    tags: string[] = []
  ): Promise<NoteItem> => {
    if (!userId || !db) throw new Error("Please sign in to save notes.");

    const noteId = `note_${Date.now()}`;
    const newNote: NoteItem = {
      id: noteId,
      userId,
      topic,
      subject,
      academicLevel,
      content,
      tags,
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await setDoc(doc(db, "notes", noteId), cleanFirestoreData(newNote));
    return newNote;
  };

  const updateNote = async (id: string, updates: Partial<NoteItem>) => {
    if (!userId || !db) return;
    await updateDoc(doc(db, "notes", id), cleanFirestoreData({
      ...updates,
      updatedAt: Date.now(),
    }));
  };

  const deleteNote = async (id: string) => {
    if (!userId || !db) return;
    await deleteDoc(doc(db, "notes", id));
  };

  const toggleNoteFavorite = async (id: string) => {
    if (!userId || !db) return;
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    await updateDoc(doc(db, "notes", id), cleanFirestoreData({
      isFavorite: !note.isFavorite,
      updatedAt: Date.now(),
    }));
  };

  // Quiz Actions
  const saveQuiz = async (quizData: Omit<QuizData, "id" | "userId" | "createdAt">): Promise<QuizData> => {
    if (!userId || !db) throw new Error("Please sign in to save quizzes.");

    const quizId = `quiz_${Date.now()}`;
    const newQuiz: QuizData = {
      ...quizData,
      id: quizId,
      userId,
      createdAt: Date.now(),
    };

    await setDoc(doc(db, "quizzes", quizId), cleanFirestoreData(newQuiz));
    return newQuiz;
  };

  const saveQuizResult = async (resultData: Omit<QuizResult, "id" | "userId" | "completedAt">): Promise<QuizResult> => {
    if (!userId || !db) throw new Error("Please sign in to save quiz results.");

    const resultId = `res_${Date.now()}`;
    const newResult: QuizResult = {
      ...resultData,
      id: resultId,
      userId,
      completedAt: Date.now(),
    };

    await setDoc(doc(db, "quizResults", resultId), cleanFirestoreData(newResult));
    return newResult;
  };

  const deleteQuiz = async (id: string) => {
    if (!userId || !db) return;
    await deleteDoc(doc(db, "quizzes", id));
  };

  // Chat Actions
  const activeSession = chatSessions.find((s) => s.id === activeSessionId) || chatSessions[0] || null;

  const createChatSession = async (
    subject: string,
    academicLevel: string,
    sessionTitle?: string
  ): Promise<ChatSession> => {
    if (!userId || !db) throw new Error("Please sign in to start a study chat.");

    const sessionId = `chat_${Date.now()}`;
    const safeTitle = sessionTitle && typeof sessionTitle === "string" && sessionTitle.trim()
      ? (sessionTitle.trim().length > 36 ? sessionTitle.trim().slice(0, 36) + "..." : sessionTitle.trim())
      : `${subject || "General"} Study Session`;

    const newSession: ChatSession = {
      id: sessionId,
      userId,
      title: safeTitle,
      subject: subject || "General",
      academicLevel: academicLevel || "College / University",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };

    // Optimistically update React state immediately
    setChatSessions((prev) => [newSession, ...prev.filter((s) => s.id !== sessionId)]);
    setActiveSessionId(sessionId);

    try {
      await setDoc(doc(db, "chatSessions", sessionId), cleanFirestoreData(newSession));
    } catch (err) {
      console.error(`[Firestore Error] Failed to create chatSessions/${sessionId}:`, err);
    }

    return newSession;
  };

  const selectChatSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const addMessageToActiveSession = async (
    message: Omit<ChatMessage, "id" | "timestamp">,
    targetSessionId?: string
  ) => {
    if (!userId || !db) return;

    const sid = targetSessionId || activeSessionId || activeSession?.id || (chatSessions[0]?.id ?? null);
    if (!sid) return;

    // Strict sanitization of message object - guaranteed no undefined values
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      role: message.role === "assistant" ? "assistant" : "user",
      content: typeof message.content === "string" ? message.content : String(message.content || ""),
      timestamp: Date.now(),
    };

    if (message.subject && typeof message.subject === "string" && message.subject.trim()) {
      newMsg.subject = message.subject.trim();
    }

    if (Array.isArray(message.attachments) && message.attachments.length > 0) {
      const validAtts = message.attachments
        .filter((att) => att && typeof att === "object")
        .map((att) => {
          const item: { name: string; formattedSize: string; category?: string } = {
            name: String(att.name || "Document"),
            formattedSize: String(att.formattedSize || "0 KB"),
          };
          if (att.category && typeof att.category === "string") {
            item.category = att.category;
          }
          return item;
        });
      if (validAtts.length > 0) {
        newMsg.attachments = validAtts;
      }
    }

    const cleanedMsg = cleanFirestoreData(newMsg);

    // 1. Optimistically update local React state using functional updater (never stale)
    setChatSessions((prev) =>
      prev.map((s) => {
        if (s.id === sid) {
          const currentMsgs = Array.isArray(s.messages) ? s.messages : [];
          return {
            ...s,
            messages: [...currentMsgs, newMsg],
            updatedAt: Date.now(),
          };
        }
        return s;
      })
    );

    // 2. Persist to Firestore atomically using arrayUnion
    try {
      const docRef = doc(db, "chatSessions", sid);
      await updateDoc(docRef, {
        messages: arrayUnion(cleanedMsg),
        updatedAt: Date.now(),
      });
    } catch (err: any) {
      console.error(`[Firestore Error] Failed to update chatSessions/${sid}:`, err);
      // Fallback: If updateDoc fails because document does not exist, use setDoc
      if (err?.code === "not-found") {
        try {
          await setDoc(
            doc(db, "chatSessions", sid),
            cleanFirestoreData({
              id: sid,
              userId,
              title: "Study Session",
              subject: "General",
              academicLevel: "College / University",
              createdAt: Date.now(),
              updatedAt: Date.now(),
              messages: [cleanedMsg],
            })
          );
        } catch (setErr) {
          console.error("Fallback setDoc error:", setErr);
        }
      }
    }
  };

  const deleteChatSession = async (sessionId: string) => {
    if (!userId || !db) return;
    try {
      await deleteDoc(doc(db, "chatSessions", sessionId));
    } catch (err) {
      console.error(`[Firestore Error] Failed to delete chatSessions/${sessionId}:`, err);
    }
    if (activeSessionId === sessionId) {
      const remaining = chatSessions.filter((s) => s.id !== sessionId);
      setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const clearChatSession = async (sessionId: string) => {
    if (!userId || !db) return;
    setChatSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, messages: [], updatedAt: Date.now() } : s))
    );
    try {
      await updateDoc(doc(db, "chatSessions", sessionId), cleanFirestoreData({
        messages: [],
        updatedAt: Date.now(),
      }));
    } catch (err) {
      console.error(`[Firestore Error] Failed to clear chatSessions/${sessionId}:`, err);
    }
  };

  const updateChatSessionTitle = async (sessionId: string, title: string) => {
    if (!userId || !db || !title.trim()) return;
    const safeTitle = title.trim().slice(0, 60);
    setChatSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title: safeTitle, updatedAt: Date.now() } : s))
    );
    try {
      await updateDoc(doc(db, "chatSessions", sessionId), cleanFirestoreData({
        title: safeTitle,
        updatedAt: Date.now(),
      }));
    } catch (err) {
      console.error(`[Firestore Error] Failed to update chatSessions/${sessionId} title:`, err);
    }
  };

  // --- Spaced Repetition Revision Cards Actions ---

  const saveRevisionCards = async (
    cardsData: Array<Omit<RevisionCard, "id" | "userId" | "createdAt" | "updatedAt">>
  ): Promise<RevisionCard[]> => {
    if (!userId) throw new Error("Please sign in to save revision cards.");

    const todayStr = toLocalDateString();
    const createdCards: RevisionCard[] = [];

    for (const cardData of cardsData) {
      const cardId = `card_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newCard: RevisionCard = {
        ...cardData,
        id: cardId,
        userId,
        status: cardData.status || "Developing",
        repetitionIntervalDays: cardData.repetitionIntervalDays || 1,
        easeFactor: cardData.easeFactor || 2.5,
        consecutiveCorrect: cardData.consecutiveCorrect || 0,
        consecutiveIncorrect: cardData.consecutiveIncorrect || 0,
        totalReviews: cardData.totalReviews || 0,
        successfulRecalls: cardData.successfulRecalls || 0,
        incorrectRecalls: cardData.incorrectRecalls || 0,
        nextReviewDate: cardData.nextReviewDate || todayStr,
        nextReviewTimestamp: cardData.nextReviewTimestamp || Date.now(),
        priorityScore: cardData.priorityScore || 50,
        isHidden: cardData.isHidden || false,
        isMastered: cardData.isMastered || false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      createdCards.push(newCard);

      if (db) {
        try {
          await setDoc(doc(db, "revisionCards", cardId), cleanFirestoreData(newCard));
        } catch (err) {
          console.error(`[Firestore Error] Failed to save revisionCards/${cardId}:`, err);
        }
      }
    }

    setRevisionCards((prev) => [...createdCards, ...prev]);
    return createdCards;
  };

  const recordCardReview = async (
    cardId: string,
    rating: RecallRating,
    examDate?: string
  ): Promise<{ card: RevisionCard; feedbackMessage: string }> => {
    const existing = revisionCards.find((c) => c.id === cardId);
    if (!existing) throw new Error("Card not found");

    const calculation = calculateNextReview(existing, rating, examDate);

    const updatedCard: RevisionCard = {
      ...existing,
      repetitionIntervalDays: calculation.repetitionIntervalDays,
      easeFactor: calculation.easeFactor,
      consecutiveCorrect: calculation.consecutiveCorrect,
      consecutiveIncorrect: calculation.consecutiveIncorrect,
      status: calculation.status,
      isMastered: calculation.isMastered,
      nextReviewDate: calculation.nextReviewDate,
      nextReviewTimestamp: calculation.nextReviewTimestamp,
      priorityScore: calculation.priorityScore,
      totalReviews: (existing.totalReviews || 0) + 1,
      successfulRecalls:
        rating === "forgot"
          ? existing.successfulRecalls || 0
          : (existing.successfulRecalls || 0) + 1,
      incorrectRecalls:
        rating === "forgot"
          ? (existing.incorrectRecalls || 0) + 1
          : existing.incorrectRecalls || 0,
      lastReviewedAt: Date.now(),
      updatedAt: Date.now(),
    };

    setRevisionCards((prev) => prev.map((c) => (c.id === cardId ? updatedCard : c)));

    if (userId && db) {
      try {
        await updateDoc(doc(db, "revisionCards", cardId), cleanFirestoreData(updatedCard as unknown as Record<string, any>));
      } catch (err) {
        console.error(`[Firestore Error] Failed to update revisionCards/${cardId}:`, err);
      }
    }

    return { card: updatedCard, feedbackMessage: calculation.feedbackMessage };
  };

  const updateRevisionCard = async (cardId: string, updates: Partial<RevisionCard>): Promise<void> => {
    const updatedData = { ...updates, updatedAt: Date.now() };
    setRevisionCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, ...updatedData } : c)));

    if (userId && db) {
      try {
        await updateDoc(doc(db, "revisionCards", cardId), cleanFirestoreData(updatedData));
      } catch (err) {
        console.error(`[Firestore Error] Failed to update revisionCards/${cardId}:`, err);
      }
    }
  };

  const deleteRevisionCard = async (cardId: string): Promise<void> => {
    setRevisionCards((prev) => prev.filter((c) => c.id !== cardId));

    if (userId && db) {
      try {
        await deleteDoc(doc(db, "revisionCards", cardId));
      } catch (err) {
        console.error(`[Firestore Error] Failed to delete revisionCards/${cardId}:`, err);
      }
    }
  };

  const deleteMultipleCards = async (cardIds: string[]): Promise<void> => {
    if (cardIds.length === 0) return;
    const idSet = new Set(cardIds);
    setRevisionCards((prev) => prev.filter((c) => !idSet.has(c.id)));

    if (userId && db) {
      try {
        const batch = writeBatch(db);
        cardIds.forEach((id) => {
          batch.delete(doc(db, "revisionCards", id));
        });
        await batch.commit();
      } catch (err) {
        console.error(`[Firestore Error] Failed batch deletion of revision cards:`, err);
      }
    }
  };

  const deleteAllRevisionCards = async (): Promise<void> => {
    const currentIds = revisionCards.map((c) => c.id);
    setRevisionCards([]);

    if (userId && db && currentIds.length > 0) {
      try {
        const batch = writeBatch(db);
        currentIds.forEach((id) => {
          batch.delete(doc(db, "revisionCards", id));
        });
        await batch.commit();
      } catch (err) {
        console.error(`[Firestore Error] Failed to delete all revision cards:`, err);
      }
    }
  };

  const clearRevisionHistory = async (): Promise<void> => {
    const todayStr = toLocalDateString();
    setRevisionCards((prev) =>
      prev.map((c) => ({
        ...c,
        status: "Developing",
        repetitionIntervalDays: 1,
        easeFactor: 2.5,
        consecutiveCorrect: 0,
        consecutiveIncorrect: 0,
        totalReviews: 0,
        successfulRecalls: 0,
        incorrectRecalls: 0,
        nextReviewDate: todayStr,
        nextReviewTimestamp: Date.now(),
        priorityScore: 50,
        isMastered: false,
        lastReviewedAt: undefined,
        updatedAt: Date.now(),
      }))
    );

    if (userId && db) {
      try {
        const batch = writeBatch(db);
        revisionCards.forEach((c) => {
          batch.update(doc(db, "revisionCards", c.id), {
            status: "Developing",
            repetitionIntervalDays: 1,
            easeFactor: 2.5,
            consecutiveCorrect: 0,
            consecutiveIncorrect: 0,
            totalReviews: 0,
            successfulRecalls: 0,
            incorrectRecalls: 0,
            nextReviewDate: todayStr,
            nextReviewTimestamp: Date.now(),
            priorityScore: 50,
            isMastered: false,
            updatedAt: Date.now(),
          });
        });
        await batch.commit();
      } catch (err) {
        console.error(`[Firestore Error] Failed to clear revision history:`, err);
      }
    }
  };

  const toggleHideCard = async (cardId: string): Promise<void> => {
    const card = revisionCards.find((c) => c.id === cardId);
    if (!card) return;
    const newHidden = !card.isHidden;
    await updateRevisionCard(cardId, { isHidden: newHidden });
  };

  // Calculated Aggregate Stats
  const calculateStats = () => {
    const totalNotes = notes.length;
    const totalQuizzesTaken = quizResults.length;
    const averageScore =
      quizResults.length > 0
        ? Math.round(quizResults.reduce((acc, r) => acc + r.percentage, 0) / quizResults.length)
        : 0;

    let totalTasksInActivePlan = 0;
    let completedTasksInActivePlan = 0;

    if (activePlan) {
      activePlan.weeklyMilestones.forEach((week) => {
        week.days?.forEach((day) => {
          day.tasks?.forEach((t) => {
            totalTasksInActivePlan++;
            if (t.completed) completedTasksInActivePlan++;
          });
        });
      });
    }

    const activePlanProgress =
      totalTasksInActivePlan > 0 ? Math.round((completedTasksInActivePlan / totalTasksInActivePlan) * 100) : 0;

    const todayStr = toLocalDateString();
    const visibleCards = revisionCards.filter((c) => !c.isHidden);
    const dueRevisionCards = visibleCards.filter(
      (c) => c.nextReviewDate <= todayStr || c.totalReviews === 0
    ).length;
    const masteredCardsCount = visibleCards.filter((c) => c.isMastered || c.status === "Mastered").length;

    return {
      totalNotes,
      totalQuizzesTaken,
      averageScore,
      tasksCompleted: user?.completedTasksCount || completedTasksInActivePlan,
      activePlanProgress,
      studyStreak: user?.streakDays || 1,
      totalRevisionCards: visibleCards.length,
      dueRevisionCards,
      masteredCardsCount,
    };
  };

  return (
    <DataContext.Provider
      value={{
        studyPlans,
        activePlan,
        saveStudyPlan,
        updateStudyPlan,
        setActivePlan,
        toggleTaskCompletion,
        deleteStudyPlan,
        deleteAllStudyPlans,
        notes,
        saveNote,
        updateNote,
        deleteNote,
        toggleNoteFavorite,
        quizzes,
        quizResults,
        saveQuiz,
        saveQuizResult,
        deleteQuiz,
        chatSessions,
        activeSession,
        createChatSession,
        selectChatSession,
        addMessageToActiveSession,
        deleteChatSession,
        clearChatSession,
        updateChatSessionTitle,
        revisionCards,
        saveRevisionCards,
        recordCardReview,
        updateRevisionCard,
        deleteRevisionCard,
        deleteMultipleCards,
        deleteAllRevisionCards,
        clearRevisionHistory,
        toggleHideCard,
        stats: calculateStats(),
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
