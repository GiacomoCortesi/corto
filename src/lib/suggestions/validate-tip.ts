import { plantById } from "@/lib/data/plants";
import type { GardenActivityKind } from "@/lib/types";
import { bedsWithSpaceForPlant } from "@/lib/utils/bed-space";
import type { GardenSnapshot } from "@/lib/suggestions/types";
import type { TipOfTheDay } from "@/lib/suggestions/tip-types";
import { isTipCategory, isTipSignal } from "@/lib/suggestions/tip-prompt";
import type { Forecast } from "@/lib/weather/openmeteo";
import {
  shouldSkipWateringTip,
  tipSuggestsWatering,
} from "@/lib/suggestions/tip-weather";

const ALLOWED_KINDS = new Set<GardenActivityKind>([
  "sowing",
  "transplanting",
  "weeding",
  "watering",
  "treatment",
  "harvest",
  "note",
  "other",
]);

function plantedIds(snapshot: GardenSnapshot): Set<string> {
  const ids = new Set<string>();
  for (const bed of snapshot.beds) {
    for (const patch of bed.patches) {
      ids.add(patch.plantId);
    }
  }
  return ids;
}

function bedIds(snapshot: GardenSnapshot): Set<string> {
  return new Set(snapshot.beds.map((b) => b.id));
}

export type TipValidationContext = {
  forecast?: Forecast | null;
};

export function validateTip(
  raw: unknown,
  snapshot: GardenSnapshot,
  ctx: TipValidationContext = {},
): TipOfTheDay | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as { tip?: unknown };
  const tip = root.tip;
  if (!tip || typeof tip !== "object") return null;

  const t = tip as Record<string, unknown>;
  const headline = typeof t.headline === "string" ? t.headline.trim() : "";
  const reason = typeof t.reason === "string" ? t.reason.trim() : "";
  if (!headline || !reason) return null;
  if (!isTipCategory(t.category)) return null;

  const signals = Array.isArray(t.signals)
    ? [...new Set(t.signals.filter(isTipSignal))]
    : [];
  if (signals.length === 0) return null;

  const plantId =
    typeof t.plantId === "string" && t.plantId.trim()
      ? t.plantId.trim()
      : undefined;
  const bedId =
    typeof t.bedId === "string" && t.bedId.trim() ? t.bedId.trim() : undefined;
  const kind =
    typeof t.kind === "string" && ALLOWED_KINDS.has(t.kind as GardenActivityKind)
      ? (t.kind as GardenActivityKind)
      : undefined;

  const planted = plantedIds(snapshot);
  const beds = bedIds(snapshot);

  if (t.category === "planting") {
    if (!plantId || !plantById(plantId)) return null;
    if (!bedId || !beds.has(bedId)) return null;
    const bed = snapshot.beds.find((b) => b.id === bedId);
    if (!bed || !bedsWithSpaceForPlant([bed], plantId).length) return null;
  }

  if (
    (t.category === "care" || t.category === "harvest") &&
    plantId &&
    !planted.has(plantId)
  ) {
    return null;
  }

  if (plantId && !plantById(plantId)) return null;
  if (bedId && !beds.has(bedId)) return null;

  const candidate: TipOfTheDay = {
    headline: headline.slice(0, 200),
    reason: reason.slice(0, 600),
    signals,
    category: t.category,
    plantId,
    bedId,
    kind,
  };

  const days = ctx.forecast?.days ?? [];
  if (shouldSkipWateringTip(days) && tipSuggestsWatering(candidate)) {
    return null;
  }

  return candidate;
}
