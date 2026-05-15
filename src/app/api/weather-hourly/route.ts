import type { NextRequest } from "next/server";
import type { WeatherDaySource } from "@/lib/weather/openmeteo";
import { fetchHourlyForDay } from "@/lib/weather/openmeteo";

export const runtime = "nodejs";

type HourlyResponse = {
  date: string;
  timezone: string;
  hours: {
    time: string;
    temperature: number | null;
    precipMm: number | null;
    precipProb: number | null;
    weatherCode: number | null;
  }[];
  error?: string;
};

function json(body: HourlyResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const SOURCES = new Set<WeatherDaySource>([
  "forecast",
  "archive",
  "climatology",
]);

export async function GET(req: NextRequest): Promise<Response> {
  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get("lat"));
  const lon = Number(sp.get("lon"));
  const date = sp.get("date") ?? "";
  const timezone = sp.get("timezone") || "auto";
  const rawSource = sp.get("source");
  const source =
    rawSource && SOURCES.has(rawSource as WeatherDaySource)
      ? (rawSource as WeatherDaySource)
      : undefined;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return json(
      { date, timezone, hours: [], error: "Coordinate mancanti o non valide." },
      400,
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json(
      { date, timezone, hours: [], error: "Data non valida." },
      400,
    );
  }

  const result = await fetchHourlyForDay(lat, lon, date, timezone, source);

  if (!result) {
    return json({
      date,
      timezone,
      hours: [],
      error: "Dettaglio orario non disponibile.",
    });
  }

  return json({
    date: result.date,
    timezone: result.timezone,
    hours: result.hours,
  });
}
