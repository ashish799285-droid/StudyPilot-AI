import React, { createContext, useContext, useState, useEffect } from "react";

export type Atmosphere = "morning" | "sunset" | "night";
export type AtmosphereMode = "auto" | "morning" | "sunset" | "night";

// Backwards compatibility aliases
export type TimeOfDay = Atmosphere | "afternoon" | "evening";
export type TimeOfDayMode = AtmosphereMode;

interface EnvironmentContextType {
  atmosphere: Atmosphere;
  atmosphereMode: AtmosphereMode;
  setAtmosphereMode: (mode: AtmosphereMode) => void;
  // Aliases for compatibility
  timeOfDay: Atmosphere;
  timeOfDayMode: AtmosphereMode;
  setTimeOfDayMode: (mode: AtmosphereMode) => void;
  ambientEnabled: boolean;
  setAmbientEnabled: (enabled: boolean) => void;
  toggleAmbient: () => void;
  lampOn: boolean;
  setLampOn: (on: boolean) => void;
  toggleLamp: () => void;
  reducedMotion: boolean;
  setReducedMotion: (reduced: boolean) => void;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

/**
 * Evaluates local user time to choose the active atmosphere:
 * 05:00 – 16:59 -> "morning" (Fresh daylight, soft sunbeam)
 * 17:00 – 19:29 -> "sunset" (Golden hour, warm glow, cozy library)
 * 19:30 – 04:59 -> "night" (Quiet midnight, lamp-lit private desk)
 */
export const getSystemAtmosphere = (): Atmosphere => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // 05:00 = 300 minutes, 17:00 = 1020 minutes, 19:30 = 1170 minutes
  if (totalMinutes >= 300 && totalMinutes < 1020) {
    return "morning";
  } else if (totalMinutes >= 1020 && totalMinutes < 1170) {
    return "sunset";
  } else {
    return "night";
  }
};

export const EnvironmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [atmosphereMode, setAtmosphereModeState] = useState<AtmosphereMode>(() => {
    const saved = localStorage.getItem("studypilot_atmosphere_mode");
    if (saved === "morning" || saved === "sunset" || saved === "night" || saved === "auto") {
      return saved as AtmosphereMode;
    }
    const legacy = localStorage.getItem("studypilot_env_time_mode");
    if (legacy === "morning" || legacy === "night" || legacy === "auto") {
      return legacy as AtmosphereMode;
    }
    if (legacy === "evening" || legacy === "afternoon") {
      return legacy === "evening" ? "sunset" : "morning";
    }
    return "auto";
  });

  const [ambientEnabled, setAmbientEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem("studypilot_env_ambient");
    return saved !== null ? saved === "true" : true;
  });

  const [lampOn, setLampOnState] = useState<boolean>(() => {
    const hour = new Date().getHours();
    return hour >= 17 || hour < 6;
  });

  const [reducedMotion, setReducedMotionState] = useState<boolean>(() => {
    const saved = localStorage.getItem("studypilot_env_reduced_motion");
    if (saved !== null) {
      return saved === "true";
    }
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });

  const [atmosphere, setAtmosphere] = useState<Atmosphere>(() => {
    return atmosphereMode === "auto" ? getSystemAtmosphere() : (atmosphereMode as Atmosphere);
  });

  // Keep atmosphere in sync with local time during AUTO mode (checked every 30s)
  useEffect(() => {
    if (atmosphereMode === "auto") {
      setAtmosphere(getSystemAtmosphere());
      const interval = setInterval(() => {
        setAtmosphere((prev) => {
          const next = getSystemAtmosphere();
          return prev !== next ? next : prev;
        });
      }, 30000);
      return () => clearInterval(interval);
    } else {
      setAtmosphere(atmosphereMode);
    }
  }, [atmosphereMode]);

  const setAtmosphereMode = (mode: AtmosphereMode) => {
    setAtmosphereModeState(mode);
    localStorage.setItem("studypilot_atmosphere_mode", mode);
    localStorage.setItem("studypilot_env_time_mode", mode);
    if (mode === "auto") {
      setAtmosphere(getSystemAtmosphere());
    } else {
      setAtmosphere(mode);
    }
  };

  const setAmbientEnabled = (enabled: boolean) => {
    setAmbientEnabledState(enabled);
    localStorage.setItem("studypilot_env_ambient", String(enabled));
  };

  const toggleAmbient = () => {
    setAmbientEnabled(!ambientEnabled);
  };

  const setLampOn = (on: boolean) => {
    setLampOnState(on);
  };

  const toggleLamp = () => {
    setLampOnState((prev) => !prev);
  };

  const setReducedMotion = (reduced: boolean) => {
    setReducedMotionState(reduced);
    localStorage.setItem("studypilot_env_reduced_motion", String(reduced));
  };

  return (
    <EnvironmentContext.Provider
      value={{
        atmosphere,
        atmosphereMode,
        setAtmosphereMode,
        timeOfDay: atmosphere,
        timeOfDayMode: atmosphereMode,
        setTimeOfDayMode: setAtmosphereMode,
        ambientEnabled,
        setAmbientEnabled,
        toggleAmbient,
        lampOn,
        setLampOn,
        toggleLamp,
        reducedMotion,
        setReducedMotion,
      }}
    >
      {children}
    </EnvironmentContext.Provider>
  );
};

export const useEnvironment = () => {
  const context = useContext(EnvironmentContext);
  if (!context) {
    throw new Error("useEnvironment must be used within an EnvironmentProvider");
  }
  return context;
};
