import React, { createContext, useCallback, useContext, useState } from "react";
import type { AppFlags, UserProfile } from "@/lib/types";
import { getFlags, saveFlags, getProfile } from "@/lib/storage";

export interface AppContextValue {
  flags: AppFlags;
  profile: UserProfile | null;
  setPremium: (isPremium: boolean) => void;
  confirmAiNotice: () => void;
  refreshProfile: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [flags, setFlags] = useState<AppFlags>(() => getFlags());
  const [profile, setProfile] = useState<UserProfile | null>(() => getProfile());

  const setPremium = useCallback((isPremium: boolean) => {
    setFlags((prev) => {
      const next: AppFlags = isPremium
        ? { ...prev, isPremium: true, premiumSince: Date.now() }
        : { ...prev, isPremium: false };
      saveFlags(next);
      return next;
    });
  }, []);

  const confirmAiNotice = useCallback(() => {
    setFlags((prev) => {
      const next: AppFlags = { ...prev, aiNoticeConfirmed: true };
      saveFlags(next);
      return next;
    });
  }, []);

  const refreshProfile = useCallback(() => {
    setProfile(getProfile());
  }, []);

  return (
    <AppContext.Provider value={{ flags, profile, setPremium, confirmAiNotice, refreshProfile }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return ctx;
}
