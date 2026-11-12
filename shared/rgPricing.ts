/** Preserve an explicitly saved 0%; only absent or invalid rates use a default. */
export function rgRate(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
