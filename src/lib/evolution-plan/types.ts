import type { GardenLocation } from "@/lib/types";

export type EvolutionPlanStrategy = "balanced" | "soilRecovery" | "production";

export type EvolutionPlanAction = "replace" | "keep" | "rest" | "green_manure";

export type EvolutionPlanAlternative = {
  plantId: string;
  /** 0..100, già normalizzato lato server (scoring deterministico) */
  score: number;
  rotationReason: string;
  tradeoffs: string[];
};

export type EvolutionPlan = {
  id: string;
  bedId: string;
  patchId?: string;
  currentPlantId?: string;
  transitionWindow: { start: string; end: string }; // ISO date YYYY-MM-DD
  recommendation: {
    action: EvolutionPlanAction;
    preferredPlantId?: string;
    alternatives: EvolutionPlanAlternative[];
  };
  rationale: string;
  confidence: "low" | "medium" | "high";
};

export type EvolutionGardenSnapshot = {
  meta: {
    name: string;
    sunOrientation: "N" | "S" | "E" | "O";
    location?: GardenLocation;
  };
  beds: Array<{
    id: string;
    name: string;
    position: { x: number; y: number };
    widthCm: number;
    heightCm: number;
    patches: Array<{
      id: string;
      plantId: string;
      positionCm: { x: number; y: number };
      sizeCm: { width: number; height: number };
      spacingCm?: number;
    }>;
  }>;
  events: Array<{
    id: string;
    at: number;
    kind:
      | "sowing"
      | "weeding"
      | "watering"
      | "transplanting"
      | "treatment"
      | "harvest"
      | "note"
      | "other";
    notes?: string;
    bedId?: string;
    patchId?: string;
    plantId?: string;
    planned?: boolean;
  }>;
};

export type EvolutionPlanRequest = {
  snapshot: EvolutionGardenSnapshot;
  dismissedIds: string[];
  /** ISO datetime now (opzionale) */
  nowIso?: string;
  horizonMonths?: number; // default 3
  strategy?: EvolutionPlanStrategy; // default balanced
};

export type EvolutionPlanResponse = {
  plans: EvolutionPlan[];
  weatherSummary?: string;
  error?: string;
};

