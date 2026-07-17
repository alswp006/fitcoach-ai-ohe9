import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { WorkoutSession, Challenge } from "@/lib/types";

// These functions will be created in src/lib/sessionStore.ts
// For now, we import from the location they will exist
import {
  getSessions,
  getSessionById,
  saveSession,
} from "@/lib/sessionStore";

describe("Session Storage — packet-0003 (TDD red phase: FIFO 100 + quota retry + challenge auto-increment)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Storage.prototype.setItem is spied on directly in the AC-4 quota tests below —
  // restore it after every test so the mock doesn't leak into unrelated tests.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // AC-1: getSessions, getSessionById, saveSession(s):boolean 구현
  describe("AC-1: Session CRUD operations (getSessions, getSessionById, saveSession)", () => {
    it("AC-1.1: getSessions returns empty array when fitcoach.sessions is missing", () => {
      const sessions = getSessions();
      expect(sessions).toEqual([]);
      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBe(0);
    });

    it("AC-1.2: getSessionById returns null for non-existent sessionId", () => {
      const session = getSessionById("sess_nonexistent");
      expect(session).toBe(null);
    });

    it("AC-1.3: saveSession returns true on success", () => {
      const newSession: WorkoutSession = {
        sessionId: `sess_${Date.now()}`,
        exerciseId: "ex_squat",
        exerciseName: "스쿼트",
        startedAt: Date.now(),
        durationSec: 300,
        completedReps: 20,
        kcal: 45,
      };
      const result = saveSession(newSession);
      expect(result).toBe(true);
    });
  });

  // AC-2: 5개 있을 때 저장 시 길이 6·맨앞 신규
  describe("AC-2: Adding a new session to 5 existing sessions results in length 6 with new session at front", () => {
    it("AC-2.1: saveSession adds session to front when array has 5 items", () => {
      const now = Date.now();
      const existing5: WorkoutSession[] = Array.from({ length: 5 }, (_, i) => ({
        sessionId: `sess_old_${i}`,
        exerciseId: "ex_squat",
        exerciseName: "스쿼트",
        startedAt: now - 5000 + i * 1000,
        durationSec: 300,
        completedReps: 20,
        kcal: 45,
      }));
      localStorage.setItem("fitcoach.sessions", JSON.stringify(existing5));

      const newSession: WorkoutSession = {
        sessionId: "sess_new_1",
        exerciseId: "ex_pushup",
        exerciseName: "팔굽혀펴기",
        startedAt: now,
        durationSec: 180,
        completedReps: 15,
        kcal: 35,
      };

      const result = saveSession(newSession);
      expect(result).toBe(true);

      const stored = getSessions();
      expect(stored.length).toBe(6);
      expect(stored[0].sessionId).toBe("sess_new_1");
      expect(stored[0].exerciseName).toBe("팔굽혀펴기");
    });

    it("AC-2.2: After saveSession, getSessions preserves all original items except first is new", () => {
      const now = Date.now();
      const existing5: WorkoutSession[] = Array.from({ length: 5 }, (_, i) => ({
        sessionId: `sess_${i}`,
        exerciseId: "ex_squat",
        exerciseName: "스쿼트",
        startedAt: now - 5000 + i * 1000,
        durationSec: 300,
        completedReps: 20,
        kcal: 45,
      }));
      localStorage.setItem("fitcoach.sessions", JSON.stringify(existing5));

      const newSession: WorkoutSession = {
        sessionId: "sess_new",
        exerciseId: "ex_plank",
        exerciseName: "플랭크",
        startedAt: now,
        durationSec: 120,
        completedReps: 1,
        kcal: 15,
      };

      saveSession(newSession);
      const stored = getSessions();

      expect(stored.length).toBe(6);
      expect(stored[0].sessionId).toBe("sess_new");
      expect(stored[1].sessionId).toBe("sess_4");
      expect(stored[5].sessionId).toBe("sess_0");
    });
  });

  // AC-3: 100개 상한 시 가장 오래된 1개 제거 FIFO
  describe("AC-3: 100-item limit enforced with FIFO eviction of oldest item", () => {
    it("AC-3.1: saveSession maintains exactly 100 items when 100 already exist", () => {
      const now = Date.now();
      const existing100: WorkoutSession[] = Array.from({ length: 100 }, (_, i) => ({
        sessionId: `sess_${i}`,
        exerciseId: "ex_squat",
        exerciseName: "스쿼트",
        startedAt: now - 100000 + i * 1000,
        durationSec: 300,
        completedReps: 20,
        kcal: 45,
      }));
      localStorage.setItem("fitcoach.sessions", JSON.stringify(existing100));

      const newSession: WorkoutSession = {
        sessionId: "sess_new_101",
        exerciseId: "ex_pushup",
        exerciseName: "팔굽혀펴기",
        startedAt: now,
        durationSec: 180,
        completedReps: 15,
        kcal: 35,
      };

      saveSession(newSession);
      const stored = getSessions();

      expect(stored.length).toBe(100);
      expect(stored[0].sessionId).toBe("sess_new_101");
      expect(stored[99].sessionId).toBe("sess_1");
    });

    it("AC-3.2: When 100 items exist, oldest (sess_0) is removed after saving new item", () => {
      const now = Date.now();
      const existing100: WorkoutSession[] = Array.from({ length: 100 }, (_, i) => ({
        sessionId: `sess_${i}`,
        exerciseId: "ex_squat",
        exerciseName: "스쿼트",
        startedAt: now - 100000 + i * 1000,
        durationSec: 300,
        completedReps: 20,
        kcal: 45,
      }));
      localStorage.setItem("fitcoach.sessions", JSON.stringify(existing100));

      const newSession: WorkoutSession = {
        sessionId: "sess_new_last",
        exerciseId: "ex_deadlift",
        exerciseName: "데드리프트",
        startedAt: now,
        durationSec: 500,
        completedReps: 5,
        kcal: 60,
      };

      saveSession(newSession);
      const stored = getSessions();

      // sess_0 should be evicted
      const sessionIds = stored.map((s) => s.sessionId);
      expect(sessionIds).not.toContain("sess_0");
      expect(sessionIds).toContain("sess_1");
      expect(sessionIds).toContain("sess_new_last");
      expect(stored.length).toBe(100);
    });
  });

  // AC-4: QuotaExceededError 시 10개 제거 재시도, 실패 시 false
  describe("AC-4: QuotaExceededError handling — remove 10 items and retry, return false if retry fails", () => {
    it("AC-4.1: saveSession catches QuotaExceededError and removes 10 oldest items before retry", () => {
      const now = Date.now();
      const existing50: WorkoutSession[] = Array.from({ length: 50 }, (_, i) => ({
        sessionId: `sess_${i}`,
        exerciseId: "ex_squat",
        exerciseName: "스쿼트",
        startedAt: now - 50000 + i * 1000,
        durationSec: 300,
        completedReps: 20,
        kcal: 45,
      }));
      localStorage.setItem("fitcoach.sessions", JSON.stringify(existing50));

      // Mock setItem to throw QuotaExceededError on first call, succeed on second
      let callCount = 0;
      const originalSetItem = localStorage.setItem;
      vi.spyOn(Storage.prototype, "setItem").mockImplementation((key, value) => {
        callCount++;
        if (callCount === 1 && key === "fitcoach.sessions") {
          const error = new Error("QuotaExceededError") as any;
          error.name = "QuotaExceededError";
          throw error;
        }
        originalSetItem.call(localStorage, key, value);
      });

      const newSession: WorkoutSession = {
        sessionId: "sess_new_quota_test",
        exerciseId: "ex_pushup",
        exerciseName: "팔굽혀펴기",
        startedAt: now,
        durationSec: 180,
        completedReps: 15,
        kcal: 35,
      };

      const result = saveSession(newSession);

      // After retry, should succeed and remove 10 oldest
      expect(result).toBe(true);
      const stored = getSessions();
      expect(stored.length).toBe(41); // 50 - 10 + 1
      expect(stored[0].sessionId).toBe("sess_new_quota_test");
    });

    it("AC-4.2: saveSession returns false if QuotaExceededError persists after retry", () => {
      const now = Date.now();
      const existing50: WorkoutSession[] = Array.from({ length: 50 }, (_, i) => ({
        sessionId: `sess_${i}`,
        exerciseId: "ex_squat",
        exerciseName: "스쿼트",
        startedAt: now - 50000 + i * 1000,
        durationSec: 300,
        completedReps: 20,
        kcal: 45,
      }));
      localStorage.setItem("fitcoach.sessions", JSON.stringify(existing50));

      // Mock setItem to always throw QuotaExceededError
      vi.spyOn(Storage.prototype, "setItem").mockImplementation((key, value) => {
        if (key === "fitcoach.sessions") {
          const error = new Error("QuotaExceededError") as any;
          error.name = "QuotaExceededError";
          throw error;
        }
      });

      const newSession: WorkoutSession = {
        sessionId: "sess_new_fail",
        exerciseId: "ex_pushup",
        exerciseName: "팔굽혀펴기",
        startedAt: now,
        durationSec: 180,
        completedReps: 15,
        kcal: 35,
      };

      const result = saveSession(newSession);
      expect(result).toBe(false);
    });

    it("AC-4.3: After 10-item eviction, array length is reduced by exactly 10", () => {
      const now = Date.now();
      const existing50: WorkoutSession[] = Array.from({ length: 50 }, (_, i) => ({
        sessionId: `sess_${i}`,
        exerciseId: "ex_squat",
        exerciseName: "스쿼트",
        startedAt: now - 50000 + i * 1000,
        durationSec: 300,
        completedReps: 20,
        kcal: 45,
      }));
      localStorage.setItem("fitcoach.sessions", JSON.stringify(existing50));

      let callCount = 0;
      const originalSetItem = localStorage.setItem;
      vi.spyOn(Storage.prototype, "setItem").mockImplementation((key, value) => {
        callCount++;
        if (callCount === 1 && key === "fitcoach.sessions") {
          const error = new Error("QuotaExceededError") as any;
          error.name = "QuotaExceededError";
          throw error;
        }
        originalSetItem.call(localStorage, key, value);
      });

      const newSession: WorkoutSession = {
        sessionId: "sess_new_check_eviction",
        exerciseId: "ex_pushup",
        exerciseName: "팔굽혀펴기",
        startedAt: now,
        durationSec: 180,
        completedReps: 15,
        kcal: 35,
      };

      saveSession(newSession);
      const stored = getSessions();

      // 50 - 10 + 1 = 41
      expect(stored.length).toBe(41);
      // Oldest 10 (sess_0 to sess_9) should be gone
      stored.forEach((s: WorkoutSession) => {
        const id = parseInt(s.sessionId.split("_")[1], 10);
        if (Number.isNaN(id)) return; // the newly saved session isn't part of the sess_N pool
        expect(id).toBeGreaterThanOrEqual(10);
      });
    });
  });

  // AC-5: 성공 시 진행중 챌린지 myProgress +1 저장
  describe("AC-5: Challenge auto-increment — saveSession increments matching active challenges", () => {
    it("AC-5.1: saveSession increments myProgress for active challenge (startAt <= now <= endAt)", () => {
      const now = Date.now();
      const challenge: Challenge = {
        challengeId: "chal_1",
        title: "7일 스쿼트",
        targetSessions: 7,
        startAt: now - 86400000, // 1 day ago
        endAt: now + 86400000, // 1 day later
        myProgress: 2,
        inviteCode: "ABC123",
      };
      localStorage.setItem("fitcoach.challenges", JSON.stringify([challenge]));

      const newSession: WorkoutSession = {
        sessionId: `sess_${now}`,
        exerciseId: "ex_squat",
        exerciseName: "스쿼트",
        startedAt: now,
        durationSec: 300,
        completedReps: 20,
        kcal: 45,
      };

      const result = saveSession(newSession);
      expect(result).toBe(true);

      const storedChallenges = JSON.parse(localStorage.getItem("fitcoach.challenges") || "[]");
      expect(storedChallenges).toHaveLength(1);
      expect(storedChallenges[0].myProgress).toBe(3);
      expect(storedChallenges[0].challengeId).toBe("chal_1");
    });

    it("AC-5.2: saveSession does NOT increment challenge if current time is before startAt", () => {
      const now = Date.now();
      const challenge: Challenge = {
        challengeId: "chal_future",
        title: "미래 챌린지",
        targetSessions: 7,
        startAt: now + 86400000, // 1 day in future
        endAt: now + 172800000, // 2 days in future
        myProgress: 0,
        inviteCode: "XYZ789",
      };
      localStorage.setItem("fitcoach.challenges", JSON.stringify([challenge]));

      const newSession: WorkoutSession = {
        sessionId: `sess_${now}`,
        exerciseId: "ex_squat",
        exerciseName: "스쿼트",
        startedAt: now,
        durationSec: 300,
        completedReps: 20,
        kcal: 45,
      };

      saveSession(newSession);

      const storedChallenges = JSON.parse(localStorage.getItem("fitcoach.challenges") || "[]");
      expect(storedChallenges[0].myProgress).toBe(0);
    });

    it("AC-5.3: saveSession does NOT increment challenge if current time is after endAt", () => {
      const now = Date.now();
      const challenge: Challenge = {
        challengeId: "chal_past",
        title: "지난 챌린지",
        targetSessions: 7,
        startAt: now - 259200000, // 3 days ago
        endAt: now - 86400000, // 1 day ago
        myProgress: 5,
        inviteCode: "OLD999",
      };
      localStorage.setItem("fitcoach.challenges", JSON.stringify([challenge]));

      const newSession: WorkoutSession = {
        sessionId: `sess_${now}`,
        exerciseId: "ex_squat",
        exerciseName: "스쿼트",
        startedAt: now,
        durationSec: 300,
        completedReps: 20,
        kcal: 45,
      };

      saveSession(newSession);

      const storedChallenges = JSON.parse(localStorage.getItem("fitcoach.challenges") || "[]");
      expect(storedChallenges[0].myProgress).toBe(5);
    });

    it("AC-5.4: saveSession increments multiple active challenges simultaneously", () => {
      const now = Date.now();
      const challenges: Challenge[] = [
        {
          challengeId: "chal_1",
          title: "7일 스쿼트",
          targetSessions: 7,
          startAt: now - 86400000,
          endAt: now + 86400000,
          myProgress: 2,
          inviteCode: "ABC123",
        },
        {
          challengeId: "chal_2",
          title: "30일 팔굽혀펴기",
          targetSessions: 30,
          startAt: now - 86400000,
          endAt: now + 2592000000, // 30 days
          myProgress: 5,
          inviteCode: "DEF456",
        },
      ];
      localStorage.setItem("fitcoach.challenges", JSON.stringify(challenges));

      const newSession: WorkoutSession = {
        sessionId: `sess_${now}`,
        exerciseId: "ex_pushup",
        exerciseName: "팔굽혀펴기",
        startedAt: now,
        durationSec: 180,
        completedReps: 15,
        kcal: 35,
      };

      saveSession(newSession);

      const storedChallenges: Challenge[] = JSON.parse(localStorage.getItem("fitcoach.challenges") || "[]");
      expect(storedChallenges).toHaveLength(2);
      expect(storedChallenges[0].myProgress).toBe(3);
      expect(storedChallenges[1].myProgress).toBe(6);
    });

    it("AC-5.5: getSessionById returns the saved session after saveSession succeeds", () => {
      const now = Date.now();
      const newSession: WorkoutSession = {
        sessionId: "sess_retrieve_test",
        exerciseId: "ex_squat",
        exerciseName: "스쿼트",
        startedAt: now,
        durationSec: 300,
        completedReps: 20,
        kcal: 45,
      };

      saveSession(newSession);
      const retrieved = getSessionById("sess_retrieve_test");

      expect(retrieved).not.toBe(null);
      expect(retrieved?.sessionId).toBe("sess_retrieve_test");
      expect(retrieved?.exerciseId).toBe("ex_squat");
      expect(retrieved?.completedReps).toBe(20);
      expect(retrieved?.kcal).toBe(45);
    });
  });
});
