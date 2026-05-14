import type { NextRequest } from "next/server";
import type { ForecastDay } from "@/lib/weather/openmeteo";
import { fetchCalendarMonthWeather } from "@/lib/weather/month-calendar";

export const runtime = "nodejs";

type CalendarWeatherResponse = {
  year: number;
  month: number;
  timezone: string;
  days: Record<string, ForecastDay>;
  partial: boolean;
  error?: string;
};

function json(body: CalendarWeatherResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(req: NextRequest): Promise<Response> {
  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get("lat"));
  const lon = Number(sp.get("lon"));
  const year = Number(sp.get("year"));
  const month = Number(sp.get("month"));
  const timezone = sp.get("timezone") || "auto";

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return json(
      {
        year: year || 0,
        month: month || 0,
        timezone,
        days: {},
        partial: true,
        error: "Coordinate mancanti o non valide.",
      },
      400,
    );
  }
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return json(
      {
        year: year || 0,
        month: month || 0,
        timezone,
        days: {},
        partial: true,
        error: "Anno o mese non validi.",
      },
      400,
    );
  }

  const result = await fetchCalendarMonthWeather(lat, lon, year, month, timezone);

  if (!result) {
    return json({
      year,
      month,
      timezone,
      days: {},
      partial: true,
      error: "Dati meteo non disponibili.",
    });
  }

  return json({
    year: result.year,
    month: result.month,
    timezone: result.timezone,
    days: result.days,
    partial: result.partial,
  });
}
