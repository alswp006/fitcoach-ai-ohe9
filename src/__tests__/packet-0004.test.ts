import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import type { AppFlags, UserProfile } from "@/lib/types";

// src/lib/appContext.tsx does not exist yet — TDD red phase.
import { AppProvider, useApp } from "@/lib/appContext";

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(AppProvider, null, children);
}

describe("앱 상태 관리 (AppContext) — packet-0004", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // AC-1[P0]: AppProvider + useApp() 제공: {flags,profile,setPremium,confirmAiNotice,refreshProfile}
  describe("AC-1[P0]: useApp() exposes the expected shape", () => {
    it("AC-1.1: returns flags, profile, setPremium, confirmAiNotice, refreshProfile", () => {
      const { result } = renderHook(() => useApp(), { wrapper });

      expect(typeof result.current.setPremium).toBe("function");
      expect(typeof result.current.confirmAiNotice).toBe("function");
      expect(typeof result.current.refreshProfile).toBe("function");
      expect(result.current.flags).toBeDefined();
      expect(result.current.profile).toBe(null);
    });

    it("AC-1.2: flags defaults to aiNoticeConfirmed=false, onboarded=false, isPremium=false when storage is empty", () => {
      const { result } = renderHook(() => useApp(), { wrapper });

      expect(result.current.flags.aiNoticeConfirmed).toBe(false);
      expect(result.current.flags.onboarded).toBe(false);
      expect(result.current.flags.isPremium).toBe(false);
    });
  });

  // AC-2[P0]: 마운트 시 storage 초기값 로드
  describe("AC-2[P0]: loads initial flags/profile from storage on mount", () => {
    it("AC-2.1: loads pre-seeded flags from fitcoach.flags on mount", () => {
      const seededFlags: AppFlags = {
        aiNoticeConfirmed: true,
        onboarded: true,
        isPremium: true,
        premiumSince: 1700000000000,
      };
      localStorage.setItem("fitcoach.flags", JSON.stringify(seededFlags));

      const { result } = renderHook(() => useApp(), { wrapper });

      expect(result.current.flags.aiNoticeConfirmed).toBe(true);
      expect(result.current.flags.onboarded).toBe(true);
      expect(result.current.flags.isPremium).toBe(true);
      expect(result.current.flags.premiumSince).toBe(1700000000000);
    });

    it("AC-2.2: loads pre-seeded profile from fitcoach.profile on mount", () => {
      const seededProfile: UserProfile = {
        tossUserKey: "local",
        nickname: "헬린이",
        heightCm: 170,
        weightKg: 65,
        ageGroup: "30s",
        goal: "diet",
        level: "beginner",
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      };
      localStorage.setItem("fitcoach.profile", JSON.stringify(seededProfile));

      const { result } = renderHook(() => useApp(), { wrapper });

      expect(result.current.profile).not.toBe(null);
      expect(result.current.profile?.nickname).toBe("헬린이");
      expect(result.current.profile?.goal).toBe("diet");
    });
  });

  // AC-3[P0]: setPremium(true) 시 isPremium=true·premiumSince=now 저장
  describe("AC-3[P0]: setPremium(true) sets isPremium=true and premiumSince=now, persisted to storage", () => {
    it("AC-3.1: setPremium(true) updates in-memory flags and persists to fitcoach.flags", () => {
      const before = Date.now();
      const { result } = renderHook(() => useApp(), { wrapper });

      act(() => {
        result.current.setPremium(true);
      });
      const after = Date.now();

      expect(result.current.flags.isPremium).toBe(true);
      expect(result.current.flags.premiumSince).toBeGreaterThanOrEqual(before);
      expect(result.current.flags.premiumSince).toBeLessThanOrEqual(after);

      const stored = JSON.parse(localStorage.getItem("fitcoach.flags") ?? "{}");
      expect(stored.isPremium).toBe(true);
      expect(stored.premiumSince).toBe(result.current.flags.premiumSince);
    });

    it("AC-3.2: confirmAiNotice() sets aiNoticeConfirmed=true and persists to fitcoach.flags", () => {
      const { result } = renderHook(() => useApp(), { wrapper });

      act(() => {
        result.current.confirmAiNotice();
      });

      expect(result.current.flags.aiNoticeConfirmed).toBe(true);

      const stored = JSON.parse(localStorage.getItem("fitcoach.flags") ?? "{}");
      expect(stored.aiNoticeConfirmed).toBe(true);
    });
  });

  // AC-4[P1]: 페이지 미연결 상태에서도 컴파일/렌더 가능
  describe("AC-4[P1]: renders/compiles standalone without being wired into a page", () => {
    it("AC-4.1: AppProvider renders children without crashing when storage is empty", () => {
      const { result } = renderHook(() => useApp(), { wrapper });

      expect(result.current.flags).toEqual({
        aiNoticeConfirmed: false,
        onboarded: false,
        isPremium: false,
      });
      expect(result.current.profile).toBe(null);
    });
  });

  // refreshProfile: reloads profile from storage after external change
  describe("refreshProfile: reloads profile from storage on demand", () => {
    it("reflects a profile written to storage after mount once refreshProfile() is called", () => {
      const { result } = renderHook(() => useApp(), { wrapper });

      expect(result.current.profile).toBe(null);

      const newProfile: UserProfile = {
        tossUserKey: "local",
        nickname: "근육맨",
        heightCm: 180,
        weightKg: 80,
        ageGroup: "20s",
        goal: "muscle",
        level: "intermediate",
        createdAt: 1710000000000,
        updatedAt: 1710000000000,
      };
      localStorage.setItem("fitcoach.profile", JSON.stringify(newProfile));

      act(() => {
        result.current.refreshProfile();
      });

      expect(result.current.profile?.nickname).toBe("근육맨");
      expect(result.current.profile?.weightKg).toBe(80);
    });
  });
});
