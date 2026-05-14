"use client";

import * as React from "react";
import type { ForecastDay } from "@/lib/weather/openmeteo";
import type { GardenLocation } from "@/lib/types";

type CacheEntry = {
  at: number;
  days: Record<string, ForecastDay>;
  partial: boolean;
  timezone: string;
};

const CACHE_TTL_MS = 45 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function cacheKey(
  loc: GardenLocation,
  year: number,
  month: number,
): string {
  return `${loc.lat},${loc.lon},${loc.timezone ?? "auto"},${year},${month}`;
}

export function useMonthWeather(
  location: GardenLocation | undefined,
  year: number,
  month: number,
  enabled: boolean,
): {
  days: Record<string, ForecastDay>;
  partial: boolean;
  loading: boolean;
  error: string | null;
} {
  const [days, setDays] = React.useState<Record<string, ForecastDay>>({});
  const [partial, setPartial] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!enabled || !location) {
      setDays({});
      setPartial(false);
      setLoading(false);
      setError(location ? null : "Posizione non impostata");
      return;
    }

    const key = cacheKey(location, year, month);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      setDays(hit.days);
      setPartial(hit.partial);
      setLoading(false);
      setError(null);
      return;
    }

    const ac = new AbortController();
    setLoading(true);
    setError(null);

    const url = new URL("/api/calendar-weather", window.location.origin);
    url.searchParams.set("lat", String(location.lat));
    url.searchParams.set("lon", String(location.lon));
    url.searchParams.set("year", String(year));
    url.searchParams.set("month", String(month));
    if (location.timezone) url.searchParams.set("timezone", location.timezone);

    fetch(url.toString(), { signal: ac.signal })
      .then(async (res) => {
        const data = (await res.json()) as {
          days?: Record<string, ForecastDay>;
          partial?: boolean;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Errore meteo");
        const nextDays = data.days ?? {};
        const nextPartial = Boolean(data.partial);
        cache.set(key, {
          at: Date.now(),
          days: nextDays,
          partial: nextPartial,
          timezone: location.timezone ?? "auto",
        });
        setDays(nextDays);
        setPartial(nextPartial);
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return;
        setDays({});
        setPartial(true);
        setError(err instanceof Error ? err.message : "Errore meteo");
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [enabled, location, year, month]);

  return { days, partial, loading, error };
}
