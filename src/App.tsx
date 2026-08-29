import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import { TimerProvider } from "./context/TimerContext";
import { QuizSessionProvider } from "./context/QuizSessionContext";
import { EnvironmentProvider } from "./context/EnvironmentContext";
import { NavigationTab } from "./types";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { DashboardView } from "./components/dashboard/DashboardView";
import { TutorView } from "./components/tutor/TutorView";
import { PlannerView } from "./components/planner/PlannerView";
import { TimerView } from "./components/timer/TimerView";
import { NotesView } from "./components/notes/NotesView";
import { RevisionView } from "./components/revision/RevisionView";
import { QuizView } from "./components/quiz/QuizView";
import { SettingsView } from "./components/settings/SettingsView";
import { AuthModal } from "./components/auth/AuthModal";
import { UnauthenticatedState } from "./components/auth/UnauthenticatedState";
import { LeaveQuizWarningModal } from "./components/quiz/LeaveQuizWarningModal";
import { Sparkles } from "lucide-react";

function MainContent() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [initialTutorPrompt, setInitialTutorPrompt] = useState<string | undefined>(undefined);
  const [initialTutorSubject, setInitialTutorSubject] = useState<string | undefined>(undefined);
  const [initialTutorNoteContext, setInitialTutorNoteContext] = useState<any>(undefined);

  const handleLaunchTutor = (prompt: string, subject?: string, noteContext?: any) => {
    setInitialTutorPrompt(prompt);
    setInitialTutorSubject(subject);
    setInitialTutorNoteContext(noteContext);
    setCurrentTab("tutor");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-100 animate-pulse">
            <Sparkles className="h-7 w-7" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Connecting to StudyPilot AI...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased font-sans">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openAuthModal={() => setAuthModalOpen(true)}
        openSettingsModal={() => setCurrentTab("settings")}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        {/* Mobile backdrop */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs md:hidden"
          />
        )}

        {/* Main Workspace Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-7xl">
            {!user ? (
              <UnauthenticatedState onOpenAuth={() => setAuthModalOpen(true)} />
            ) : (
              <>
                {currentTab === "dashboard" && (
                  <DashboardView
                    setCurrentTab={setCurrentTab}
                    onLaunchTutorWithPrompt={handleLaunchTutor}
                  />
                )}

                {currentTab === "tutor" && (
                  <TutorView
                    initialPrompt={initialTutorPrompt}
                    initialSubject={initialTutorSubject}
                    initialNoteContext={initialTutorNoteContext}
                  />
                )}

                {currentTab === "planner" && (
                  <PlannerView
                    onOpenTimer={() => setCurrentTab("timer")}
                    onAskMishraJi={handleLaunchTutor}
                  />
                )}

                {currentTab === "timer" && <TimerView />}

                {currentTab === "notes" && <NotesView onAskMishraJi={handleLaunchTutor} />}

                {currentTab === "revision" && <RevisionView />}

                {currentTab === "quizzes" && <QuizView onAskMishraJi={handleLaunchTutor} />}

                {currentTab === "settings" && <SettingsView />}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Authentication Modal */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      {/* Quiz Integrity Early Leave Warning Modal */}
      <LeaveQuizWarningModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <TimerProvider>
          <QuizSessionProvider>
            <EnvironmentProvider>
              <MainContent />
            </EnvironmentProvider>
          </QuizSessionProvider>
        </TimerProvider>
      </DataProvider>
    </AuthProvider>
  );
}
