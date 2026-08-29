import React from "react";

export type MishraJiMood = "idle" | "thinking" | "speaking" | "celebrating" | "focused";

interface MishraJiAvatarProps {
  mood?: MishraJiMood;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showStatusBadge?: boolean;
}

export const MishraJiAvatar: React.FC<MishraJiAvatarProps> = ({
  mood = "idle",
  size = "md",
  className = "",
  showStatusBadge = false,
}) => {
  const sizeMap = {
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-xl",
  };

  const ringColor = {
    idle: "ring-indigo-400/40 shadow-indigo-100",
    thinking: "ring-amber-400/80 shadow-amber-200 animate-pulse",
    speaking: "ring-emerald-400/70 shadow-emerald-200",
    celebrating: "ring-rose-400/80 shadow-rose-200 animate-bounce",
    focused: "ring-cyan-400/60 shadow-cyan-200",
  }[mood];

  return (
    <div className={`relative inline-flex shrink-0 items-center justify-center ${className}`}>
      {/* Outer ambient glow */}
      <div
        className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-sky-600 text-white shadow-md ring-2 ${ringColor} ${sizeMap[size]} transition-all duration-300`}
      >
        {/* Stylized Vector Avatar for Mishra Ji (Academic Mentor with Glasses & Warm Demeanor) */}
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-[82%] w-[82%] drop-shadow-xs"
        >
          {/* Backdrop shape */}
          <circle cx="24" cy="24" r="20" fill="url(#mishra-grad)" fillOpacity="0.3" />

          {/* Academic Cap & Halo */}
          <path
            d="M24 8L39 15L24 22L9 15L24 8Z"
            fill="#FBBF24"
            stroke="#F59E0B"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M15 17.8V26.5C15 26.5 18 29.5 24 29.5C30 29.5 33 26.5 33 26.5V17.8"
            stroke="#FDE68A"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Tassel */}
          <path
            d="M37 16.5V23.5M37 23.5L38.5 26.5M37 23.5L35.5 26.5"
            stroke="#FDE047"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Head */}
          <circle cx="24" cy="25" r="9" fill="#FEF3C7" stroke="#FDE68A" strokeWidth="1" />

          {/* Smart Glasses */}
          <circle cx="20.5" cy="24.5" r="2.8" stroke="#1E1B4B" strokeWidth="1.2" fill="#EEF2FF" fillOpacity="0.6" />
          <circle cx="27.5" cy="24.5" r="2.8" stroke="#1E1B4B" strokeWidth="1.2" fill="#EEF2FF" fillOpacity="0.6" />
          <path d="M23.3 24.5H24.7" stroke="#1E1B4B" strokeWidth="1.2" strokeLinecap="round" />

          {/* Eyes */}
          <circle cx="20.5" cy="24.5" r="0.9" fill="#312E81" />
          <circle cx="27.5" cy="24.5" r="0.9" fill="#312E81" />

          {/* Warm Encouraging Smile */}
          {mood === "celebrating" ? (
            <path
              d="M20.5 28.5C21.5 30.5 26.5 30.5 27.5 28.5"
              stroke="#B45309"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          ) : mood === "thinking" ? (
            <path
              d="M21 29C23 28.5 25 28.5 27 29"
              stroke="#B45309"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M21 28.5C22.5 30 25.5 30 27 28.5"
              stroke="#B45309"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          )}

          {/* Kurta / Blazer Collar */}
          <path
            d="M13 41C13 36 17.5 34 24 34C30.5 34 35 36 35 41"
            fill="#312E81"
            stroke="#4338CA"
            strokeWidth="1.5"
          />
          {/* Shirt / Kurta Collar */}
          <path
            d="M20.5 34L24 37.5L27.5 34"
            fill="#FFFFFF"
            stroke="#E0E7FF"
            strokeWidth="1"
          />
          {/* Neat Badge / Accent */}
          <path
            d="M23 37.5L25 37.5L24.5 41H23.5L23 37.5Z"
            fill="#0284C7"
          />

          <defs>
            <linearGradient id="mishra-grad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366F1" />
              <stop offset="1" stopColor="#0284C7" />
            </linearGradient>
          </defs>
        </svg>

        {/* Live Status Pip */}
        {showStatusBadge && (
          <span
            className={`absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full ring-2 ring-white ${
              mood === "thinking"
                ? "bg-amber-400 animate-pulse"
                : mood === "speaking"
                ? "bg-emerald-400 animate-ping"
                : mood === "celebrating"
                ? "bg-rose-400"
                : "bg-emerald-500"
            }`}
          />
        )}
      </div>
    </div>
  );
};

// Aliases for compatibility
export type ArloMood = MishraJiMood;
export const ArloAvatar = MishraJiAvatar;
