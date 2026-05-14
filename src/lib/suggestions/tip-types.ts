/**
 * Types for the daily garden tip (sidebar), shared between client and API.
 */

import type { GardenActivityKind } from "@/lib/types";
import type { GardenSnapshot } from "@/lib/suggestions/types";

export type TipSignal = "stagione" | "meteo" | "luna";

export type TipCategory =
  | "planting"
  | "care"
  | "harvest"
  | "weather"
  | "general";

export type TipOfTheDay = {
  headline: string;
  reason: string;
  signals: TipSignal[];
  category: TipCategory;
  plantId?: string;
  bedId?: string;
  kind?: GardenActivityKind;
};

export type TipOfTheDayRequest = {
  snapshot: GardenSnapshot;
  nowIso?: string;
};

export type TipOfTheDayResponse = {
  tip: TipOfTheDay | null;
  error?: string;
};
