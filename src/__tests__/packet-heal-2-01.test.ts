import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { saveFlags, saveProfile, getFlags, getProfile } from "@/lib/storage";
import type { AppFlags, UserProfile } from "@/lib/types";

import App from "@/App";

mockAll(); // TDS + @apps-in-toss/web-framework + TossRewardAd + react-router-dom (useNavigate/useLocation mocked)

/**
 * Contract this test file expects (TDD — tests define the contract):
 *
 * - src/App.tsx wraps ALL routes in a single AppContext Provider (src/lib/appContext AppProvider)
 *   and adds an onboarding guard so that ANY route (not just Home) redirects to /onboarding
 *   when flags.onboarded is false — today only Home.tsx guards itself; Plan/Challenge/Workout/
 *   Report/Subscribe do not, so a direct/deep-link visit bypasses onboarding.
 * - Every route path actually referenced by navigate()/FloatingTabBar calls across pages
 *   ("/", "/onboarding", "/plan", "/challenge", "/subscribe", "/workout/:exerciseId",
 *   "/report/:sessionId") is registered in App.tsx.
 * - Home's bottom FloatingTabBar (already wired) navigates between the tab-root pages.
 */

const ONBOARDED_FLAGS: AppFlags = { aiNoticeConfirmed: true, onboarded: true, isPremium: true };

