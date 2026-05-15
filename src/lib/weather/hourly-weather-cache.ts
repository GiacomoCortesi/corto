import type { ForecastHour } from "@/lib/weather/openmeteo";
import type { WeatherDaySource } from "@/lib/weather/openmeteo";

type CacheEntry = {
  at: number;
  hours: ForecastHour[];
};

export const HOURLY_WEATHER_CACHE_TTL_MS = 45 * 60 * 1000;

const cache = new Map<string, CacheEntry>();

export function hourlyWeatherCacheKey(
  lat: number,
  lon: number,
  date: string,
  timezone: string | undefined,
  source: WeatherDaySource | undefined,
): string {
  return `${lat},${lon},${date},${timezone ?? "auto"},${source ?? "auto"}`;
}

export function getCachedHourlyWeather(
  key: string,
  ttlMs = HOURLY_WEATHER_CACHE_TTL_MS,
): ForecastHour[] | undefined {
  const hit = cache.get(key);
  if (!hit || Date.now() - hit.at >= ttlMs) return undefined;
  return hit.hours;
}

export function setCachedHourlyWeather(key: string, hours: ForecastHour[]): void {
  if (hours.length === 0) return;
  cache.set(key, { at: Date.now(), hours });
}

export function clearHourlyWeatherCache(): void {
  cache.clear();
}
