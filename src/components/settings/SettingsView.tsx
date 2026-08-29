import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { AtmosphereSelector } from "../common/AtmosphereSelector";
import {
  User,
  GraduationCap,
  Target,
  Flame,
  Clock,
  Shield,
  Save,
  Sparkles,
  Database,
  CheckCircle2,
  Palette,
} from "lucide-react";

export const SettingsView: React.FC = () => {
  const { user, updateStudentProfile, isFirebaseActive, signOut } = useAuth();
  const { stats } = useData();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [gradeLevel, setGradeLevel] = useState(user?.gradeLevel || "College / University");
  const [targetGoal, setTargetGoal] = useState(user?.targetGoal || "Score Grade A in All Subjects");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateStudentProfile({
      name,
      gradeLevel,
      targetGoal,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Student Profile & Learning Goals
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Customize your academic background and exam objectives so Gemini tailors every response to you.
        </p>
      </div>

      {/* Profile Card Form */}
      <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white font-bold text-xl shadow-xs">
            {name ? name.charAt(0).toUpperCase() : "S"}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{name || "Student"}</h2>
            <p className="text-xs text-slate-500">{email || "Local Student Session"}</p>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-semibold text-amber-600">
                <Flame className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                {stats.studyStreak} Day Streak
              </span>
              <span>•</span>
              <span>{Math.floor((user?.totalStudyMinutes || 0) / 60)}h logged</span>
            </div>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Profile and learning goals updated successfully!</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Academic Level</label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
            >
              <option value="Middle School / Junior High">Middle School / Junior High</option>
              <option value="High School Senior / AP">High School Senior / AP / IB</option>
              <option value="Undergraduate (College)">Undergraduate (College)</option>
              <option value="Graduate / Pre-Med / Law / PhD">Graduate / Pre-Med / Law / PhD</option>
              <option value="Professional Certification">Professional Certification</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target Academic Goal</label>
            <input
              type="text"
              value={targetGoal}
              onChange={(e) => setTargetGoal(e.target.value)}
              placeholder="e.g. Ace MCAT, 95% in Organic Chem"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => signOut()}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700"
          >
            Sign Out of Account
          </button>

          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Changes</span>
          </button>
        </div>
      </form>

      {/* Global Environmental Atmosphere Section */}
      <AtmosphereSelector variant="settings" />

      {/* Cloud & Security Architecture Details */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Security & Cloud Architecture</h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          • <strong>Server-Side Security:</strong> All Gemini API requests run securely through the backend server, keeping API secrets protected.
        </p>
        <p className="text-xs text-slate-600 leading-relaxed">
          • <strong>Data Isolation:</strong> User sessions, notes, study plans, and quiz performance metrics are isolated per user profile.
        </p>
        <p className="text-xs text-slate-600 leading-relaxed">
          • <strong>Firebase Status:</strong> {isFirebaseActive ? "Connected to Cloud Firestore & Auth." : "Running with authenticated client storage, ready for deployment to Cloud Run or Firebase."}
        </p>
      </div>
    </div>
  );
};
