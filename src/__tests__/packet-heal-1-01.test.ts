import { describe, it, expect, vi } from "vitest";
import React from "react";
import { screen, within } from "@testing-library/react";
import { mockTds, mockRouter, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import type { AppFlags } from "@/lib/types";

// ── TDS + react-router mocks (crash in jsdom without these) ──
mockTds();
mockRouter();

// ── @/lib/appContext mock — the REAL AppContext module in this repo
// (src/lib/appContext.tsx, exporting useApp()/AppProvider). Components under
// test must import ONLY this hook's existing shape (flags, confirmAiNotice,
// setPremium) — never reimplement storage reads/writes themselves.
const { mockUseApp, mockConfirmAiNotice, mockSetPremium } = vi.hoisted(() => ({
  mockUseApp: vi.fn(),
  mockConfirmAiNotice: vi.fn(),
  mockSetPremium: vi.fn(),
}));

vi.mock("@/lib/appContext", () => ({
  useApp: mockUseApp,
  AppProvider: ({ children }: any) => children,
}));

function setAppState(flagsOverride: Partial<AppFlags> = {}) {
  const flags: AppFlags = {
    aiNoticeConfirmed: false,
    onboarded: true,
    isPremium: false,
    ...flagsOverride,
  };
  mockUseApp.mockReturnValue({
    flags,
    profile: null,
    setPremium: mockSetPremium,
    confirmAiNotice: mockConfirmAiNotice,
    refreshProfile: vi.fn(),
  });
  return flags;
}

import { AiNoticeGate } from "@/components/AiNoticeGate";
import { AiBadge } from "@/components/AiBadge";
import { PremiumGate } from "@/components/PremiumGate";

describe("공용 AI 고지·AI 배지·프리미엄 게이트 컴포넌트 추출", () => {
  it("AC-1: 세 컴포넌트 모두 AppContext의 useApp() 값만으로 크래시 없이 렌더된다", () => {
    setAppState({ aiNoticeConfirmed: true, isPremium: true });

    expect(() =>
      renderWithRouter(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(AiNoticeGate),
          React.createElement(AiBadge),
          React.createElement(PremiumGate, { exerciseId: "ex_burpee", children: "본문 콘텐츠" }),
        ),
      ),
    ).not.toThrow();

    // AiBadge always renders its label; PremiumGate (premium user) renders children through.
    expect(screen.getByText("AI가 생성한 결과입니다")).toBeInTheDocument();
    expect(screen.getByText("본문 콘텐츠")).toBeInTheDocument();
  });

  it("AC-2[P0]: aiNoticeConfirmed=false면 최초 진입 시 고지 다이얼로그가 1회 뜨고, 확인 클릭 시 confirmAiNotice가 호출된다", () => {
    setAppState({ aiNoticeConfirmed: false });
    renderWithRouter(React.createElement(AiNoticeGate));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/생성형 AI/)).toBeInTheDocument();

    const confirmButton = within(dialog).getByRole("button", { name: "확인" });
    confirmButton.click();

    expect(mockConfirmAiNotice).toHaveBeenCalledTimes(1);
  });

  it("AC-2[P0]: aiNoticeConfirmed=true면 고지 다이얼로그가 다시 뜨지 않는다", () => {
    setAppState({ aiNoticeConfirmed: true });
    renderWithRouter(React.createElement(AiNoticeGate));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("AC-2: AiBadge는 'AI가 생성한 결과입니다' 라벨을 상시 렌더한다", () => {
    setAppState();
    renderWithRouter(React.createElement(AiBadge));

    expect(screen.getByText("AI가 생성한 결과입니다")).toBeInTheDocument();
  });

  it("AC-3: AiBadge 렌더 결과에 하드코딩된 HEX 색상이 0개다", () => {
    setAppState();
    const { container } = renderWithRouter(React.createElement(AiBadge));

    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it("AC-4[P0]: 무료 운동(ex_squat)은 isPremium=false여도 자식 콘텐츠가 그대로 렌더된다", () => {
    setAppState({ isPremium: false });
    renderWithRouter(
      React.createElement(PremiumGate, { exerciseId: "ex_squat", children: "스쿼트 상세 콘텐츠" }),
    );

    expect(screen.getByText("스쿼트 상세 콘텐츠")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("AC-4[P0]: 무료 3종(ex_squat/ex_pushup/ex_plank) 외 운동은 isPremium=false면 콘텐츠가 가려지고 구독 유도 BottomSheet로 이어진다", () => {
    setAppState({ isPremium: false });
    renderWithRouter(
      React.createElement(PremiumGate, { exerciseId: "ex_burpee", children: "버피 상세 콘텐츠" }),
    );

    // Gated: locked content is not rendered directly.
    expect(screen.queryByText("버피 상세 콘텐츠")).not.toBeInTheDocument();

    // Triggering the gate opens the subscribe BottomSheet.
    const trigger = screen.getByTestId("premium-gate-locked");
    trigger.click();
    const sheet = screen.getByRole("dialog");
    expect(sheet).toBeInTheDocument();

    const subscribeButton = within(sheet).getByRole("button", { name: /구독/ });
    subscribeButton.click();
    expect(mockNavigate).toHaveBeenCalledWith("/subscribe");
  });

  it("AC-4: isPremium=true면 무료 목록에 없는 운동(ex_burpee)도 자식 콘텐츠가 바로 렌더된다", () => {
    setAppState({ isPremium: true });
    renderWithRouter(
      React.createElement(PremiumGate, { exerciseId: "ex_burpee", children: "버피 상세 콘텐츠" }),
    );

    expect(screen.getByText("버피 상세 콘텐츠")).toBeInTheDocument();
    expect(screen.queryByTestId("premium-gate-locked")).not.toBeInTheDocument();
  });
});
