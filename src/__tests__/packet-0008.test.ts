import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockRouter, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { getPlan, savePlan, saveFlags, saveProfile } from "@/lib/storage";
import type { WorkoutPlan, UserProfile } from "@/lib/types";
import { AppProvider } from "@/lib/appContext";

// src/pages/Plan.tsx does not exist yet — TDD red phase.
import Plan from "@/pages/Plan";

mockTds();
mockAppsInToss();
mockRouter();

/**
 * TossRewardAd is mocked here (not via the shared mockTossRewardAd() helper, which
 * auto-fires onReward and can't test "hidden until watched"). This stand-in renders
 * a "광고 보고 확인하기" button and only reveals `children` after it's clicked, so tests
 * can assert both the pre-watch gate and the post-watch reveal. Matches the real
 * component's prop name `onRewarded` (src/components/TossRewardAd.tsx).
 */
vi.mock("@/components/TossRewardAd", () => ({
  TossRewardAd: ({ children, onRewarded }: { children: React.ReactNode; onRewarded?: () => void }) => {
    const [unlocked, setUnlocked] = React.useState(false);
    if (unlocked) return children;
    return React.createElement(
      "button",
      {
        onClick: () => {
          setUnlocked(true);
          onRewarded?.();
        },
      },
      "광고 보고 확인하기",
    );
  },
}));

/**
 * Contract this test file expects the Coder to implement (TDD — tests define the contract):
 *
 * - Bottom SubmitFooter CTA labeled "이번 주 플랜 만들기" — always visible, used both to
 *   trigger the premium gate (free users) and to POST /api/plan (premium users).
 * - Free user (flags.isPremium === false) tapping the CTA opens a BottomSheet (role="dialog")
 *   with text "프리미엄 전용 기능이에요" and a "구독하러 가기" button that navigate('/subscribe').
 *   fetch/postPlan MUST NOT be called in this path.
 * - Premium user: any plan being shown (existing from storage OR freshly generated) is
 *   wrapped in <TossRewardAd> — content is hidden until the ad is watched.
 * - On successful POST /api/plan ({goal,level,ageGroup} from the stored profile), the
 *   response plan is persisted via savePlan() and rendered as 7 day cards
 *   (data-testid="plan-day-card") with an "AI가 생성한 결과입니다" Chip once the ad is watched.
 * - While the request is pending: text "플랜을 만들고 있어요" + the CTA button is disabled.
 * - On a non-200 response: Toast "플랜 생성에 실패했어요. 다시 시도해주세요", existing saved
 *   plan (if any) is left untouched.
 * - On an aborted/timed-out request: loading stops and a "다시 시도" retry button appears.
 * - getPlan() === null (no plan yet) renders an empty state with "아직 플랜이 없어요".
 * - Tapping an exercise ListRow navigates to `/workout/${exerciseId}` with
 *   `state: { exercise: PlanExercise }`.
 */

const mockPlan: WorkoutPlan = {
  planId: "plan_1700000000000",
  weekOf: "2026-W29",
  goal: "diet",
  isAiGenerated: true,
  createdAt: 1700000000000,
  days: Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    exercises: [
      { exerciseId: `ex_squat_${i + 1}`, name: "스쿼트", sets: 3, reps: 12, restSec: 60 },
    ],
  })),
};

const premiumProfile: UserProfile = {
  tossUserKey: "local",
  nickname: "테스터",
  heightCm: 170,
  weightKg: 65,
  ageGroup: "20s",
  goal: "diet",
  level: "beginner",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

function renderPlan(initialEntries: string[] = ["/plan"]) {
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries },
      React.createElement(AppProvider, null, React.createElement(Plan)),
    ),
  );
}

function seedPremiumProfile() {
  saveFlags({ aiNoticeConfirmed: true, onboarded: true, isPremium: true });
  saveProfile(premiumProfile);
}

function generateButton() {
  return screen.getByRole("button", { name: "이번 주 플랜 만들기" });
}

