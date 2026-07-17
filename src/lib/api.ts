// Stub for packet-0005 (TDD red phase)
// Real implementations will be added in green phase

import type { PlanApiRequest, PlanApiResponse, ReportApiRequest, ReportApiResponse } from "@/lib/types";

export async function postPlan(_req: PlanApiRequest): Promise<PlanApiResponse> {
  throw new Error("postPlan not implemented");
}

export async function postReport(_req: ReportApiRequest): Promise<ReportApiResponse> {
  throw new Error("postReport not implemented");
}
