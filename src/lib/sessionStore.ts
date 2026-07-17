import type { WorkoutSession } from "@/lib/types";
import { getChallenges, saveChallenges } from "@/lib/storage";

const SESSIONS_KEY = "fitcoach.sessions";
const MAX_SESSIONS = 100;
const QUOTA_EVICT_COUNT = 10;

export function getSessions(): WorkoutSession[] {
  const raw = localStorage.getItem(SESSIONS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as WorkoutSession[];
  } catch {
    return [];
  }
}

export function getSessionById(sessionId: string): WorkoutSession | null {
  const session = getSessions().find((s) => s.sessionId === sessionId);
  return session ?? null;
}

function isQuotaExceededError(error: unknown): boolean {
  return error instanceof Error && error.name === "QuotaExceededError";
}

function sortByStartedAtDesc(sessions: WorkoutSession[]): WorkoutSession[] {
  return [...sessions].sort((a, b) => b.startedAt - a.startedAt);
}

function writeSessions(session: WorkoutSession, source: WorkoutSession[]): void {
  const combined = sortByStartedAtDesc([session, ...source]).slice(0, MAX_SESSIONS);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(combined));
}

function incrementActiveChallenges(now: number): void {
  const challenges = getChallenges();
  if (challenges.length === 0) return;
  const updated = challenges.map((c) =>
    c.startAt <= now && now <= c.endAt
      ? { ...c, myProgress: Math.min(c.myProgress + 1, c.targetSessions) }
      : c,
  );
  saveChallenges(updated);
}

export function updateSession(
  sessionId: string,
  patch: Partial<WorkoutSession>,
): WorkoutSession | null {
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => s.sessionId === sessionId);
  if (idx === -1) return null;

  const updated = { ...sessions[idx], ...patch };
  const next = [...sessions];
  next[idx] = updated;
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
  return updated;
}

export function saveSession(session: WorkoutSession): boolean {
  const existing = getSessions();

  try {
    writeSessions(session, existing);
  } catch (error) {
    if (!isQuotaExceededError(error)) return false;
    try {
      const oldestFirst = [...existing].sort((a, b) => a.startedAt - b.startedAt);
      writeSessions(session, oldestFirst.slice(QUOTA_EVICT_COUNT));
    } catch {
      return false;
    }
  }

  incrementActiveChallenges(Date.now());
  return true;
}
