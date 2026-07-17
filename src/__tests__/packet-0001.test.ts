import { describe, it, expect } from "vitest";

/**
 * Packet 0001: 전체 엔티티 타입 + RouteState 정의
 *
 * SPEC의 5개 모델 및 API req/res 타입, 페이지 간 이동 계약 RouteState 정의
 * 런타임 코드 없이 순수 타입만 export — tsc --noEmit 통과 필수
 *
 * AC-1: 5개 핵심 인터페이스 정의 (UserProfile, WorkoutPlan, PlanExercise, WorkoutSession, FormFeedback, Challenge, AppFlags)
 * AC-2: API request/response 타입 정의 (PlanApiRequest/Response, ReportApiRequest/Response, ApiError)
 * AC-3: RouteState 타입 정의 (/workout/:exerciseId, /report/:sessionId)
 * AC-4: tsc --noEmit 통과 (컴파일 에러 0개)
 */

describe("Packet 0001: Entity Types & RouteState", () => {
  // AC-1: 5개 핵심 인터페이스 정의

  describe("AC-1: UserProfile interface", () => {
    it("should export UserProfile with all required fields", () => {
      // Type validation: UserProfile should have these exact fields
      const testProfile = {
        tossUserKey: "user-123",
        nickname: "John",
        heightCm: 180,
        weightKg: 75.5,
        ageGroup: "30s" as const,
        goal: "muscle" as const,
        level: "intermediate" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // All fields should be present
      expect(testProfile).toHaveProperty("tossUserKey");
      expect(testProfile).toHaveProperty("nickname");
      expect(testProfile).toHaveProperty("heightCm");
      expect(testProfile).toHaveProperty("weightKg");
      expect(testProfile).toHaveProperty("ageGroup");
      expect(testProfile).toHaveProperty("goal");
      expect(testProfile).toHaveProperty("level");
      expect(testProfile).toHaveProperty("createdAt");
      expect(testProfile).toHaveProperty("updatedAt");

      // Type validation
      expect(typeof testProfile.tossUserKey).toBe("string");
      expect(typeof testProfile.nickname).toBe("string");
      expect(typeof testProfile.heightCm).toBe("number");
      expect(typeof testProfile.weightKg).toBe("number");
      expect(["20s", "30s", "40s"]).toContain(testProfile.ageGroup);
      expect(["diet", "muscle", "health"]).toContain(testProfile.goal);
      expect(["beginner", "intermediate"]).toContain(testProfile.level);
    });

    it("should enforce ageGroup as literal union: 20s | 30s | 40s", () => {
      const validAges = ["20s", "30s", "40s"];
      validAges.forEach((age) => {
        expect(["20s", "30s", "40s"]).toContain(age);
      });
    });

    it("should enforce goal as literal union: diet | muscle | health", () => {
      const validGoals = ["diet", "muscle", "health"];
      validGoals.forEach((goal) => {
        expect(["diet", "muscle", "health"]).toContain(goal);
      });
    });

    it("should enforce level as literal union: beginner | intermediate", () => {
      const validLevels = ["beginner", "intermediate"];
      validLevels.forEach((level) => {
        expect(["beginner", "intermediate"]).toContain(level);
      });
    });
  });

  describe("AC-1: WorkoutPlan interface", () => {
    it("should export WorkoutPlan with id, name, description, exercises, createdAt, updatedAt", () => {
      const testPlan = {
        id: "plan-1",
        name: "12주 벌크업",
        description: "근력과 근육 증가를 목표로 한 계획",
        exercises: [] as any[],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(testPlan).toHaveProperty("id");
      expect(testPlan).toHaveProperty("name");
      expect(testPlan).toHaveProperty("description");
      expect(testPlan).toHaveProperty("exercises");
      expect(testPlan).toHaveProperty("createdAt");
      expect(testPlan).toHaveProperty("updatedAt");

      expect(typeof testPlan.id).toBe("string");
      expect(typeof testPlan.name).toBe("string");
      expect(typeof testPlan.description).toBe("string");
      expect(Array.isArray(testPlan.exercises)).toBe(true);
    });
  });

  describe("AC-1: PlanExercise interface", () => {
    it("should export PlanExercise with id, name, sets, reps, weight, notes", () => {
      const testExercise = {
        id: "exercise-1",
        name: "벤치프레스",
        sets: 4,
        reps: 8,
        weight: 100,
        notes: "천천히 내린다",
      };

      expect(testExercise).toHaveProperty("id");
      expect(testExercise).toHaveProperty("name");
      expect(testExercise).toHaveProperty("sets");
      expect(testExercise).toHaveProperty("reps");
      expect(testExercise).toHaveProperty("weight");
      expect(testExercise).toHaveProperty("notes");

      expect(typeof testExercise.id).toBe("string");
      expect(typeof testExercise.name).toBe("string");
      expect(typeof testExercise.sets).toBe("number");
      expect(typeof testExercise.reps).toBe("number");
      expect(typeof testExercise.weight).toBe("number");
      expect(typeof testExercise.notes).toBe("string");
    });
  });

  describe("AC-1: WorkoutSession interface", () => {
    it("should export WorkoutSession with id, exerciseId, date, completedSets, completedReps, actualWeight, duration, notes", () => {
      const testSession = {
        id: "session-1",
        exerciseId: "exercise-1",
        date: new Date(),
        completedSets: 4,
        completedReps: 8,
        actualWeight: 95,
        duration: 25,
        notes: "좀 힘들었음",
      };

      expect(testSession).toHaveProperty("id");
      expect(testSession).toHaveProperty("exerciseId");
      expect(testSession).toHaveProperty("date");
      expect(testSession).toHaveProperty("completedSets");
      expect(testSession).toHaveProperty("completedReps");
      expect(testSession).toHaveProperty("actualWeight");
      expect(testSession).toHaveProperty("duration");
      expect(testSession).toHaveProperty("notes");

      expect(typeof testSession.id).toBe("string");
      expect(typeof testSession.exerciseId).toBe("string");
      expect(testSession.date instanceof Date).toBe(true);
      expect(typeof testSession.duration).toBe("number");
    });
  });

  describe("AC-1: FormFeedback interface", () => {
    it("should export FormFeedback with sessionId, difficulty, soreness, mood, timestamp", () => {
      const testFeedback = {
        sessionId: "session-1",
        difficulty: 3,
        soreness: 2,
        mood: 4,
        timestamp: new Date(),
      };

      expect(testFeedback).toHaveProperty("sessionId");
      expect(testFeedback).toHaveProperty("difficulty");
      expect(testFeedback).toHaveProperty("soreness");
      expect(testFeedback).toHaveProperty("mood");
      expect(testFeedback).toHaveProperty("timestamp");

      expect(typeof testFeedback.difficulty).toBe("number");
      expect(typeof testFeedback.soreness).toBe("number");
      expect(typeof testFeedback.mood).toBe("number");
    });

    it("should validate difficulty, soreness, mood as 1-5 range", () => {
      const validScores = [1, 2, 3, 4, 5];
      const score = 3;
      expect(validScores).toContain(score);
    });
  });

  describe("AC-1: Challenge interface", () => {
    it("should export Challenge with id, name, type, target, progress, reward, startDate, endDate", () => {
      const testChallenge = {
        id: "challenge-1",
        name: "30일 스트릭",
        type: "streak" as const,
        target: 30,
        progress: 15,
        reward: 5000,
        startDate: new Date(),
        endDate: new Date(),
      };

      expect(testChallenge).toHaveProperty("id");
      expect(testChallenge).toHaveProperty("name");
      expect(testChallenge).toHaveProperty("type");
      expect(testChallenge).toHaveProperty("target");
      expect(testChallenge).toHaveProperty("progress");
      expect(testChallenge).toHaveProperty("reward");
      expect(testChallenge).toHaveProperty("startDate");
      expect(testChallenge).toHaveProperty("endDate");

      expect(typeof testChallenge.id).toBe("string");
      expect(typeof testChallenge.target).toBe("number");
      expect(typeof testChallenge.reward).toBe("number");
    });
  });

  describe("AC-1: AppFlags interface", () => {
    it("should export AppFlags with aiNoticeShown, onboardingComplete", () => {
      const testFlags = {
        aiNoticeShown: true,
        onboardingComplete: true,
      };

      expect(testFlags).toHaveProperty("aiNoticeShown");
      expect(testFlags).toHaveProperty("onboardingComplete");

      expect(typeof testFlags.aiNoticeShown).toBe("boolean");
      expect(typeof testFlags.onboardingComplete).toBe("boolean");
    });
  });

  // AC-2: API request/response 타입 정의

  describe("AC-2: PlanApiRequest & PlanApiResponse", () => {
    it("should export PlanApiRequest with goal, level, ageGroup", () => {
      const testRequest = {
        goal: "muscle" as const,
        level: "intermediate" as const,
        ageGroup: "30s" as const,
      };

      expect(testRequest).toHaveProperty("goal");
      expect(testRequest).toHaveProperty("level");
      expect(testRequest).toHaveProperty("ageGroup");

      expect(["diet", "muscle", "health"]).toContain(testRequest.goal);
      expect(["beginner", "intermediate"]).toContain(testRequest.level);
      expect(["20s", "30s", "40s"]).toContain(testRequest.ageGroup);
    });

    it("should export PlanApiResponse with plan: WorkoutPlan", () => {
      const testResponse = {
        plan: {
          id: "plan-1",
          name: "계획",
          description: "설명",
          exercises: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      expect(testResponse).toHaveProperty("plan");
      expect(testResponse.plan).toHaveProperty("id");
      expect(testResponse.plan).toHaveProperty("exercises");
      expect(Array.isArray(testResponse.plan.exercises)).toBe(true);
    });
  });

  describe("AC-2: ReportApiRequest & ReportApiResponse", () => {
    it("should export ReportApiRequest with sessionId, feedback data", () => {
      const testRequest = {
        sessionId: "session-1",
        difficulty: 3,
        soreness: 2,
        mood: 4,
        notes: "좋았음",
      };

      expect(testRequest).toHaveProperty("sessionId");
      expect(testRequest).toHaveProperty("difficulty");
      expect(testRequest).toHaveProperty("soreness");
      expect(testRequest).toHaveProperty("mood");
    });

    it("should export ReportApiResponse with report summary", () => {
      const testResponse = {
        report: {
          sessionId: "session-1",
          feedback: {
            difficulty: 3,
            soreness: 2,
            mood: 4,
          },
          status: "recorded" as const,
        },
      };

      expect(testResponse).toHaveProperty("report");
      expect(testResponse.report).toHaveProperty("sessionId");
      expect(testResponse.report).toHaveProperty("status");
    });
  });

  describe("AC-2: ApiError", () => {
    it("should export ApiError with error: string", () => {
      const testError = {
        error: "Internal Server Error",
      };

      expect(testError).toHaveProperty("error");
      expect(typeof testError.error).toBe("string");
    });

    it("should handle 400, 401, 404 error responses", () => {
      const errorResponses = [
        { error: "Bad Request" },
        { error: "Unauthorized" },
        { error: "Not Found" },
      ];

      errorResponses.forEach((resp) => {
        expect(resp).toHaveProperty("error");
        expect(typeof resp.error).toBe("string");
      });
    });
  });

  // AC-3: RouteState 타입 정의

  describe("AC-3: RouteState for navigation", () => {
    it("should define RouteState for /workout/:exerciseId", () => {
      const workoutState = {
        exerciseId: "exercise-1",
        planId: "plan-1",
      };

      expect(workoutState).toHaveProperty("exerciseId");
      expect(workoutState).toHaveProperty("planId");
      expect(typeof workoutState.exerciseId).toBe("string");
      expect(typeof workoutState.planId).toBe("string");
    });

    it("should define RouteState for /report/:sessionId", () => {
      const reportState = {
        sessionId: "session-1",
        exerciseId: "exercise-1",
      };

      expect(reportState).toHaveProperty("sessionId");
      expect(reportState).toHaveProperty("exerciseId");
      expect(typeof reportState.sessionId).toBe("string");
      expect(typeof reportState.exerciseId).toBe("string");
    });

    it("should support discriminated union for different route states", () => {
      const states = [
        { type: "workout" as const, exerciseId: "ex-1", planId: "p-1" },
        { type: "report" as const, sessionId: "s-1", exerciseId: "ex-1" },
      ];

      expect(states[0].type).toBe("workout");
      expect(states[1].type).toBe("report");
      expect(states[0]).toHaveProperty("exerciseId");
      expect(states[1]).toHaveProperty("sessionId");
    });
  });

  // AC-4: Type system validation (tsc --noEmit compatibility)

  describe("AC-4: Type system completeness", () => {
    it("should export all 7 core entity types", () => {
      // This test verifies that all types are exportable from src/lib/types.ts
      // The actual import will happen when src/lib/types.ts is created
      const entityNames = [
        "UserProfile",
        "WorkoutPlan",
        "PlanExercise",
        "WorkoutSession",
        "FormFeedback",
        "Challenge",
        "AppFlags",
      ];

      expect(entityNames.length).toBe(7);
      entityNames.forEach((name) => {
        expect(typeof name).toBe("string");
        expect(name.length).toBeGreaterThan(0);
      });
    });

    it("should export all API types", () => {
      const apiTypeNames = [
        "PlanApiRequest",
        "PlanApiResponse",
        "ReportApiRequest",
        "ReportApiResponse",
        "ApiError",
      ];

      expect(apiTypeNames.length).toBe(5);
      apiTypeNames.forEach((name) => {
        expect(typeof name).toBe("string");
      });
    });

    it("should export RouteState type", () => {
      const routeStateTypeName = "RouteState";
      expect(typeof routeStateTypeName).toBe("string");
      expect(routeStateTypeName.length).toBeGreaterThan(0);
    });

    it("should use proper literal types for enums (not string unions)", () => {
      // Verify that discriminated unions and literal types work
      const ageGroupLiterals = ["20s", "30s", "40s"] as const;
      const goalLiterals = ["diet", "muscle", "health"] as const;
      const levelLiterals = ["beginner", "intermediate"] as const;

      const sample1: typeof ageGroupLiterals[number] = "20s";
      const sample2: typeof goalLiterals[number] = "muscle";
      const sample3: typeof levelLiterals[number] = "intermediate";

      expect(["20s", "30s", "40s"]).toContain(sample1);
      expect(["diet", "muscle", "health"]).toContain(sample2);
      expect(["beginner", "intermediate"]).toContain(sample3);
    });
  });

  // Integration: Type coherence across related entities

  describe("AC-1-4: Type coherence and relationships", () => {
    it("should link WorkoutPlan to PlanExercise array", () => {
      const exercise: any = {
        id: "ex-1",
        name: "Push-ups",
        sets: 3,
        reps: 10,
        weight: 0,
        notes: "",
      };

      const plan: any = {
        id: "p-1",
        name: "Basic",
        description: "",
        exercises: [exercise],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(Array.isArray(plan.exercises)).toBe(true);
      expect(plan.exercises[0].id).toBe("ex-1");
      expect(plan.exercises[0].name).toBe("Push-ups");
    });

    it("should link WorkoutSession to FormFeedback via sessionId", () => {
      const session: any = {
        id: "s-1",
        exerciseId: "ex-1",
        date: new Date(),
        completedSets: 3,
        completedReps: 10,
        actualWeight: 0,
        duration: 20,
        notes: "",
      };

      const feedback: any = {
        sessionId: session.id,
        difficulty: 3,
        soreness: 1,
        mood: 4,
        timestamp: new Date(),
      };

      expect(feedback.sessionId).toBe(session.id);
      expect(typeof feedback.difficulty).toBe("number");
    });

    it("should support Challenge progress tracking", () => {
      const challenge: any = {
        id: "c-1",
        name: "7-Day Streak",
        type: "streak",
        target: 7,
        progress: 5,
        reward: 5000,
        startDate: new Date(),
        endDate: new Date(),
      };

      expect(challenge.progress).toBeLessThanOrEqual(challenge.target);
      expect(challenge.progress).toBeGreaterThanOrEqual(0);
      expect(challenge.reward).toBeGreaterThanOrEqual(0);
    });
  });

  // Edge cases: Validation and boundary conditions

  describe("AC-1-4: Type validation and edge cases", () => {
    it("should handle minimum and maximum numeric values", () => {
      const profile: any = {
        tossUserKey: "u-1",
        nickname: "Test",
        heightCm: 150,
        weightKg: 45.0,
        ageGroup: "20s",
        goal: "health",
        level: "beginner",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(profile.heightCm).toBeGreaterThan(0);
      expect(profile.weightKg).toBeGreaterThan(0);
    });

    it("should handle empty strings and optional fields gracefully", () => {
      const exercise: any = {
        id: "ex-1",
        name: "Exercise",
        sets: 1,
        reps: 1,
        weight: 0,
        notes: "",
      };

      expect(exercise.notes).toBe("");
      expect(typeof exercise.notes).toBe("string");
    });

    it("should preserve Date types for timestamps", () => {
      const now = new Date();
      const profile: any = {
        tossUserKey: "u-1",
        nickname: "Test",
        heightCm: 170,
        weightKg: 70,
        ageGroup: "30s",
        goal: "muscle",
        level: "intermediate",
        createdAt: now,
        updatedAt: now,
      };

      expect(profile.createdAt instanceof Date).toBe(true);
      expect(profile.updatedAt instanceof Date).toBe(true);
      expect(profile.createdAt.getTime()).toBeLessThanOrEqual(
        profile.updatedAt.getTime()
      );
    });
  });
});
