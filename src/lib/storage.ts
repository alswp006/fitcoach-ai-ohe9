import type { UserProfile, WorkoutPlan, AppFlags, Challenge } from "@/lib/types";

// Generic helpers
export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

// safeParse<T>: JSON.parse wrapper that returns fallback on error, never logs
export function safeParse<T>(raw: string, fallback: T): T;
export function safeParse<T>(raw: string, fallback: null): T | null;
export function safeParse<T>(raw: string, fallback: T | null): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// Profile storage (fitcoach.profile)
export function getProfile(): UserProfile | null {
  const raw = localStorage.getItem("fitcoach.profile");
  if (!raw) return null;
  return safeParse<UserProfile>(raw, null);
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem("fitcoach.profile", JSON.stringify(profile));
}

// Plan storage (fitcoach.plan)
export function getPlan(): WorkoutPlan | null {
  const raw = localStorage.getItem("fitcoach.plan");
  if (!raw) return null;
  return safeParse<WorkoutPlan>(raw, null);
}

export function savePlan(plan: WorkoutPlan): void {
  localStorage.setItem("fitcoach.plan", JSON.stringify(plan));
}

// Flags storage (fitcoach.flags) — default provided
const DEFAULT_FLAGS: AppFlags = {
  aiNoticeConfirmed: false,
  onboarded: false,
  isPremium: false,
};

export function getFlags(): AppFlags {
  const raw = localStorage.getItem("fitcoach.flags");
  if (!raw) return DEFAULT_FLAGS;
  return safeParse<AppFlags>(raw, DEFAULT_FLAGS);
}

export function saveFlags(flags: AppFlags): void {
  localStorage.setItem("fitcoach.flags", JSON.stringify(flags));
}

// Challenges storage (fitcoach.challenges) — default empty array
export function getChallenges(): Challenge[] {
  const raw = localStorage.getItem("fitcoach.challenges");
  if (!raw) return [];
  return safeParse<Challenge[]>(raw, []);
}

export function saveChallenges(challenges: Challenge[]): void {
  localStorage.setItem("fitcoach.challenges", JSON.stringify(challenges));
}
