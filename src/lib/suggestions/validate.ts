/**
 * Validatore "soft" della risposta LLM.
 */

import type {
  GardenActivityKind,
  Suggestion,
  SuggestionConfidence,
  SuggestionPlantItem,
} from "@/lib/types";
import { plantById } from "@/lib/data/plants";

const KIND_SET: ReadonlySet<GardenActivityKind> = new Set([
  "sowing",
  "weeding",
  "watering",
  "transplanting",
  "treatment",
  "harvest",
  "note",
  "other",
]);

const CONFIDENCE_SET: ReadonlySet<SuggestionConfidence> = new Set([
  "low",
  "medium",
  "high",
]);

type RawItem = {
  bedId?: unknown;
  patchId?: unknown;
  plantId?: unknown;
  plantName?: unknown;
  needsAction?: unknown;
  rationale?: unknown;
};

type RawSuggestion = {
  kind?: unknown;
  title?: unknown;
  rationale?: unknown;
  suggestedFor?: unknown;
  windowDays?: unknown;
  bedId?: unknown;
  patchId?: unknown;
  plantId?: unknown;
  weatherNote?: unknown;
  moonNote?: unknown;
  confidence?: unknown;
  items?: unknown;
};

function isString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function parseIsoDateToTs(input: string, nowMs: number): number | null {
  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  let d: Date | null = null;
  if (dayMatch) {
    const [, y, m, day] = dayMatch;
    d = new Date(Number(y), Number(m) - 1, Number(day), 12, 0, 0, 0);
  } else {
    const t = Date.parse(input);
    if (!Number.isNaN(t)) d = new Date(t);
  }
  if (!d || Number.isNaN(d.getTime())) return null;
  const ts = d.getTime();
  if (ts < nowMs - 86_400_000 || ts > nowMs + 30 * 86_400_000) return null;
  return ts;
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function parseItem(
  raw: unknown,
  ctx: ValidatedContext,
): SuggestionPlantItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as RawItem;
  if (typeof r.needsAction !== "boolean" || !isString(r.rationale)) return null;
  const patchId = isString(r.patchId) ? r.patchId : undefined;
  const bedId = isString(r.bedId) ? r.bedId : undefined;
  let plantId = isString(r.plantId) ? r.plantId : undefined;
  const plantName = isString(r.plantName) ? r.plantName : undefined;
  if (patchId && ctx.patchIndex?.has(patchId)) {
    const idx = ctx.patchIndex.get(patchId)!;
    plantId = plantId ?? idx.plantId;
  }
  const p = plantId ? plantById(plantId) : null;
  const name = plantName ?? p?.name;
  const fromPatch = patchId ? ctx.patchIndex?.get(patchId) : undefined;
  return {
    bedId: fromPatch?.bedId ?? bedId,
    patchId,
    plantId: fromPatch?.plantId ?? plantId ?? p?.id,
    plantName: name,
    needsAction: r.needsAction,
    rationale: r.rationale.slice(0, 500),
  };
}

export type ValidatedContext = {
  patchIndex?: Map<string, { bedId: string; plantId: string }>;
  dismissedIds?: ReadonlySet<string>;
};

export function validateSuggestions(
  raw: unknown,
  nowMs: number,
  ctx: ValidatedContext = {},
): Suggestion[] {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { suggestions?: unknown }).suggestions)) {
    return [];
  }
  const arr = (raw as { suggestions: unknown[] }).suggestions;

  const seenKind = new Set<string>();
  const out: Suggestion[] = [];

  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const r = item as RawSuggestion;

    if (!isString(r.kind) || !KIND_SET.has(r.kind as GardenActivityKind)) continue;
    if (!isString(r.title) || !isString(r.rationale)) continue;
    if (!isString(r.suggestedFor)) continue;
    if (!isString(r.confidence) || !CONFIDENCE_SET.has(r.confidence as SuggestionConfidence)) {
      continue;
    }
    const ts = parseIsoDateToTs(r.suggestedFor, nowMs);
    if (ts === null) continue;

    if (seenKind.has(r.kind)) continue;
    seenKind.add(r.kind);

    const weatherNote = isString(r.weatherNote) ? r.weatherNote : undefined;
    const moonNote = isString(r.moonNote) ? r.moonNote : undefined;
    const windowDays =
      typeof r.windowDays === "number" && r.windowDays >= 1 && r.windowDays <= 14
        ? Math.round(r.windowDays)
        : undefined;

    if (!Array.isArray(r.items) || r.items.length === 0) continue;

    const items: SuggestionPlantItem[] = [];
    for (const it of r.items) {
      const p = parseItem(it, ctx);
      if (p) items.push(p);
    }
    if (items.length === 0) continue;

    const id = uid("sug");
    if (ctx.dismissedIds?.has(id)) continue;

    const suggestion: Suggestion = {
      id,
      createdAt: nowMs,
      kind: r.kind as GardenActivityKind,
      title: r.title.slice(0, 120),
      rationale: r.rationale.slice(0, 2000),
      suggestedFor: ts,
      windowDays,
      weatherNote: weatherNote?.slice(0, 240),
      moonNote: moonNote?.slice(0, 240),
      confidence: r.confidence as SuggestionConfidence,
      items,
    };
    out.push(suggestion);
  }

  out.sort((a, b) => a.suggestedFor - b.suggestedFor);
  return out.slice(0, 7);
}
