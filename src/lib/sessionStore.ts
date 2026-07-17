import type { WorkoutSession } from "@/lib/types";

// TDD red phase — stub signatures only (implementation TBD by Coder)

export function getSessions(): WorkoutSession[] {
  throw new Error("Not implemented");
}

export function getSessionById(sessionId: string): WorkoutSession | null {
  throw new Error("Not implemented");
}

export function saveSession(session: WorkoutSession): boolean {
  throw new Error("Not implemented");
}
