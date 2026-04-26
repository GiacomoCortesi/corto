/**
 * POST /api/activity-suggestions
 *
 * Generates deterministic suggestions (no LLM) for:
 * - watering
 * - weeding
 * - fertilizer
 *
 * If the user provided a location (`snapshot.meta.location`), we use EXACTLY
 * those coordinates (lat/lon) to fetch weather via Open-Meteo.
 */

import type { NextRequest } from "next/server";
import { plantById } from "@/lib/data/plants";
import type { GardenActivity, GardenSnapshot } from "@/lib/suggestions/types";
import { fetchForecastWithPastDays } from "@/lib/weather/openmeteo";
import { summarizeForActivitySuggestions } from "@/lib/activity-suggestions/weather";
import { generateActivitySuggestions } from "@/lib/activity-suggestions";
import type {
  ActivityEvent,
  ActivityEventKind,
  ActivitySuggestionsResponse,
} from "@/lib/activity-suggestions";

export const runtime = "nodejs";

type RequestBody = {
  snapshot: GardenSnapshot;
  nowIso?: string;
};

function jsonResponse(body: ActivitySuggestionsResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mapKind(k: GardenActivity["kind"]): ActivityEventKind {
  if (k === "watering") return "innaffiatura";
  if (k === "weeding") return "sarchiatura";
  if (k === "sowing") return "semina";
  if (k === "transplanting") return "trapianto";
  // No dedicated kind in diary for fertilizer yet -> treat as "altro"
  return "altro";
}

function toActivityEvents(events: GardenActivity[]): ActivityEvent[] {
  return events.map((e) => ({
    id: e.id,
    at: e.at,
    kind: mapKind(e.kind),
    plantId: e.plantId,
  }));
}

function plantsInSnapshot(snapshot: GardenSnapshot): string[] {
  const set = new Set<string>();
  for (const bed of snapshot.beds) {
    for (const patch of bed.patches) {
      set.add(patch.plantId);
    }
  }
  return [...set];
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return new Response(
      JSON.stringify({ error: "Body non valido (JSON atteso)." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!body?.snapshot || !Array.isArray(body.snapshot.beds)) {
    return new Response(
      JSON.stringify({ error: "Snapshot del giardino mancante o malformato." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const now = body.nowIso ? Date.parse(body.nowIso) : Date.now();
  const nowMs = Number.isFinite(now) ? (now as number) : Date.now();

  const plantIds = plantsInSnapshot(body.snapshot);
  const events = toActivityEvents(body.snapshot.events ?? []);

  // Weather: use EXACT coordinates if present.
  let weather:
    | { previous7d: { rainMm: number; avgTempC?: number }; next3d: { rainMm: number; avgTempC?: number } }
    | undefined;

  const loc = body.snapshot.meta.location;
  if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lon)) {
    const f = await fetchForecastWithPastDays(
      loc.lat,
      loc.lon,
      loc.timezone ?? "auto",
      7, // enough to cover next 3
      7, // previous 7
    );
    if (f) {
      const summarized = summarizeForActivitySuggestions(f, nowMs);
      if (summarized) weather = summarized;
    }
  }

  const out = generateActivitySuggestions({
    nowMs,
    plants: plantIds.map((plantId) => ({ plantId })),
    events,
    catalog: { plantById },
    weather,
  });

  return jsonResponse(out);
}

