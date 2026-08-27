import React, { createContext, useContext, useState, useEffect } from "react";
import { StudentProfile } from "../types";
import { auth, db, googleProvider, isFirebaseConfigured } from "../services/firebaseConfig";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

interface AuthContextType {
  user: StudentProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isFirebaseActive: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, pass: string, gradeLevel?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateStudentProfile: (updates: Partial<StudentProfile>) => Promise<void>;
  recordStudySession: (minutes: number) => Promise<void>;
  recordTaskCompleted: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StudentProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync streak logic
  const checkAndUpdateStreak = (profile: StudentProfile): { profile: StudentProfile; changed: boolean } => {
    const today = new Date().toISOString().split("T")[0];
    const lastDate = profile.lastStudyDate;

    if (!lastDate) {
      return {
        profile: { ...profile, streakDays: 1, lastStudyDate: today },
        changed: true,
      };
    }

    if (lastDate === today) {
      return { profile, changed: false };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (lastDate === yesterdayStr) {
      return {
        profile: {
          ...profile,
          streakDays: (profile.streakDays || 0) + 1,
          lastStudyDate: today,
        },
        changed: true,
      };
    } else {
      return {
        profile: {
          ...profile,
          streakDays: 1,
          lastStudyDate: today,
        },
        changed: true,
      };
    }
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        try {
          if (db) {
            const userDocRef = doc(db, "users", fbUser.uid);
            const userSnap = await getDoc(userDocRef);

            if (userSnap.exists()) {
              const data = userSnap.data() as StudentProfile;
              const { profile: updated, changed } = checkAndUpdateStreak(data);
              setUser(updated);

              if (changed) {
                await updateDoc(userDocRef, {
                  streakDays: updated.streakDays,
                  lastStudyDate: updated.lastStudyDate,
                }).catch((e) => console.warn("Could not sync streak:", e));
              }
            } else {
              // Create initial user doc in Firestore
              const newProfile: StudentProfile = {
                uid: fbUser.uid,
                name: fbUser.displayName || fbUser.email?.split("@")[0] || "Student",
                email: fbUser.email || "",
                avatarUrl: fbUser.photoURL || undefined,
                gradeLevel: "College / University",
                targetGoal: "Master core subjects & ace exams",
                streakDays: 1,
                lastStudyDate: new Date().toISOString().split("T")[0],
                totalStudyMinutes: 0,
                completedTasksCount: 0,
              };

              await setDoc(userDocRef, newProfile);
              setUser(newProfile);
            }
          } else {
            // Fallback profile
            const fallbackProfile: StudentProfile = {
              uid: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split("@")[0] || "Student",
              email: fbUser.email || "",
              avatarUrl: fbUser.photoURL || undefined,
              gradeLevel: "College / University",
              targetGoal: "Ace exams & master coursework",
              streakDays: 1,
              lastStudyDate: new Date().toISOString().split("T")[0],
              totalStudyMinutes: 0,
              completedTasksCount: 0,
            };
            setUser(fallbackProfile);
          }
        } catch (err) {
          console.error("Error loading user profile from Firestore:", err);
          // Fallback if Firestore query encountered temporary issue
          setUser({
            uid: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split("@")[0] || "Student",
            email: fbUser.email || "",
            avatarUrl: fbUser.photoURL || undefined,
            gradeLevel: "College / University",
            targetGoal: "Master core subjects & ace exams",
            streakDays: 1,
            lastStudyDate: new Date().toISOString().split("T")[0],
            totalStudyMinutes: 0,
            completedTasksCount: 0,
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    if (!auth) throw new Error("Firebase Auth is not initialized.");
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUpWithEmail = async (
    name: string,
    email: string,
    pass: string,
    gradeLevel: string = "College / University"
  ) => {
    if (!auth) throw new Error("Firebase Auth is not initialized.");
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      await firebaseUpdateProfile(cred.user, { displayName: name });
      if (db) {
        const userDocRef = doc(db, "users", cred.user.uid);
        const newProfile: StudentProfile = {
          uid: cred.user.uid,
          name: name || email.split("@")[0],
          email: email,
          gradeLevel: gradeLevel,
          targetGoal: "Excel in coursework & exams",
          streakDays: 1,
          lastStudyDate: new Date().toISOString().split("T")[0],
          totalStudyMinutes: 0,
          completedTasksCount: 0,
        };
        await setDoc(userDocRef, newProfile);
        setUser(newProfile);
      }
    }
  };

  const signInWithGoogle = async () => {
    if (!auth) throw new Error("Firebase Auth is not initialized.");
    await signInWithPopup(auth, googleProvider);
  };

  const signOut = async () => {
    if (auth) {
      await firebaseSignOut(auth);
    }
    setUser(null);
    setFirebaseUser(null);
  };

  const updateStudentProfile = async (updates: Partial<StudentProfile>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);

    if (db && user.uid) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, updates);
      } catch (err) {
        console.error("Failed to update profile in Firestore:", err);
      }
    }
  };

  const recordStudySession = async (minutes: number) => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const newMinutes = (user.totalStudyMinutes || 0) + minutes;
    const updated = {
      ...user,
      totalStudyMinutes: newMinutes,
      lastStudyDate: today,
    };
    setUser(updated);

    if (db && user.uid) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
          totalStudyMinutes: newMinutes,
          lastStudyDate: today,
        });
      } catch (err) {
        console.error("Failed to record study session in Firestore:", err);
      }
    }
  };

  const recordTaskCompleted = async () => {
    if (!user) return;
    const newCount = (user.completedTasksCount || 0) + 1;
    const updated = {
      ...user,
      completedTasksCount: newCount,
    };
    setUser(updated);

    if (db && user.uid) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
          completedTasksCount: newCount,
        });
      } catch (err) {
        console.error("Failed to record task completed in Firestore:", err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        isFirebaseActive: isFirebaseConfigured,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        updateStudentProfile,
        recordStudySession,
        recordTaskCompleted,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
