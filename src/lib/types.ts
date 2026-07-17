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
