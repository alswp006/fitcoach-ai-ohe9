# Shared Context (auto-generated — do NOT modify)


## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
// Domain types

export interface UserProfile {
  tossUserKey: string; // 토스 세션 식별자(연동 시), 미연동 시 "local"
  nickname: string; // 1~12자
  heightCm: number; // 100~250
  weightKg: number; // 30~200
  ageGroup: "20s" | "30s" | "40s";
  goal: "diet" | "muscle" | "health";
  level: "beginner" | "intermediate";
  createdAt: number; // epoch ms
  updatedAt: number;
}

export interface PlanExercise {
  exerciseId: string; // 예: "ex_squat"
  name: string; // "스쿼트"
  sets: number; // 1~10
  reps: number; // 1~50
  restSec: number; // 10~180
}

export interface WorkoutPlan {
  planId: string; // "plan_" + createdAt
  weekOf: string; // "2026-W29" (ISO week)
  goal: UserProfile["goal"];
  days: { day: number; exercises: PlanExercise[] }[]; // day 1~7
  isAiGenerated: true;
  createdAt: number;
}

export interface FormFeedback {
  jointLabel: string; // "무릎", "등"
  message: string; // "무릎을 더 굽히세요"
  severity: "good" | "warn";
}

export interface WorkoutSession {
  sessionId: string; // "sess_" + startedAt
  exerciseId: string;
  exerciseName: string;
  startedAt: number;
  durationSec: number; // 0~7200
  completedReps: number; // 0~500
  kcal: number; // 0~2000
  aiReport?: {
    isAiGenerated: true;
    scoreAvg: number; // 0~100
    feedback: FormFeedback[]; // 1~10개
    muscleActivation: { muscle: string; percent: number }[]; // percent 0~100
  };
}

export interface Challenge {
  challengeId: string; // "chal_" + createdAt
  title: string; // 1~20자
  targetSessions: number; // 1~30
  startAt: number;
  endAt: number;
  myProgress: number; // 0~targetSessions
  inviteCode: string; // 6자리 영숫자
}

export interface AppFlags {
  aiNoticeConfirmed: boolean;
  onboarded: boolean;
  isPremium: boolean;
  premiumSince?: number;
}

// API contract types (외부 Railway AI 서버)

export interface PlanApiRequest {
  goal: UserProfile["goal"];
  level: UserProfile["level"];
  ageGroup: UserProfile["ageGroup"];
}

export interface PlanApiResponse {
  plan: WorkoutPlan;
}

export interface ReportApiRequest {
  exerciseId: string;
  completedReps: number;
  durationSec: number;
  weightKg: number;
}

export interface ReportApiResponse {
  report: {
    scoreAvg: number;
    feedback: FormFeedback[];
    muscleActivation: { muscle: string; percent: number }[];
    kcal: number;
  };
}

export interface ApiError {
  error: string;
}

// RouteState — page-to-page navigation state contracts

export interface WorkoutRouteState {
  exercise: PlanExercise;
}

export interface ReportRouteState {
  session: WorkoutSession;
}

// /workout/:exerciseId, /report/:sessionId — state may be absent (direct URL access)
export type RouteState = WorkoutRouteState | ReportRouteState | undefined;

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  hooks/
  lib/
    api.ts
    kcal.ts
    promotion.ts
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- api.ts: export async function postPlan(req: PlanApiRequest): Promise<PlanApiResponse>; export async function postReport(req: ReportApiRequest): Promise<ReportApiResponse>
- kcal.ts: export function calcKcal(exerciseId: string, durationSec: number, weightKg: number): number
- promotion.ts: export async function grantPromotion(code: string, amount: number): Promise<void>
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void; export function safeParse<T>(raw: string, fallback: T): T; export function safeParse<T>(raw: string, fallback: null): T | null; export function safeParse<T>(raw: string, fallback: T | null): T | null; export function getProfile(): UserProfile | null; export function saveProfile(profile: UserProfile): void
- types.ts: export interface UserProfile; export interface PlanExercise; export interface WorkoutPlan; export interface FormFeedback; export interface WorkoutSession; export interface Challenge; export interface AppFlags; export interface PlanApiRequest
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd

### Module Dependencies (import graph)
  lib/api.ts → imports: lib/types
  lib/storage.ts → imports: lib/types
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 전체 엔티티 타입 + RouteState 정의 (files: src/lib/types.ts)
- 0005: API 클라이언트 + kcal 유틸 + 프로모션 헬퍼 (files: src/lib/api.ts, src/lib/kcal.ts, src/lib/promotion.ts)
- 0002: 기본 storage 헬퍼 (profile/plan/flags/challenges) (files: src/lib/storage.ts)
- 0003: 세션 storage (FIFO 100 + quota 재시도 + 챌린지 자동증가) (files: src/lib/sessionStore.ts)
- 0004: 앱 상태 관리 (AppContext) (files: src/lib/appContext.tsx)
- 0006: 온보딩 페이지 /onboarding (files: src/pages/Onboarding.tsx)