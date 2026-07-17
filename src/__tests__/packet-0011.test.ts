import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { getChallenges, saveChallenges } from "@/lib/storage";
import type { Challenge as ChallengeData } from "@/lib/types";
import * as tossSdk from "@apps-in-toss/web-framework";

// src/pages/Challenge.tsx does not exist yet — TDD red phase.
import ChallengePage from "@/pages/Challenge";

mockAll(); // TDS + @apps-in-toss/web-framework (incl. setClipboardText) + TossRewardAd + react-router-dom

/**
 * Contract this test file expects the Coder to implement (TDD — tests define the contract):
 *
 * Toggle CTA (opens/closes the create-challenge form; also the label used by the
 * empty-state CTA): role="button", name "챌린지 만들기". Disabled when challenges.length >= 20.
 *
 * Create form (revealed after clicking the toggle CTA):
 *   - data-testid="challenge-form-title"  TextField (placeholder required, 1~20자)
 *   - data-testid="challenge-form-target" TextField (inputMode="numeric", 1~30)
 *   - data-testid="challenge-form-weeks"  TextField (inputMode="numeric", 기간 주 단위)
 *   - Submit button: role="button", name "만들기"
 *   - Validation errors rendered via TextField hasError+help -> role="alert":
 *       empty/21+자 title -> "제목은 1~20자로 입력해주세요"
 *       target 0 or >30   -> "목표 횟수는 1~30회 사이로 입력해주세요"
 *
 * On successful submit:
 *   - saveChallenges() appends a Challenge with: title, targetSessions, myProgress=0,
 *     inviteCode matching /^[A-Z0-9]{6}$/, startAt (now) < endAt.
 *   - Toast text "챌린지를 만들었어요" is shown.
 *
 * List (challenges.length > 0):
 *   - Each challenge rendered as ListRow with data-testid="challenge-row"
 *   - Progress exposed as data-testid="challenge-progress" with exact text
 *     `${myProgress}/${targetSessions}회` (e.g. "3/10회")
 *   - Invite code copy button: IconButton/button with aria-label "초대코드 복사"
 *     -> calls SDK setClipboardText(inviteCode) and shows Toast "초대코드를 복사했어요"
 *
 * Empty state (challenges.length === 0):
 *   - data-testid="challenge-empty" wrapping Asset.ContentIcon (role="img") +
 *     text "첫 챌린지를 만들어보세요" + the same toggle CTA button
 */

function renderChallenge(initialEntries: string[] = ["/challenge"]) {
  return render(
    React.createElement(MemoryRouter, { initialEntries }, React.createElement(ChallengePage)),
  );
}

function makeChallenge(overrides: Partial<ChallengeData> = {}): ChallengeData {
  const now = 1700000000000;
  return {
    challengeId: "chal_1700000000000",
    title: "매일 스쿼트",
    targetSessions: 10,
    startAt: now,
    endAt: now + 28 * 24 * 60 * 60 * 1000,
    myProgress: 3,
    inviteCode: "AB12CD",
    ...overrides,
  };
}

describe("챌린지 페이지 /challenge — packet-0011", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // AC-1[P0]: 제목/목표횟수/기간 입력 → saveChallenges 저장 + 6자리 inviteCode 발급
  // ─────────────────────────────────────────────────────────────
  describe("AC-1[P0]: creates a challenge with a 6-char invite code", () => {
    it("AC-1.1: submitting valid title/target/weeks persists a Challenge via saveChallenges", () => {
      renderChallenge();

      fireEvent.click(screen.getByRole("button", { name: "챌린지 만들기" }));

      fireEvent.change(screen.getByTestId("challenge-form-title"), {
        target: { value: "친구랑 운동" },
      });
      fireEvent.change(screen.getByTestId("challenge-form-target"), {
        target: { value: "12" },
      });
      fireEvent.change(screen.getByTestId("challenge-form-weeks"), {
        target: { value: "4" },
      });
      fireEvent.click(screen.getByRole("button", { name: "만들기" }));

      const saved = getChallenges();
      expect(saved).toHaveLength(1);
      expect(saved[0].title).toBe("친구랑 운동");
      expect(saved[0].targetSessions).toBe(12);
      expect(saved[0].myProgress).toBe(0);
      expect(saved[0].inviteCode).toMatch(/^[A-Z0-9]{6}$/);
      expect(saved[0].endAt).toBeGreaterThan(saved[0].startAt);

      expect(screen.getByText("챌린지를 만들었어요")).toBeInTheDocument();
    });

    it("AC-1.2: empty title blocks submission and shows '제목은 1~20자로 입력해주세요'", () => {
      renderChallenge();

      fireEvent.click(screen.getByRole("button", { name: "챌린지 만들기" }));
      fireEvent.change(screen.getByTestId("challenge-form-target"), {
        target: { value: "10" },
      });
      fireEvent.change(screen.getByTestId("challenge-form-weeks"), {
        target: { value: "4" },
      });
      fireEvent.click(screen.getByRole("button", { name: "만들기" }));

      expect(screen.getByText("제목은 1~20자로 입력해주세요")).toBeInTheDocument();
      expect(getChallenges()).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // AC-2[P0]: 챌린지 목록에 myProgress/targetSessions 진행률 표시
  // ─────────────────────────────────────────────────────────────
  it("AC-2[P0]: renders each challenge's progress as '{myProgress}/{targetSessions}회'", () => {
    saveChallenges([makeChallenge({ myProgress: 3, targetSessions: 10 })]);

    renderChallenge();

    expect(screen.getAllByTestId("challenge-row")).toHaveLength(1);
    expect(screen.getByTestId("challenge-progress").textContent).toBe("3/10회");
  });

  // ─────────────────────────────────────────────────────────────
  // AC-3[P1]: 최대 20개 상한 + 빈 상태
  // ─────────────────────────────────────────────────────────────
  describe("AC-3[P1]: 20-item cap and empty state", () => {
    it("AC-3.1: with 0 challenges, shows empty state with icon, message, and CTA", () => {
      renderChallenge();

      const empty = screen.getByTestId("challenge-empty");
      expect(empty).toBeInTheDocument();
      expect(screen.getByText("첫 챌린지를 만들어보세요")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "챌린지 만들기" })).toBeInTheDocument();
    });

    it("AC-3.2: with 20 existing challenges, the create CTA is disabled", () => {
      const twenty = Array.from({ length: 20 }, (_, i) =>
        makeChallenge({ challengeId: `chal_${i}`, inviteCode: `AAAA${i}` }),
      );
      saveChallenges(twenty);

      renderChallenge();

      expect(screen.getByRole("button", { name: "챌린지 만들기" })).toBeDisabled();
      expect(getChallenges()).toHaveLength(20);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // AC-4[P0]: 초대코드 복사 시 SDK setClipboardText 호출 + Toast 노출
  // ─────────────────────────────────────────────────────────────
  it("AC-4[P0]: copying the invite code calls setClipboardText and shows '초대코드를 복사했어요'", () => {
    saveChallenges([makeChallenge({ inviteCode: "XY9Z8Q" })]);

    renderChallenge();
    fireEvent.click(screen.getByRole("button", { name: "초대코드 복사" }));

    expect(tossSdk.setClipboardText).toHaveBeenCalledWith("XY9Z8Q");
    expect(screen.getByText("초대코드를 복사했어요")).toBeInTheDocument();
  });
});
