import type { ForecastDay } from "@/lib/weather/openmeteo";
import type { GardenLocation } from "@/lib/types";

export type MonthWeatherCacheEntry = {
  at: number;
  days: Record<string, ForecastDay>;
  partial: boolean;
  timezone: string;
};

export const MONTH_WEATHER_CACHE_TTL_MS = 45 * 60 * 1000;

const cache = new Map<string, MonthWeatherCacheEntry>();

export function monthWeatherCacheKey(
  loc: GardenLocation,
  year: number,
  month: number,
): string {
  return `${loc.lat},${loc.lon},${loc.timezone ?? "auto"},${year},${month}`;
}

export function getCachedMonthWeather(
  key: string,
  ttlMs = MONTH_WEATHER_CACHE_TTL_MS,
): MonthWeatherCacheEntry | undefined {
  const hit = cache.get(key);
  if (!hit || Date.now() - hit.at >= ttlMs) return undefined;
  if (Object.keys(hit.days).length === 0) return undefined;
  return hit;
}

export function setCachedMonthWeather(
  key: string,
  entry: Omit<MonthWeatherCacheEntry, "at">,
): void {
  if (Object.keys(entry.days).length === 0) return;
  cache.set(key, { ...entry, at: Date.now() });
}

export function clearMonthWeatherCache(): void {
  cache.clear();
}