describe("AI 플랜 페이지 /plan — packet-0008", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
  });

  // ─────────────────────────────────────────────────────────────
  // AC-1[P0]: 무료 유저 → 프리미엄 게이트 BottomSheet, API 미호출
  // ─────────────────────────────────────────────────────────────
  describe("AC-1[P0]: free user hits the premium gate", () => {
    beforeEach(() => {
      saveFlags({ aiNoticeConfirmed: true, onboarded: true, isPremium: false });
    });

    it("AC-1.1: tapping generate opens a BottomSheet gate and never calls the API", () => {
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy as unknown as typeof fetch;

      renderPlan();
      fireEvent.click(generateButton());

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("프리미엄 전용 기능이에요")).toBeInTheDocument();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("AC-1.2: the gate's subscribe button navigates to /subscribe", () => {
      renderPlan();
      fireEvent.click(generateButton());
      fireEvent.click(screen.getByRole("button", { name: "구독하러 가기" }));

      expect(mockNavigate).toHaveBeenCalledWith("/subscribe");
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // AC-2[P0]: 프리미엄 결과는 TossRewardAd 시청 완료 후에만 노출
  // ─────────────────────────────────────────────────────────────
  describe("AC-2[P0]: premium result is gated behind the reward ad", () => {
    beforeEach(() => {
      seedPremiumProfile();
      savePlan(mockPlan);
    });

    it("AC-2.1: plan content is hidden and the ad gate button is shown before watching", () => {
      renderPlan();

      expect(screen.queryByText("스쿼트")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "광고 보고 확인하기" })).toBeInTheDocument();
    });

    it("AC-2.2: plan content and the AI chip appear only after the ad completes", () => {
      renderPlan();
      fireEvent.click(screen.getByRole("button", { name: "광고 보고 확인하기" }));

      expect(screen.getAllByText("스쿼트").length).toBeGreaterThan(0);
      expect(screen.getByText("AI가 생성한 결과입니다")).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // AC-3: 성공 시 savePlan 저장 + 7일 Card/ListRow + AI 배지
  // ─────────────────────────────────────────────────────────────
  describe("AC-3: successful generation saves and renders the plan", () => {
    beforeEach(() => {
      seedPremiumProfile();
    });

    it("AC-3.1: posts the profile fields, savePlans the response, and renders 7 day cards after the ad", async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ plan: mockPlan }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      renderPlan();
      fireEvent.click(generateButton());

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      const [, init] = fetchMock.mock.calls[0];
      expect(JSON.parse((init as RequestInit).body as string)).toEqual({
        goal: "diet",
        level: "beginner",
        ageGroup: "20s",
      });

      fireEvent.click(await screen.findByRole("button", { name: "광고 보고 확인하기" }));

      expect(screen.getAllByTestId("plan-day-card")).toHaveLength(7);
      expect(screen.getByText("AI가 생성한 결과입니다")).toBeInTheDocument();
      expect(getPlan()?.planId).toBe("plan_1700000000000");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // AC-4: 대기 중 로딩+버튼 disabled, 500 → 토스트, 기존 플랜 유지
  // ─────────────────────────────────────────────────────────────
  describe("AC-4: loading state and server failure", () => {
    beforeEach(() => {
      seedPremiumProfile();
    });

    it("AC-4.1: shows the loading message and disables the CTA while the request is pending", async () => {
      global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;

      renderPlan();
      fireEvent.click(generateButton());

      expect(await screen.findByText("플랜을 만들고 있어요")).toBeInTheDocument();
      expect(generateButton()).toBeDisabled();
    });

    it("AC-4.2: a 500 response shows the failure toast and leaves the existing plan untouched", async () => {
      savePlan(mockPlan);
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Server error" }),
      }) as unknown as typeof fetch;

      renderPlan();
      fireEvent.click(generateButton());

      expect(
        await screen.findByText("플랜 생성에 실패했어요. 다시 시도해주세요"),
      ).toBeInTheDocument();
      expect(getPlan()?.planId).toBe("plan_1700000000000");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // AC-5: 타임아웃→재시도, 빈 상태, ListRow 탭→navigate
  // ─────────────────────────────────────────────────────────────
  describe("AC-5: timeout retry, empty state, and exercise navigation", () => {
    beforeEach(() => {
      seedPremiumProfile();
    });

    it("AC-5.1: an aborted (timed-out) request stops loading and shows a retry button", async () => {
      const abortError = Object.assign(new Error("The operation was aborted"), {
        name: "AbortError",
      });
      global.fetch = vi.fn().mockRejectedValueOnce(abortError) as unknown as typeof fetch;

      renderPlan();
      fireEvent.click(generateButton());

      expect(await screen.findByRole("button", { name: "다시 시도" })).toBeInTheDocument();
      expect(screen.queryByText("플랜을 만들고 있어요")).not.toBeInTheDocument();
    });

    it("AC-5.2: with no saved plan, renders the '아직 플랜이 없어요' empty state", () => {
      expect(getPlan()).toBe(null);
      renderPlan();

      expect(screen.getByText("아직 플랜이 없어요")).toBeInTheDocument();
    });

    it("AC-5.3: tapping an exercise ListRow navigates to /workout/:id with the exercise in state", () => {
      savePlan(mockPlan);
      renderPlan();
      fireEvent.click(screen.getByRole("button", { name: "광고 보고 확인하기" }));

      fireEvent.click(screen.getAllByText("스쿼트")[0]);

      expect(mockNavigate).toHaveBeenCalledWith("/workout/ex_squat_1", {
        state: { exercise: mockPlan.days[0].exercises[0] },
      });
    });
  });
});
