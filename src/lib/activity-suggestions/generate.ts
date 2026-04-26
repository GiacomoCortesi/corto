import type { Plant } from "@/lib/types";
import type {
  ActivityEvent,
  ActivityKind,
  ActivitySuggestion,
  ActivitySuggestionItem,
  ActivitySuggestionsInput,
  ActivitySuggestionsResponse,
  Catalog,
} from "@/lib/activity-suggestions/types";
import {
  commentMissingEvents,
  renderFertilizerComment,
  renderRecencyComment,
  renderWateringComment,
} from "@/lib/activity-suggestions/comments";

const DAY_MS = 86_400_000;

function toIso(nowMs: number): string {
  return new Date(nowMs).toISOString();
}

function clamp01(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

function daysSince(atMs: number, nowMs: number): number {
  return Math.floor((nowMs - atMs) / DAY_MS);
}

function latestEvent(
  events: ActivityEvent[],
  kind: ActivityKind,
  plantId: string,
): ActivityEvent | null {
  let best: ActivityEvent | null = null;
  for (const e of events) {
    if (e.kind !== kind) continue;
    if (e.plantId !== plantId) continue;
    if (!best || e.at > best.at) best = e;
  }
  return best;
}

function hasAnyEvent(
  events: ActivityEvent[],
  kind: ActivityKind,
  plantId: string,
): boolean {
  for (const e of events) {
    if (e.kind === kind && e.plantId === plantId) return true;
  }
  return false;
}

function latestGrowthEvent(
  events: ActivityEvent[],
  plantId: string,
): ActivityEvent | null {
  let best: ActivityEvent | null = null;
  for (const e of events) {
    if (e.plantId !== plantId) continue;
    if (e.kind !== "semina" && e.kind !== "trapianto") continue;
    if (!best || e.at > best.at) best = e;
  }
  return best;
}

function plantName(catalog: Catalog, plantId: string): string | undefined {
  const p = catalog.plantById(plantId) as Plant | undefined | null;
  return p?.name;
}

function wateringBaseIntervalDays(p: Plant | null | undefined): number {
  const water = p?.water;
  if (water === "high") return 3;
  if (water === "medium") return 5;
  if (water === "low") return 9;
  return 6;
}

function fertilizerBaseIntervalDays(p: Plant | null | undefined): number | null {
  const demand = p?.fertilizer?.demand;
  if (!demand) return null;
  if (demand === "high") return 30;
  if (demand === "medium") return 45;
  if (demand === "low") return 90;
  if (demand === "fixer") return null;
  return null;
}

function scoreWatering(
  input: ActivitySuggestionsInput,
  plantId: string,
): { shouldDo: boolean; confidence: number; comment: string } {
  // Per-plant gating rule (requested): missing events -> no recommendation.
  if (!hasAnyEvent(input.events, "innaffiatura", plantId)) {
    return {
      shouldDo: false,
      confidence: 0,
      comment: commentMissingEvents("innaffiatura"),
    };
  }

  const p = input.catalog.plantById(plantId) as Plant | undefined | null;
  const last = latestEvent(input.events, "innaffiatura", plantId);
  const lastDays = last ? daysSince(last.at, input.nowMs) : null;

  let interval = wateringBaseIntervalDays(p);

  const prev7 = input.weather?.previous7d;
  const next3 = input.weather?.next3d;

  if (prev7?.avgTempC !== undefined) {
    if (prev7.avgTempC >= 25) interval = Math.max(2, interval - 1);
    if (prev7.avgTempC <= 15) interval = interval + 1;
  }

  if (prev7?.rainMm !== undefined) {
    if (prev7.rainMm >= 15) interval = interval + 3;
    else if (prev7.rainMm >= 5) interval = interval + 1;
  }

  if (next3?.rainMm !== undefined) {
    if (next3.rainMm >= 10) interval = interval + 2;
    else if (next3.rainMm >= 3) interval = interval + 1;
  }

  const setup = input.setup;
  if (setup?.retainsMoisture) interval = interval + 1;
  if (setup?.drainsFast) interval = Math.max(2, interval - 1);

  const growth = latestGrowthEvent(input.events, plantId);
  if (growth) {
    const ageDays = daysSince(growth.at, input.nowMs);
    if (ageDays >= 0 && ageDays <= 21) {
      interval = Math.max(2, interval - 1);
    }
  }

  const due = lastDays === null ? true : lastDays >= interval;

  const comment = renderWateringComment({
    lastWateringDays: lastDays,
    intervalDays: interval,
    next3dRainMm: next3?.rainMm,
  });

  const confBase = lastDays === null ? 0.45 : 0.65;
  const urgency =
    lastDays === null ? 0.2 : clamp01((lastDays - interval + 1) / Math.max(1, interval));
  const confidence = clamp01(confBase + (due ? 0.25 : -0.15) + urgency * 0.2);

  return { shouldDo: due, confidence, comment };
}

function scoreWeeding(
  input: ActivitySuggestionsInput,
  plantId: string,
): { shouldDo: boolean; confidence: number; comment: string } {
  if (!hasAnyEvent(input.events, "sarchiatura", plantId)) {
    return {
      shouldDo: false,
      confidence: 0,
      comment: commentMissingEvents("sarchiatura"),
    };
  }

  const last = latestEvent(input.events, "sarchiatura", plantId);
  const lastDays = last ? daysSince(last.at, input.nowMs) : null;

  const prev7 = input.weather?.previous7d;
  let interval = 21;
  if (prev7?.rainMm !== undefined) {
    if (prev7.rainMm >= 12) interval = 14;
    else if (prev7.rainMm >= 5) interval = 18;
  }

  const due = lastDays === null ? true : lastDays >= interval;
  const comment = renderRecencyComment("sarchiatura", {
    lastEventDays: lastDays,
    intervalDays: interval,
  });

  const confidence = clamp01((lastDays === null ? 0.45 : 0.65) + (due ? 0.2 : -0.2));
  return { shouldDo: due, confidence, comment };
}

function scoreFertilizer(
  input: ActivitySuggestionsInput,
  plantId: string,
): { shouldDo: boolean; confidence: number; comment: string } {
  if (!hasAnyEvent(input.events, "fertilizzante", plantId)) {
    return {
      shouldDo: false,
      confidence: 0,
      comment: commentMissingEvents("fertilizzante"),
    };
  }

  const p = input.catalog.plantById(plantId) as Plant | undefined | null;
  const baseInterval = fertilizerBaseIntervalDays(p);
  if (baseInterval === null) {
    return {
      shouldDo: false,
      confidence: 0.4,
      comment:
        "Per questa specie non ho una cadenza di fertilizzazione affidabile nel catalogo (o è azotofissatrice).",
    };
  }

  const last = latestEvent(input.events, "fertilizzante", plantId);
  const lastDays = last ? daysSince(last.at, input.nowMs) : null;

  const growth = latestGrowthEvent(input.events, plantId);
  const ageDays = growth ? daysSince(growth.at, input.nowMs) : null;

  // Slightly more aggressive early in cycle.
  let interval = baseInterval;
  if (ageDays !== null && ageDays >= 0 && ageDays <= 60) interval = Math.max(14, interval - 7);

  const due = lastDays === null ? true : lastDays >= interval;

  const phase =
    ageDays !== null
      ? `Fase: ${ageDays} giorni da ${growth?.kind}.`
      : "Fase: semina/trapianto non registrati, stima più cauta.";
  const comment = renderFertilizerComment({
    lastFertilizerDays: lastDays,
    intervalDays: interval,
    phaseText: phase,
  });
  const confidence = clamp01((lastDays === null ? 0.45 : 0.7) + (due ? 0.2 : -0.2));
  return { shouldDo: due, confidence, comment };
}

function buildActivitySuggestion(
  input: ActivitySuggestionsInput,
  activity: ActivityKind,
): ActivitySuggestion | null {
  const items: ActivitySuggestionItem[] = [];

  for (const ref of input.plants) {
    const id = ref.plantId;
    const name = plantName(input.catalog, id);

    const scored =
      activity === "innaffiatura"
        ? scoreWatering(input, id)
        : activity === "sarchiatura"
          ? scoreWeeding(input, id)
          : scoreFertilizer(input, id);

    items.push({
      plantId: id,
      plantName: name,
      should_do: scored.shouldDo,
      confidence: scored.confidence,
      comment: scored.comment.slice(0, 300),
    });
  }

  const anyToDo = items.some((it) => it.should_do);
  if (!anyToDo) return null;

  const summary = (() => {
    const n = items.filter((i) => i.should_do).length;
    if (activity === "innaffiatura") return `Innaffiatura consigliata per ${n}/${items.length} piante.`;
    if (activity === "sarchiatura") return `Sarchiatura consigliata per ${n}/${items.length} piante.`;
    return `Fertilizzante consigliato per ${n}/${items.length} piante.`;
  })();

  return { activity, summary, items };
}

export function generateActivitySuggestions(
  input: ActivitySuggestionsInput,
): ActivitySuggestionsResponse {
  const plants = input.plants.map((p) => p.plantId);

  const suggestions: ActivitySuggestion[] = [];
  const watering = buildActivitySuggestion(input, "innaffiatura");
  if (watering) suggestions.push(watering);
  const weeding = buildActivitySuggestion(input, "sarchiatura");
  if (weeding) suggestions.push(weeding);
  const fert = buildActivitySuggestion(input, "fertilizzante");
  if (fert) suggestions.push(fert);

  return {
    generated_at: toIso(input.nowMs),
    garden: { plants },
    suggestions,
  };
}

