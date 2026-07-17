import type { PlanApiRequest, PlanApiResponse, ReportApiRequest, ReportApiResponse, ApiError } from "@/lib/types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const TIMEOUT_MS = 10000;

// Captured at module load time so a later `vi.spyOn(global, "AbortController")`
// in tests (which leaves `new` broken if never restored) can't affect this.
const AbortControllerCtor = AbortController;

async function postJson<TReq, TRes>(path: string, req: TReq): Promise<TRes> {
  const controller = new AbortControllerCtor();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body: ApiError = await res.json();
      throw new Error(body.error);
    }

    return (await res.json()) as TRes;
  } finally {
    clearTimeout(timer);
  }
}

export async function postPlan(req: PlanApiRequest): Promise<PlanApiResponse> {
  return postJson<PlanApiRequest, PlanApiResponse>("/api/plan", req);
}

export async function postReport(req: ReportApiRequest): Promise<ReportApiResponse> {
  return postJson<ReportApiRequest, ReportApiResponse>("/api/report", req);
}
