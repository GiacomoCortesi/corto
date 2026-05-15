"use client";

import * as React from "react";
import type { ForecastHour } from "@/lib/weather/openmeteo";
import type { WeatherDaySource } from "@/lib/weather/openmeteo";
import type { GardenLocation } from "@/lib/types";
import { normalizeGardenLocation } from "@/lib/weather/location";
import {
  getCachedHourlyWeather,
  hourlyWeatherCacheKey,
  setCachedHourlyWeather,
} from "@/lib/weather/hourly-weather-cache";

export function useDayHourlyWeather(
  location: GardenLocation | undefined,
  date: string | undefined,
  source: WeatherDaySource | undefined,
  enabled: boolean,
): {
  hours: ForecastHour[];
  loading: boolean;
  error: string | null;
  unavailable: boolean;
} {
  const [hours, setHours] = React.useState<ForecastHour[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [unavailable, setUnavailable] = React.useState(false);

  const normalized = React.useMemo(
    () => normalizeGardenLocation(location),
    [location],
  );
  const lat = normalized?.lat;
  const lon = normalized?.lon;
  const timezone = normalized?.timezone;

  React.useEffect(() => {
    if (!enabled || !date || lat == null || lon == null) {
      setHours([]);
      setLoading(false);
      setError(null);
      setUnavailable(source === "climatology");
      return;
    }

    if (source === "climatology") {
      setHours([]);
      setLoading(false);
      setError(null);
      setUnavailable(true);
      return;
    }

    const key = hourlyWeatherCacheKey(lat, lon, date, timezone, source);
    const hit = getCachedHourlyWeather(key);
    if (hit) {
      setHours(hit);
      setLoading(false);
      setError(null);
      setUnavailable(hit.length === 0);
      return;
    }

    const ac = new AbortController();
    setLoading(true);
    setError(null);
    setUnavailable(false);

    const url = new URL("/api/weather-hourly", window.location.origin);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("date", date);
    if (timezone) url.searchParams.set("timezone", timezone);
    if (source) url.searchParams.set("source", source);

    fetch(url.toString(), { signal: ac.signal })
      .then(async (res) => {
        const data = (await res.json()) as {
          hours?: ForecastHour[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Errore meteo orario");
        const nextHours = data.hours ?? [];
        if (nextHours.length > 0) {
          setCachedHourlyWeather(key, nextHours);
        } else {
          setUnavailable(true);
        }
        setHours(nextHours);
        setError(null);
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return;
        setHours([]);
        setUnavailable(true);
        setError(err instanceof Error ? err.message : "Errore meteo orario");
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [enabled, date, lat, lon, timezone, source]);

  return { hours, loading, error, unavailable };
}
