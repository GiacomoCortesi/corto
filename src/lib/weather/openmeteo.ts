/**
 * Minimal wrapper around Open-Meteo (https://open-meteo.com): a free,
 * no-key API used by the suggestions engine to reason about rain,
 * max/min temperatures, evapotranspiration, and frost over the next
 * 14 days.
 *
 * No external dependencies: server-side `fetch` only.
 */

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const DAILY_FIELDS = [
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "precipitation_probability_max",
  "et0_fao_evapotranspiration",
  "weather_code",
] as const;

export type ForecastDay = {
  date: string; // YYYY-MM-DD
  tMax: number | null;
  tMin: number | null;
  precipMm: number | null;
  precipProb: number | null;
  /** FAO-56 reference evapotranspiration (mm/day) */
  et0: number | null;
  weatherCode: number | null;
};

export type Forecast = {
  lat: number;
  lon: number;
  timezone: string;
  days: ForecastDay[];
};

type RawForecastResponse = {
  timezone?: string;
  daily?: {
    time?: string[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    precipitation_sum?: (number | null)[];
    precipitation_probability_max?: (number | null)[];
    et0_fao_evapotranspiration?: (number | null)[];
    weather_code?: (number | null)[];
  };
};

function pickAt<T>(arr: T[] | undefined, i: number): T | null {
  if (!arr || i < 0 || i >= arr.length) return null;
  const v = arr[i];
  return v === undefined ? null : v;
}

/**
 * Fetches up to `forecastDays` (max 16) daily forecasts for the given
 * location. Returns `null` on network/parsing errors so the caller can
 * degrade gracefully (suggestions without weather).
 */
export async function fetchForecast(
  lat: number,
  lon: number,
  timezone = "auto",
  forecastDays = 14,
): Promise<Forecast | null> {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("daily", DAILY_FIELDS.join(","));
  url.searchParams.set("forecast_days", String(Math.min(16, Math.max(1, forecastDays))));
  url.searchParams.set("timezone", timezone);

  let res: Response;
  try {
    res = await fetch(url.toString(), { cache: "no-store" });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  let data: RawForecastResponse;
  try {
    data = (await res.json()) as RawForecastResponse;
  } catch {
    return null;
  }

  const times = data.daily?.time ?? [];
  const days: ForecastDay[] = times.map((date, i) => ({
    date,
    tMax: pickAt(data.daily?.temperature_2m_max, i),
    tMin: pickAt(data.daily?.temperature_2m_min, i),
    precipMm: pickAt(data.daily?.precipitation_sum, i),
    precipProb: pickAt(data.daily?.precipitation_probability_max, i),
    et0: pickAt(data.daily?.et0_fao_evapotranspiration, i),
    weatherCode: pickAt(data.daily?.weather_code, i),
  }));

  return {
    lat,
    lon,
    timezone: data.timezone ?? timezone,
    days,
  };
}

/**
 * Variant that also includes a history of previous days (Open-Meteo
 * supports `past_days` on the same forecast endpoint).
 */
export async function fetchForecastWithPastDays(
  lat: number,
  lon: number,
  timezone = "auto",
  forecastDays = 14,
  pastDays = 0,
): Promise<Forecast | null> {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("daily", DAILY_FIELDS.join(","));
  url.searchParams.set("forecast_days", String(Math.min(16, Math.max(1, forecastDays))));
  if (pastDays > 0) {
    url.searchParams.set("past_days", String(Math.min(92, Math.max(1, pastDays))));
  }
  url.searchParams.set("timezone", timezone);

  let res: Response;
  try {
    res = await fetch(url.toString(), { cache: "no-store" });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  let data: RawForecastResponse;
  try {
    data = (await res.json()) as RawForecastResponse;
  } catch {
    return null;
  }

  const times = data.daily?.time ?? [];
  const days: ForecastDay[] = times.map((date, i) => ({
    date,
    tMax: pickAt(data.daily?.temperature_2m_max, i),
    tMin: pickAt(data.daily?.temperature_2m_min, i),
    precipMm: pickAt(data.daily?.precipitation_sum, i),
    precipProb: pickAt(data.daily?.precipitation_probability_max, i),
    et0: pickAt(data.daily?.et0_fao_evapotranspiration, i),
    weatherCode: pickAt(data.daily?.weather_code, i),
  }));

  return {
    lat,
    lon,
    timezone: data.timezone ?? timezone,
    days,
  };
}

const WEEKDAY_IT = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"] as const;

function weekday(date: string): string {
  // "YYYY-MM-DD" -> use UTC to avoid timezone drift
  const d = new Date(`${date}T00:00:00Z`);
  return WEEKDAY_IT[d.getUTCDay()];
}

/**
 * Compresses the forecast into a few lines readable by the LLM (and by users).
 * Example:
 *   "Next 14 days @ Europe/Rome:
 *    - Total rain ~12 mm over 4 days (peak 8 mm on Wed 30/04).
 *    - Temperatures: max 14-28°C, min 8-18°C.
 *    - Mean ET0 ~3.4 mm/day (dry).
 *    - No frost expected."
 */
export function summarizeForecast(f: Forecast): string {
  if (f.days.length === 0) return "Nessuna previsione disponibile.";

  const totalPrecip = f.days.reduce((acc, d) => acc + (d.precipMm ?? 0), 0);
  const rainyDays = f.days.filter((d) => (d.precipMm ?? 0) >= 1);
  const peak = [...rainyDays].sort(
    (a, b) => (b.precipMm ?? 0) - (a.precipMm ?? 0),
  )[0];

  const tMaxes = f.days.map((d) => d.tMax).filter((v): v is number => v !== null);
  const tMins = f.days.map((d) => d.tMin).filter((v): v is number => v !== null);

  const minOf = (xs: number[]) => Math.min(...xs);
  const maxOf = (xs: number[]) => Math.max(...xs);
  const avg = (xs: number[]) =>
    xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

  const et0Vals = f.days
    .map((d) => d.et0)
    .filter((v): v is number => v !== null);
  const et0Mean = et0Vals.length ? avg(et0Vals) : null;

  const frostDays = f.days.filter((d) => (d.tMin ?? Infinity) <= 0);

  const lines: string[] = [];
  lines.push(`Prossimi ${f.days.length} gg @ ${f.timezone}:`);

  if (rainyDays.length === 0) {
    lines.push(`- Pioggia: nessuna pioggia significativa prevista.`);
  } else {
    const peakLine = peak
      ? ` (max ~${peak.precipMm?.toFixed(1)} mm il ${weekday(peak.date)} ${peak.date.slice(8, 10)}/${peak.date.slice(5, 7)})`
      : "";
    lines.push(
      `- Pioggia: ~${totalPrecip.toFixed(1)} mm su ${rainyDays.length} gg${peakLine}.`,
    );
  }

  if (tMaxes.length && tMins.length) {
    lines.push(
      `- Temperatures: max ${minOf(tMaxes).toFixed(0)}-${maxOf(tMaxes).toFixed(0)}°C, min ${minOf(tMins).toFixed(0)}-${maxOf(tMins).toFixed(0)}°C.`,
    );
  }

  if (et0Mean !== null) {
    const intensity =
      et0Mean >= 5 ? "molto secco" : et0Mean >= 3 ? "asciutto" : "umido";
    lines.push(`- ET0 media ~${et0Mean.toFixed(1)} mm/g (${intensity}).`);
  }

  if (frostDays.length > 0) {
    lines.push(
      `- Gelate previste: ${frostDays.length} gg (${frostDays
        .map((d) => `${weekday(d.date)} ${d.date.slice(8, 10)}`)
        .join(", ")}).`,
    );
  } else {
    lines.push(`- Nessuna gelata prevista.`);
  }

  return lines.join("\n");
}
