import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { getProfile, getFlags, saveFlags, saveProfile } from "@/lib/storage";
import type { UserProfile, AppFlags } from "@/lib/types";
import { AppProvider } from "@/lib/appContext";

// src/pages/Onboarding.tsx does not exist yet — TDD red phase.
import Onboarding from "@/pages/Onboarding";

mockAll(); // TDS + @apps-in-toss/web-framework + TossRewardAd + react-router-dom (useNavigate mocked)

/**
 * Contract this test file expects the Coder to implement (TDD — tests define the contract):
 *
 * Inputs (TextField, arbitrary props pass through the TDS mock, so data-testid works):
 *   - data-testid="onboarding-nickname"  (placeholder required per CLAUDE.md rule 11)
 *   - data-testid="onboarding-height"    (inputMode="numeric")
 *   - data-testid="onboarding-weight"    (inputMode="numeric")
 *
 * Chips (Chip mock only renders `children` text — props like data-testid do NOT reach
 * the DOM in the mock — so chips MUST be queried/identified by their visible label text):
 *   - ageGroup: "20대" | "30대" | "40대"
 *   - goal:     "다이어트" | "근력 강화" | "건강 관리"
 *   - level:    "입문" | "중급"
 *
 * Submit CTA: rendered via SubmitFooter (label must contain "저장"), e.g. "프로필 저장".
 *
 * Validation error text (rendered via TextField hasError+help, exposed as role="alert"):
 *   - empty nickname  -> "닉네임을 입력해주세요"
 *   - height <100 or >250 -> "키는 100~250cm 사이로 입력해주세요"
 */

function renderOnboarding(initialEntries: string[] = ["/onboarding"]) {
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries },
      React.createElement(AppProvider, null, React.createElement(Onboarding)),
    ),
  );
}

function fillRequiredFields() {
  fireEvent.change(screen.getByTestId("onboarding-nickname"), { target: { value: "헬린이" } });
  fireEvent.change(screen.getByTestId("onboarding-height"), { target: { value: "170" } });
  fireEvent.change(screen.getByTestId("onboarding-weight"), { target: { value: "65" } });
  fireEvent.click(screen.getByRole("button", { name: "20대" }));
  fireEvent.click(screen.getByRole("button", { name: "다이어트" }));
  fireEvent.click(screen.getByRole("button", { name: "입문" }));
}

