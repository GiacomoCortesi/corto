/**
 * Indicative cadences for garden activities in a temperate climate (e.g. Italy).
 * Used by the prompt to give the model concrete numbers to consider instead of
 * making them up. These are guidelines, not certainties: the model should adapt
 * based on weather, season, and species.
 */

import type { PlantCategory, GardenActivityKind } from "@/lib/types";

type CadenceWindow = {
  /** Typical cadence in days for that activity kind */
  everyDays: number;
  /** Allowed tolerance (days) before/after `everyDays` */
  toleranceDays: number;
};

type Cadences = Partial<
  Record<PlantCategory, Partial<Record<GardenActivityKind, CadenceWindow>>>
>;

/**
 * "Peak season" cadences by plant category.
 *
 * - Weeding (`weeding`): recurring operation to reduce competition and surface crusting.
 * - Watering (`watering`): in midsummer; in spring/autumn the LLM should
 *   roughly double the days and consider forecast rain.
 * - Treatment (`treatment`): typical preventive cadence for species more prone
 *   to issues (solanaceae, cucurbits, cabbages).
 *
 * Species for which an activity doesn't apply are simply omitted.
 */
export const CATEGORY_CADENCES: Cadences = {
  ortaggio: {
    weeding: { everyDays: 10, toleranceDays: 4 },
    watering: { everyDays: 2, toleranceDays: 1 },
    treatment: { everyDays: 14, toleranceDays: 5 },
  },
  aromatica: {
    weeding: { everyDays: 21, toleranceDays: 7 },
    watering: { everyDays: 3, toleranceDays: 2 },
  },
  frutto: {
    weeding: { everyDays: 10, toleranceDays: 4 },
    watering: { everyDays: 2, toleranceDays: 1 },
    treatment: { everyDays: 10, toleranceDays: 4 },
  },
  "frutti-di-bosco": {
    weeding: { everyDays: 14, toleranceDays: 5 },
    watering: { everyDays: 3, toleranceDays: 2 },
    treatment: { everyDays: 14, toleranceDays: 5 },
  },
  leguminosa: {
    weeding: { everyDays: 14, toleranceDays: 5 },
    watering: { everyDays: 3, toleranceDays: 2 },
  },
  radice: {
    weeding: { everyDays: 10, toleranceDays: 4 },
    watering: { everyDays: 3, toleranceDays: 2 },
  },
  foglia: {
    weeding: { everyDays: 10, toleranceDays: 4 },
    watering: { everyDays: 2, toleranceDays: 1 },
  },
  "fiore-edule": {
    weeding: { everyDays: 14, toleranceDays: 5 },
    watering: { everyDays: 3, toleranceDays: 2 },
  },
};

/**
 * Compact textual rendering to inject into the prompt: one line per category
 * with cadences in days, so the model can cite them in the rationale.
 */
export function formatCadencesForPrompt(): string {
  const lines: string[] = [];
  for (const [cat, kinds] of Object.entries(CATEGORY_CADENCES)) {
    if (!kinds) continue;
    const parts = Object.entries(kinds).map(
      ([k, w]) => `${k}: ~${w!.everyDays}gg (±${w!.toleranceDays})`,
    );
    lines.push(`- ${cat}: ${parts.join(", ")}`);
  }
  return lines.join("\n");
}
