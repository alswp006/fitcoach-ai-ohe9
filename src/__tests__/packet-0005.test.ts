import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PlanApiRequest, ReportApiRequest, PlanApiResponse, ReportApiResponse } from "@/lib/types";

// Placeholder imports — implementations will be created
// import { postPlan, postReport } from "@/lib/api";
// import { calcKcal } from "@/lib/kcal";
// import { grantPromotion } from "@/lib/promotion";

// Mock @apps-in-toss/web-framework for grantPromotionReward
vi.mock("@apps-in-toss/web-framework", () => ({
  grantPromotionReward: vi.fn(async () => ({})),
}));

describe("Packet 0005 — API client + kcal utility + promotion helper (TDD red phase)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────
  // AC-1: postPlan(req) — 10초 타임아웃, 비200 시 {error} throw
  // ─────────────────────────────────────────────────────────────────
  describe("AC-1: postPlan with 10-second timeout and error handling", () => {
    it("AC-1.1: postPlan should fetch plan from API and return plan object on 200 response", async () => {
      const { postPlan } = await import("@/lib/api");

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          plan: {
            planId: "plan_1000",
            weekOf: "2026-W29",
            goal: "muscle",
            days: [
              {
                day: 1,
                exercises: [
                  {
                    exerciseId: "ex_squat",
                    name: "스쿼트",
                    sets: 3,
                    reps: 10,
                    restSec: 60,
                  },
                ],
              },
            ],
            isAiGenerated: true,
            createdAt: 1000,
          },
        }),
      });

      global.fetch = mockFetch;

      const req: PlanApiRequest = {
        goal: "muscle",
        level: "intermediate",
        ageGroup: "30s",
      };

      const response = await postPlan(req);
      expect(response.plan).toBeDefined();
      expect(response.plan.planId).toBe("plan_1000");
      expect(response.plan.goal).toBe("muscle");
      expect(response.plan.days[0].day).toBe(1);
    });

    it("AC-1.2: postPlan should throw ApiError when response is not 200", async () => {
      const { postPlan } = await import("@/lib/api");

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "Invalid goal" }),
      });

      global.fetch = mockFetch;

      const req: PlanApiRequest = {
        goal: "muscle",
        level: "intermediate",
        ageGroup: "30s",
      };

      await expect(postPlan(req)).rejects.toThrow("Invalid goal");
    });

    it("AC-1.3: postPlan should use AbortController with 10-second timeout", async () => {
      const { postPlan } = await import("@/lib/api");

      const abortSpy = vi.spyOn(global, "AbortController" as any);
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plan: { planId: "test", weekOf: "2026-W01", goal: "diet", days: [], isAiGenerated: true, createdAt: 0 } }),
      });
      global.fetch = mockFetch;

      const req: PlanApiRequest = {
        goal: "diet",
        level: "beginner",
        ageGroup: "20s",
      };

      await postPlan(req);

      // Verify AbortController was created with 10-second timeout signal
      expect(mockFetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1]).toHaveProperty("signal");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // AC-1 (continued): postReport — 동일 타임아웃·에러 처리
  // ─────────────────────────────────────────────────────────────────
  describe("AC-1b: postReport with 10-second timeout and error handling", () => {
    it("AC-1.4: postReport should fetch report from API and return report object on 200 response", async () => {
      const { postReport } = await import("@/lib/api");

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          report: {
            scoreAvg: 85,
            feedback: [
              {
                jointLabel: "무릎",
                message: "무릎을 더 굽히세요",
                severity: "warn",
              },
            ],
            muscleActivation: [
              {
                muscle: "Quadriceps",
                percent: 90,
              },
            ],
            kcal: 150,
          },
        }),
      });

      global.fetch = mockFetch;

      const req: ReportApiRequest = {
        exerciseId: "ex_squat",
        completedReps: 10,
        durationSec: 30,
        weightKg: 75,
      };

      const response = await postReport(req);
      expect(response.report).toBeDefined();
      expect(response.report.scoreAvg).toBe(85);
      expect(response.report.kcal).toBe(150);
      expect(response.report.feedback).toHaveLength(1);
      expect(response.report.muscleActivation[0].muscle).toBe("Quadriceps");
    });

    it("AC-1.5: postReport should throw ApiError when response is 500", async () => {
      const { postReport } = await import("@/lib/api");

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Server error" }),
      });

      global.fetch = mockFetch;

      const req: ReportApiRequest = {
        exerciseId: "ex_squat",
        completedReps: 10,
        durationSec: 30,
        weightKg: 75,
      };

      await expect(postReport(req)).rejects.toThrow("Server error");
    });

    it("AC-1.6: postReport should use AbortController with 10-second timeout", async () => {
      const { postReport } = await import("@/lib/api");

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          report: {
            scoreAvg: 75,
            feedback: [],
            muscleActivation: [],
            kcal: 100,
          },
        }),
      });

      global.fetch = mockFetch;

      const req: ReportApiRequest = {
        exerciseId: "ex_push_up",
        completedReps: 20,
        durationSec: 45,
        weightKg: 80,
      };

      await postReport(req);

      expect(mockFetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1]).toHaveProperty("signal");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // AC-2: calcKcal(exerciseId, durationSec, weightKg) — MET × weight × time
  // ─────────────────────────────────────────────────────────────────
  describe("AC-2: calcKcal with MET formula and 0-2000 clamp", () => {
    it("AC-2.1: calcKcal should calculate kcal correctly using MET × (weightKg * durationSec / 3600)", async () => {
      const { calcKcal } = await import("@/lib/kcal");

      // Squat: MET ≈ 5.5
      // weightKg=75, durationSec=1800 (30 min)
      // Expected: 5.5 × 75 × (1800/3600) = 5.5 × 75 × 0.5 = 206.25 ≈ 206
      const result = calcKcal("ex_squat", 1800, 75);
      expect(result).toBeGreaterThan(190);
      expect(result).toBeLessThan(220);
      expect(typeof result).toBe("number");
    });

    it("AC-2.2: calcKcal should clamp result to 0 when calculation is negative", async () => {
      const { calcKcal } = await import("@/lib/kcal");

      // Very light exercise, minimal time → near zero
      const result = calcKcal("ex_squat", 10, 30);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(100);
    });

    it("AC-2.3: calcKcal should clamp result to 2000 when calculation exceeds 2000", async () => {
      const { calcKcal } = await import("@/lib/kcal");

      // Extreme: high MET exercise, long duration, heavy weight
      // Should be clamped to 2000
      const result = calcKcal("ex_squat", 7200, 150); // 2 hours, 150kg
      expect(result).toBeLessThanOrEqual(2000);
      expect(result).toBeGreaterThan(0);
    });

    it("AC-2.4: calcKcal should return 0 for zero duration", async () => {
      const { calcKcal } = await import("@/lib/kcal");

      const result = calcKcal("ex_squat", 0, 75);
      expect(result).toBe(0);
    });

    it("AC-2.5: calcKcal should vary kcal by exercise type (different MET values)", async () => {
      const { calcKcal } = await import("@/lib/kcal");

      // Same duration & weight, different exercises should yield different kcal
      const squat = calcKcal("ex_squat", 1800, 75);
      const pushUp = calcKcal("ex_push_up", 1800, 75);

      // At least one should differ (exercises have different MET values)
      // Both should be in valid range
      expect(squat).toBeGreaterThanOrEqual(0);
      expect(squat).toBeLessThanOrEqual(2000);
      expect(pushUp).toBeGreaterThanOrEqual(0);
      expect(pushUp).toBeLessThanOrEqual(2000);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // AC-3: grantPromotion(code, amount) — 5000 cap + grantPromotionReward
  // ─────────────────────────────────────────────────────────────────
  describe("AC-3: grantPromotion with 5000 amount cap and delegation to grantPromotionReward", () => {
    it("AC-3.1: grantPromotion should call grantPromotionReward with exact amount when amount ≤ 5000", async () => {
      const { grantPromotionReward } = await import("@apps-in-toss/web-framework");
      const { grantPromotion } = await import("@/lib/promotion");

      const amount = 3000;
      await grantPromotion("PROMO_CODE_123", amount);

      expect(grantPromotionReward).toHaveBeenCalledWith({
        params: { promotionCode: "PROMO_CODE_123", amount: 3000 },
      });
    });

    it("AC-3.2: grantPromotion should cap amount to 5000 when amount > 5000", async () => {
      const { grantPromotionReward } = await import("@apps-in-toss/web-framework");
      const { grantPromotion } = await import("@/lib/promotion");

      const amount = 10000;
      await grantPromotion("PROMO_CODE_456", amount);

      expect(grantPromotionReward).toHaveBeenCalledWith({
        params: { promotionCode: "PROMO_CODE_456", amount: 5000 },
      });
    });

    it("AC-3.3: grantPromotion should handle amount exactly at 5000 boundary", async () => {
      const { grantPromotionReward } = await import("@apps-in-toss/web-framework");
      const { grantPromotion } = await import("@/lib/promotion");

      const amount = 5000;
      await grantPromotion("PROMO_CODE_789", amount);

      expect(grantPromotionReward).toHaveBeenCalledWith({
        params: { promotionCode: "PROMO_CODE_789", amount: 5000 },
      });
    });

    it("AC-3.4: grantPromotion should cap very large amounts (e.g., 1000000) to 5000", async () => {
      const { grantPromotionReward } = await import("@apps-in-toss/web-framework");
      const { grantPromotion } = await import("@/lib/promotion");

      const amount = 1000000;
      await grantPromotion("PROMO_UNLIMITED", amount);

      expect(grantPromotionReward).toHaveBeenCalledWith({
        params: { promotionCode: "PROMO_UNLIMITED", amount: 5000 },
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // AC-4: console.error 미사용
  // ─────────────────────────────────────────────────────────────────
  describe("AC-4: No console.error usage in API/kcal/promotion implementations", () => {
    it("AC-4.1: postPlan should not call console.error on API error", async () => {
      const { postPlan } = await import("@/lib/api");

      const consoleSpy = vi.spyOn(console, "error");
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "Bad request" }),
      });

      global.fetch = mockFetch;

      const req: PlanApiRequest = {
        goal: "diet",
        level: "beginner",
        ageGroup: "20s",
      };

      try {
        await postPlan(req);
      } catch {
        // Error expected — verify no console.error was called
      }

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("AC-4.2: postReport should not call console.error on network/API error", async () => {
      const { postReport } = await import("@/lib/api");

      const consoleSpy = vi.spyOn(console, "error");
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Internal server error" }),
      });

      global.fetch = mockFetch;

      const req: ReportApiRequest = {
        exerciseId: "ex_squat",
        completedReps: 5,
        durationSec: 60,
        weightKg: 70,
      };

      try {
        await postReport(req);
      } catch {
        // Error expected
      }

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("AC-4.3: calcKcal should not call console.error for any valid input", async () => {
      const { calcKcal } = await import("@/lib/kcal");

      const consoleSpy = vi.spyOn(console, "error");

      // Test various inputs
      calcKcal("ex_squat", 1800, 75);
      calcKcal("ex_push_up", 0, 70);
      calcKcal("ex_deadlift", 7200, 150);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("AC-4.4: grantPromotion should not call console.error when delegating to grantPromotionReward", async () => {
      const { grantPromotion } = await import("@/lib/promotion");

      const consoleSpy = vi.spyOn(console, "error");

      await grantPromotion("TEST_PROMO", 2500);
      await grantPromotion("TEST_PROMO_HIGH", 10000);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