describe("온보딩 페이지 /onboarding — packet-0006", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
  });

  // ─────────────────────────────────────────────────────────────
  // AC-1[P0]: 유효성 검증 — 빈 닉네임 / 범위 밖 키 → 에러 메시지 + 저장 차단
  // ─────────────────────────────────────────────────────────────
  describe("AC-1[P0]: shows validation errors and blocks save", () => {
    beforeEach(() => {
      // aiNoticeConfirmed=true so the AI notice dialog doesn't interfere
      saveFlags({ aiNoticeConfirmed: true, onboarded: false, isPremium: false });
    });

    it("AC-1.1: empty nickname on blur shows '닉네임을 입력해주세요' and does not persist a profile", () => {
      renderOnboarding();

      const nickname = screen.getByTestId("onboarding-nickname");
      fireEvent.focus(nickname);
      fireEvent.blur(nickname);

      expect(screen.getByText("닉네임을 입력해주세요")).toBeInTheDocument();
      expect(getProfile()).toBe(null);
    });

    it("AC-1.2: height below 100 on blur shows '키는 100~250cm 사이로 입력해주세요' and blocks save", () => {
      renderOnboarding();

      const height = screen.getByTestId("onboarding-height");
      fireEvent.change(height, { target: { value: "50" } });
      fireEvent.blur(height);

      expect(screen.getByText("키는 100~250cm 사이로 입력해주세요")).toBeInTheDocument();
      expect(getProfile()).toBe(null);
    });

    it("AC-1.3: height above 250 on blur shows the same range error message", () => {
      renderOnboarding();

      const height = screen.getByTestId("onboarding-height");
      fireEvent.change(height, { target: { value: "300" } });
      fireEvent.blur(height);

      expect(screen.getByText("키는 100~250cm 사이로 입력해주세요")).toBeInTheDocument();
      expect(getProfile()).toBe(null);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // AC-2[P0]: 필수(닉네임/키/몸무게/목표) 미충족 시 제출 disabled
  // ─────────────────────────────────────────────────────────────
  describe("AC-2[P0]: submit CTA is disabled until required fields are filled", () => {
    beforeEach(() => {
      saveFlags({ aiNoticeConfirmed: true, onboarded: false, isPremium: false });
    });

    it("AC-2.1: submit is disabled on initial render (all fields empty)", () => {
      renderOnboarding();

      const submit = screen.getByRole("button", { name: "프로필 저장" });
      expect(submit).toBeDisabled();
    });

    it("AC-2.2: submit becomes enabled once nickname/height/weight/goal are all filled", () => {
      renderOnboarding();
      fillRequiredFields();

      const submit = screen.getByRole("button", { name: "프로필 저장" });
      expect(submit).not.toBeDisabled();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // AC-3[P0]: 성공 시 saveProfile + onboarded=true, 토스트, navigate('/', {replace:true})
  // ─────────────────────────────────────────────────────────────
  describe("AC-3[P0]: successful submit saves profile+flags, shows toast, navigates home", () => {
    beforeEach(() => {
      saveFlags({ aiNoticeConfirmed: true, onboarded: false, isPremium: false });
    });

    it("AC-3.1: persists profile fields and sets flags.onboarded=true", () => {
      renderOnboarding();
      fillRequiredFields();
      fireEvent.click(screen.getByRole("button", { name: "프로필 저장" }));

      const saved = getProfile();
      expect(saved?.nickname).toBe("헬린이");
      expect(saved?.heightCm).toBe(170);
      expect(saved?.weightKg).toBe(65);
      expect(saved?.ageGroup).toBe("20s");
      expect(saved?.goal).toBe("diet");
      expect(saved?.level).toBe("beginner");
      expect(typeof saved?.createdAt).toBe("number");

      expect(getFlags().onboarded).toBe(true);
    });

    it("AC-3.2: shows success toast '프로필이 저장됐어요' and navigates to '/' with replace:true", () => {
      renderOnboarding();
      fillRequiredFields();
      fireEvent.click(screen.getByRole("button", { name: "프로필 저장" }));

      expect(screen.getByText("프로필이 저장됐어요")).toBeInTheDocument();
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // AC-4[P0]: aiNoticeConfirmed=false면 최초 1회 AlertDialog, 확인 시 confirmAiNotice()
  // ─────────────────────────────────────────────────────────────
  describe("AC-4[P0]: first-use AI notice dialog gated on flags.aiNoticeConfirmed", () => {
    it("AC-4.1: shows the AI notice AlertDialog on mount when aiNoticeConfirmed=false", () => {
      renderOnboarding(); // no flags seeded -> defaults aiNoticeConfirmed=false

      const dialog = screen.getByRole("alertdialog");
      expect(dialog).toBeInTheDocument();
      expect(dialog.textContent).toMatch(/생성형 AI/);
    });

    it("AC-4.2: confirming the dialog calls confirmAiNotice() and persists aiNoticeConfirmed=true", () => {
      renderOnboarding();
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "확인" }));

      expect(getFlags().aiNoticeConfirmed).toBe(true);
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });

    it("AC-4.3: does not show the dialog when aiNoticeConfirmed is already true", () => {
      saveFlags({ aiNoticeConfirmed: true, onboarded: false, isPremium: false });
      renderOnboarding();

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // AC-5[P1]: 숫자 필드 inputMode=numeric + blur dismiss, onboarded 진입 시 프리필
  // ─────────────────────────────────────────────────────────────
  describe("AC-5[P1]: numeric inputMode on height/weight, prefill in edit mode", () => {
    it("AC-5.1: height and weight inputs use inputMode=numeric", () => {
      saveFlags({ aiNoticeConfirmed: true, onboarded: false, isPremium: false });
      renderOnboarding();

      expect(screen.getByTestId("onboarding-height")).toHaveAttribute("inputMode", "numeric");
      expect(screen.getByTestId("onboarding-weight")).toHaveAttribute("inputMode", "numeric");
    });

    it("AC-5.2: when onboarded=true, existing profile prefills nickname/height/weight inputs", () => {
      const existing: UserProfile = {
        tossUserKey: "local",
        nickname: "근육맨",
        heightCm: 182,
        weightKg: 78,
        ageGroup: "30s",
        goal: "muscle",
        level: "intermediate",
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      };
      saveProfile(existing);
      const flags: AppFlags = { aiNoticeConfirmed: true, onboarded: true, isPremium: false };
      saveFlags(flags);

      renderOnboarding();

      expect((screen.getByTestId("onboarding-nickname") as HTMLInputElement).value).toBe("근육맨");
      expect((screen.getByTestId("onboarding-height") as HTMLInputElement).value).toBe("182");
      expect((screen.getByTestId("onboarding-weight") as HTMLInputElement).value).toBe("78");
    });
  });
});
