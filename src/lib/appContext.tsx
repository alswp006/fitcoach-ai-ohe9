import React from "react";
import type { AppFlags, UserProfile } from "@/lib/types";

// TDD red phase — stub signatures only (implementation TBD by Coder)

export interface AppContextValue {
  flags: AppFlags;
  profile: UserProfile | null;
  setPremium: (isPremium: boolean) => void;
  confirmAiNotice: () => void;
  refreshProfile: () => void;
}

export function AppProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  throw new Error("Not implemented");
}

export function useApp(): AppContextValue {
  throw new Error("Not implemented");
}