const PROFILE: UserProfile = {
  tossUserKey: "local",
  nickname: "헬린이",
  heightCm: 170,
  weightKg: 65,
  ageGroup: "20s",
  goal: "diet",
  level: "beginner",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

function renderApp(initialEntries: string[] = ["/"]) {
  return render(React.createElement(MemoryRouter, { initialEntries }, React.createElement(App)));
}

describe("라우터 배선 + Provider 연결 + 온보딩 가드 통합 — packet-heal-2-01", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
  });

  // ─────────────────────────────────────────────────────────────
  // AC-1[P0]: 앱이 라우팅 에러 없이 빌드·마운트되고 /onboarding·/plan·/challenge가 렌더된다
  // ─────────────────────────────────────────────────────────────
  describe("AC-1[P0]: core routes mount without crashing", () => {
    it("AC-1.1: /onboarding renders the profile form", () => {
      renderApp(["/onboarding"]);

      expect(screen.getByTestId("onboarding-nickname")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "프로필 저장" })).toBeInTheDocument();
    });

    it("AC-1.2: /plan renders the weekly plan screen when already onboarded", () => {
      saveFlags(ONBOARDED_FLAGS);
      saveProfile(PROFILE);

      renderApp(["/plan"]);

      expect(screen.getByText("주간 플랜")).toBeInTheDocument();
    });

    it("AC-1.3: /challenge renders the challenge screen when already onboarded", () => {
      saveFlags(ONBOARDED_FLAGS);
      saveProfile(PROFILE);

      renderApp(["/challenge"]);

      expect(screen.getByText("챌린지")).toBeInTheDocument();
      expect(screen.getByTestId("challenge-empty")).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // AC-2[P0]: onboarded=false일 때 임의 경로 접근 시 /onboarding으로 리다이렉트된다
  // ─────────────────────────────────────────────────────────────
  describe("AC-2[P0]: onboarded=false redirects ANY route to /onboarding", () => {
    it("AC-2.1: visiting /plan without onboarding redirects to /onboarding", () => {
      // localStorage cleared in beforeEach -> getFlags() defaults to onboarded:false
      renderApp(["/plan"]);

      expect(screen.getByTestId("onboarding-nickname")).toBeInTheDocument();
      expect(screen.queryByText("주간 플랜")).not.toBeInTheDocument();
    });

    it("AC-2.2: visiting /challenge without onboarding redirects to /onboarding", () => {
      renderApp(["/challenge"]);

      expect(screen.getByTestId("onboarding-nickname")).toBeInTheDocument();
      expect(screen.queryByTestId("challenge-empty")).not.toBeInTheDocument();
    });

    it("AC-2.3: visiting /subscribe without onboarding redirects to /onboarding", () => {
      renderApp(["/subscribe"]);

      expect(screen.getByTestId("onboarding-nickname")).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // AC-3[P0]: 모든 라우트가 AppContext Provider 하위에서 공용 storage/API export를
  //           실제 시그니처대로 소비한다
  // ─────────────────────────────────────────────────────────────
  describe("AC-3[P0]: pages consume AppProvider + real storage.ts contract", () => {
    it("AC-3.1: Home reads flags via useApp()/AppProvider and renders the dashboard once onboarded", () => {
      saveFlags(ONBOARDED_FLAGS);
      saveProfile(PROFILE);

      renderApp(["/"]);

      expect(screen.getByText("이번 주 운동")).toBeInTheDocument();
      expect(screen.getByTestId("weekly-summary-hero")).toBeInTheDocument();
    });

    it("AC-3.2: submitting onboarding persists via saveProfile/saveFlags (real storage.ts) and getFlags().onboarded flips to true", () => {
      saveFlags({ aiNoticeConfirmed: true, onboarded: false, isPremium: false });
      renderApp(["/onboarding"]);

      fireEvent.change(screen.getByTestId("onboarding-nickname"), { target: { value: "헬린이" } });
      fireEvent.change(screen.getByTestId("onboarding-height"), { target: { value: "170" } });
      fireEvent.change(screen.getByTestId("onboarding-weight"), { target: { value: "65" } });
      fireEvent.click(screen.getByRole("button", { name: "20대" }));
      fireEvent.click(screen.getByRole("button", { name: "다이어트" }));
      fireEvent.click(screen.getByRole("button", { name: "입문" }));
      fireEvent.click(screen.getByRole("button", { name: "프로필 저장" }));

      expect(getFlags().onboarded).toBe(true);
      expect(getProfile()?.nickname).toBe("헬린이");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // AC-4[P0]: FloatingTabBar 하단 탭으로 주요 페이지 이동이 동작한다
  // ─────────────────────────────────────────────────────────────
  describe("AC-4[P0]: FloatingTabBar bottom tabs navigate to their target routes", () => {
    beforeEach(() => {
      saveFlags(ONBOARDED_FLAGS);
      saveProfile(PROFILE);
    });

    it("AC-4.1: clicking the '플랜' tab from Home calls navigate('/plan')", () => {
      renderApp(["/"]);

      fireEvent.click(screen.getByRole("tab", { name: "플랜" }));

      expect(mockNavigate).toHaveBeenCalledWith("/plan");
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it("AC-4.2: clicking the '챌린지' tab from Home calls navigate('/challenge')", () => {
      renderApp(["/"]);

      fireEvent.click(screen.getByRole("tab", { name: "챌린지" }));

      expect(mockNavigate).toHaveBeenCalledWith("/challenge");
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Integration: every navigate() target used across pages has a matching <Route>
  // ─────────────────────────────────────────────────────────────
  it("integration: all navigate()/tab targets resolve to a mounted route (no dead links)", () => {
    saveFlags(ONBOARDED_FLAGS);
    saveProfile(PROFILE);

    // "/" (Home), "/onboarding", "/plan", "/challenge", "/subscribe" are static targets
    // used by navigate() across Onboarding/Plan/Subscribe/Home + FloatingTabBar.
    for (const path of ["/", "/onboarding", "/plan", "/challenge", "/subscribe"]) {
      const { unmount } = renderApp([path]);
      // A dead route falls through react-router with no element rendered — body would
      // stay effectively empty. Every real route renders a Top nav (role="navigation").
      expect(document.querySelector('[role="navigation"]')).not.toBeNull();
      unmount();
    }

    // Dynamic targets: /workout/:exerciseId and /report/:sessionId
    const { unmount: unmountWorkout } = renderApp(["/workout/ex_squat"]);
    expect(document.querySelector('[role="navigation"]')).not.toBeNull();
    unmountWorkout();

    const { unmount: unmountReport } = renderApp(["/report/sess_1"]);
    expect(document.querySelector('[role="navigation"]')).not.toBeNull();
    unmountReport();
  });
});
