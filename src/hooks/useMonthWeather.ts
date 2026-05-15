"use client";

import * as React from "react";
import type { ForecastDay } from "@/lib/weather/openmeteo";
import type { GardenLocation } from "@/lib/types";
import { normalizeGardenLocation } from "@/lib/weather/location";
import {
  getCachedMonthWeather,
  monthWeatherCacheKey,
  setCachedMonthWeather,
} from "@/lib/weather/month-weather-cache";

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

  const normalized = React.useMemo(
    () => normalizeGardenLocation(location),
    [location],
  );
  const lat = normalized?.lat;
  const lon = normalized?.lon;
  const timezone = normalized?.timezone;

  React.useEffect(() => {
    if (!enabled || lat == null || lon == null) {
      setDays({});
      setPartial(false);
      setLoading(false);
      setError(normalized ? null : "Posizione non impostata");
      return;
    }

    const loc: GardenLocation = { lat, lon, timezone, label: normalized?.label };
    const key = monthWeatherCacheKey(loc, year, month);
    const hit = getCachedMonthWeather(key);
    if (hit) {
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
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("year", String(year));
    url.searchParams.set("month", String(month));
    if (timezone) url.searchParams.set("timezone", timezone);

    fetch(url.toString(), { signal: ac.signal })
      .then(async (res) => {
        let data: {
          days?: Record<string, ForecastDay>;
          partial?: boolean;
          error?: string;
        };
        try {
          data = (await res.json()) as typeof data;
        } catch {
          throw new Error("Errore meteo");
        }
        if (!res.ok) throw new Error(data.error ?? "Errore meteo");
        const nextDays = data.days ?? {};
        const nextPartial = Boolean(data.partial);
        if (Object.keys(nextDays).length === 0) {
          throw new Error(data.error ?? "Dati meteo non disponibili.");
        }
        setCachedMonthWeather(key, {
          days: nextDays,
          partial: nextPartial,
          timezone: timezone ?? "auto",
        });
        setDays(nextDays);
        setPartial(nextPartial);
        setError(null);
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
  }, [enabled, lat, lon, timezone, normalized?.label, year, month]);

  return { days, partial, loading, error };
}
