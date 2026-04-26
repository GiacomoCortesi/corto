import type {
  WeatherForecast3d,
  WeatherHistory7d,
} from "@/lib/activity-suggestions/types";
import type { Forecast } from "@/lib/weather/openmeteo";

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function toYmdUTC(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export function summarizeForActivitySuggestions(
  f: Forecast,
  nowMs: number,
): { previous7d: WeatherHistory7d; next3d: WeatherForecast3d } | null {
  const today = toYmdUTC(nowMs);
  const idx = f.days.findIndex((d) => d.date === today);
  if (idx === -1) return null;

  const past = f.days.slice(Math.max(0, idx - 7), idx);
  const next = f.days.slice(idx, Math.min(f.days.length, idx + 3));
  if (past.length === 0 || next.length === 0) return null;

  const pastRain = past.reduce((a, d) => a + (d.precipMm ?? 0), 0);
  const nextRain = next.reduce((a, d) => a + (d.precipMm ?? 0), 0);

  const pastTemps = past
    .map((d) =>
      d.tMax !== null && d.tMin !== null ? (d.tMax + d.tMin) / 2 : null,
    )
    .filter((v): v is number => v !== null);

  const nextTemps = next
    .map((d) =>
      d.tMax !== null && d.tMin !== null ? (d.tMax + d.tMin) / 2 : null,
    )
    .filter((v): v is number => v !== null);

  const pastAvg = avg(pastTemps);
  const nextAvg = avg(nextTemps);

  return {
    previous7d: {
      rainMm: Math.round(pastRain * 10) / 10,
      avgTempC: pastAvg === null ? undefined : Math.round(pastAvg * 10) / 10,
    },
    next3d: {
      rainMm: Math.round(nextRain * 10) / 10,
      avgTempC: nextAvg === null ? undefined : Math.round(nextAvg * 10) / 10,
    },
  };
}

