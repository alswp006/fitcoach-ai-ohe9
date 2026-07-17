const MET_TABLE: Record<string, number> = {
  ex_squat: 5.5,
  ex_push_up: 3.8,
  ex_deadlift: 6.0,
  ex_plank: 3.0,
  ex_lunge: 4.0,
};

const DEFAULT_MET = 4.0;
const MIN_KCAL = 0;
const MAX_KCAL = 2000;

export function calcKcal(exerciseId: string, durationSec: number, weightKg: number): number {
  const met = MET_TABLE[exerciseId] ?? DEFAULT_MET;
  const kcal = met * weightKg * (durationSec / 3600);
  return Math.min(MAX_KCAL, Math.max(MIN_KCAL, Math.round(kcal)));
}
