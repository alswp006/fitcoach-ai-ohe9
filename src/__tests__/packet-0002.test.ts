import { describe, it, expect, beforeEach, vi } from "vitest";
import { getProfile, saveProfile, getPlan, savePlan, getFlags, saveFlags, getChallenges, saveChallenges, safeParse } from "@/lib/storage";
import type { UserProfile, WorkoutPlan, AppFlags, Challenge } from "@/lib/types";

describe("Storage Helpers — packet-0002 (TDD red phase)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // AC-1: getProfile/saveProfile, getPlan/savePlan, getFlags/saveFlags, getChallenges/saveChallenges
  describe("AC-1: Profile/Plan/Flags/Challenges CRUD operations", () => {
    it("AC-1.1: saveProfile and getProfile roundtrip", () => {
      const profile: UserProfile = {
        tossUserKey: "local",
        nickname: "John",
        heightCm: 180,
        weightKg: 75,
        ageGroup: "30s",
        goal: "muscle",
        level: "intermediate",
        createdAt: 1000,
        updatedAt: 1000,
      };
      saveProfile(profile);
      const retrieved = getProfile();
      expect(retrieved).toEqual(profile);
      expect(retrieved?.tossUserKey).toBe("local");
      expect(retrieved?.nickname).toBe("John");
    });

    it("AC-1.2: savePlan and getPlan roundtrip", () => {
      const plan: WorkoutPlan = {
        planId: "plan_1000",
        weekOf: "2026-W29",
        goal: "muscle",
        days: [
          { day: 1, exercises: [{ exerciseId: "ex_squat", name: "스쿼트", sets: 3, reps: 10, restSec: 60 }] },
        ],
        isAiGenerated: true,
        createdAt: 1000,
      };
      savePlan(plan);
      const retrieved = getPlan();
      expect(retrieved).toEqual(plan);
      expect(retrieved?.planId).toBe("plan_1000");
      expect(retrieved?.goal).toBe("muscle");
    });

    it("AC-1.3: saveFlags and getFlags roundtrip", () => {
      const flags: AppFlags = {
        aiNoticeConfirmed: true,
        onboarded: true,
        isPremium: true,
        premiumSince: 1000,
      };
      saveFlags(flags);
      const retrieved = getFlags();
      expect(retrieved).toEqual(flags);
      expect(retrieved.aiNoticeConfirmed).toBe(true);
      expect(retrieved.isPremium).toBe(true);
    });

    it("AC-1.4: saveChallenges and getChallenges roundtrip", () => {
      const challenges: Challenge[] = [
        {
          challengeId: "chal_1000",
          title: "30일 스쿼트",
          targetSessions: 30,
          startAt: 1000,
          endAt: 2000,
          myProgress: 10,
          inviteCode: "ABC123",
        },
      ];
      saveChallenges(challenges);
      const retrieved = getChallenges();
      expect(retrieved).toEqual(challenges);
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].challengeId).toBe("chal_1000");
    });
  });

  // AC-2: safeParse<T>가 손상 문자열에 fallback 반환·console.error 미호출
  describe("AC-2: safeParse handles corrupted data gracefully without logging errors", () => {
    it("AC-2.1: returns fallback for invalid JSON without calling console.error", () => {
      const spy = vi.spyOn(console, "error");
      const result = safeParse<UserProfile>("{broken", null);
      expect(result).toBe(null);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it("AC-2.2: returns fallback for non-JSON string", () => {
      const fallback: AppFlags = { aiNoticeConfirmed: false, onboarded: false, isPremium: false };
      const result = safeParse<AppFlags>("not json at all", fallback);
      expect(result).toEqual(fallback);
      expect(result.aiNoticeConfirmed).toBe(false);
      expect(result.isPremium).toBe(false);
    });

    it("AC-2.3: returns parsed value for valid JSON", () => {
      const data: AppFlags = { aiNoticeConfirmed: true, onboarded: true, isPremium: false };
      const json = JSON.stringify(data);
      const fallback: AppFlags = { aiNoticeConfirmed: false, onboarded: false, isPremium: false };
      const result = safeParse<AppFlags>(json, fallback);
      expect(result).toEqual(data);
      expect(result.aiNoticeConfirmed).toBe(true);
      expect(result.onboarded).toBe(true);
    });
  });

  // AC-3: 키 부재 시 getter 기본값 반환
  describe("AC-3: Getters return defaults when keys are absent from localStorage", () => {
    it("AC-3.1: getProfile returns null when fitcoach.profile is missing", () => {
      const result = getProfile();
      expect(result).toBe(null);
    });

    it("AC-3.2: getPlan returns null when fitcoach.plan is missing", () => {
      const result = getPlan();
      expect(result).toBe(null);
    });

    it("AC-3.3: getFlags returns default AppFlags when fitcoach.flags is missing", () => {
      const result = getFlags();
      expect(result).toEqual({
        aiNoticeConfirmed: false,
        onboarded: false,
        isPremium: false,
      });
      expect(result.aiNoticeConfirmed).toBe(false);
      expect(result.onboarded).toBe(false);
      expect(result.isPremium).toBe(false);
    });

    it("AC-3.4: getChallenges returns empty array when fitcoach.challenges is missing", () => {
      const result = getChallenges();
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // AC-4: getPlan()이 '{broken'에 null 반환
  describe("AC-4: getPlan returns null for corrupted JSON in storage", () => {
    it("AC-4.1: getPlan returns null when fitcoach.plan contains incomplete JSON '{broken'", () => {
      localStorage.setItem("fitcoach.plan", "{broken");
      const result = getPlan();
      expect(result).toBe(null);
    });

    it("AC-4.2: getPlan returns null when fitcoach.plan is the string 'null'", () => {
      localStorage.setItem("fitcoach.plan", "null");
      const result = getPlan();
      expect(result).toBe(null);
    });

    it("AC-4.3: getPlan returns null for any unparseable JSON", () => {
      localStorage.setItem("fitcoach.plan", "}{not valid json");
      const result = getPlan();
      expect(result).toBe(null);
    });
  });
});
