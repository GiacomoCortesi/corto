import { daysInMonth } from "@/lib/calendar/month-grid";
import {
  fetchArchiveRange,
  fetchForecast,
  fetchForecastWithPastDays,
  type ForecastDay,
  type WeatherDaySource,
} from "@/lib/weather/openmeteo";

export type CalendarMonthWeather = {
  lat: number;
  lon: number;
  timezone: string;
  year: number;
  month: number;
  days: Record<string, ForecastDay>;
  partial: boolean;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function monthStartDate(year: number, month: number): string {
  return `${year}-${pad2(month)}-01`;
}

export function monthEndDate(year: number, month: number): string {
  return `${year}-${pad2(month)}-${pad2(daysInMonth(year, month))}`;
}

export function todayIso(timezone: string): string {
  const tz = timezone === "auto" ? "UTC" : timezone;
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}

export function addDaysIso(date: string, delta: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function compareIsoDate(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function monthDayKeys(year: number, month: number): string[] {
  const total = daysInMonth(year, month);
  const keys: string[] = [];
  for (let day = 1; day <= total; day++) {
    keys.push(`${year}-${pad2(month)}-${pad2(day)}`);
  }
  return keys;
}

function sourceForDay(
  date: string,
  today: string,
  climatology: boolean,
): WeatherDaySource {
  if (climatology) return "climatology";
  if (date < today) return "archive";
  return "forecast";
}

function putDay(
  days: Record<string, ForecastDay>,
  row: ForecastDay,
  source: WeatherDaySource,
): void {
  days[row.date] = { ...row, source };
}

/**
 * Builds a full month of daily weather by merging:
 * 1. Open-Meteo forecast (today … +16 days)
 * 2. Open-Meteo archive (observed past)
 * 3. Same month previous year as climatology for remaining future days
 */
export async function fetchCalendarMonthWeather(
  lat: number,
  lon: number,
  year: number,
  month: number,
  timezone = "auto",
): Promise<CalendarMonthWeather | null> {
  const probe = await fetchForecast(lat, lon, timezone, 1);
  const tz = probe?.timezone ?? timezone;
  const today = todayIso(tz);
  const start = monthStartDate(year, month);
  const end = monthEndDate(year, month);
  const keys = monthDayKeys(year, month);
  const days: Record<string, ForecastDay> = {};

  const overlapsForecast =
    compareIsoDate(end, today) >= 0 &&
    compareIsoDate(start, addDaysIso(today, 16)) <= 0;

  if (overlapsForecast) {
    const forecast = await fetchForecastWithPastDays(lat, lon, tz, 16, 92);
    for (const row of forecast?.days ?? []) {
      if (row.date >= start && row.date <= end) {
        putDay(days, row, sourceForDay(row.date, today, false));
      }
    }
  }

  const archiveLagEnd = addDaysIso(today, -3);
  if (compareIsoDate(start, today) < 0 && compareIsoDate(archiveLagEnd, start) >= 0) {
    const archEnd = compareIsoDate(end, today) < 0 ? end : archiveLagEnd;
    const archive = await fetchArchiveRange(lat, lon, start, archEnd, tz);
    for (const row of archive?.days ?? []) {
      if (!days[row.date]) {
        putDay(days, row, "archive");
      }
    }
  } else if (compareIsoDate(end, today) < 0) {
    const archive = await fetchArchiveRange(lat, lon, start, end, tz);
    for (const row of archive?.days ?? []) {
      putDay(days, row, "archive");
    }
  }

  const missing = keys.filter((k) => !days[k]);
  if (missing.length > 0) {
    const climaYear = year - 1;
    const clima = await fetchArchiveRange(
      lat,
      lon,
      monthStartDate(climaYear, month),
      monthEndDate(climaYear, month),
      tz,
    );
    for (const row of clima?.days ?? []) {
      const remapped = `${year}${row.date.slice(4)}`;
      if (!days[remapped] && remapped >= start && remapped <= end) {
        putDay(
          days,
          { ...row, date: remapped, precipProb: null },
          "climatology",
        );
      }
    }
  }

  const covered = keys.filter((k) => days[k]).length;
  return {
    lat,
    lon,
    timezone: tz,
    year,
    month,
    days,
    partial: covered < keys.length,
  };
}
