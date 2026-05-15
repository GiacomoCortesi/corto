export type SunNeed = "full" | "partial" | "shade";

export type PlantCategory =
  | "ortaggio"
  | "aromatica"
  | "frutto"
  | "frutti-di-bosco"
  | "leguminosa"
  | "radice"
  | "foglia";

/**
 * (Approximate) botanical family for crop rotation.
 * Optional field: if missing, rotation can fall back to heuristics.
 */
export type CropFamily =
  | "solanaceae"
  | "cucurbitaceae"
  | "brassicaceae"
  | "fabaceae"
  | "apiaceae"
  | "alliaceae"
  | "asteraceae"
  | "chenopodiaceae"
  | "lamiaceae"
  | "poaceae"
  | "other";

/**
 * Simplified rotation group (useful when the family is unknown).
 */
export type RotationGroup =
  | "fruiting"
  | "leafy"
  | "root"
  | "legume"
  | "allium"
  | "brassica"
  | "aromatic"
  | "perennial"
  | "other";

/**
 * Overall nutrient demand of the plant:
 * - `low`: low demand (e.g. Allium, herbs)
 * - `medium`: medium demand (e.g. leafy greens, roots)
 * - `high`: high demand / "heavy feeder" (e.g. solanaceae, cucurbits, cabbages)
 * - `fixer`: nitrogen-fixer, improves the soil (legumes)
 */
export type FertilizerDemand = "low" | "medium" | "high" | "fixer";

/**
 * Recommended fertilization guidelines for the plant.
 * Intended for home organic gardening.
 */
export type PlantFertilizer = {
  demand: FertilizerDemand;
  /** Main recommended fertilizer types (1-3 entries) */
  type: string[];
  /** Fertilization schedule/frequency (short free text) */
  schedule: string;
  /** Optional notes (e.g. "avoid fresh manure") */
  notes?: string;
};

/**
 * Common issues and suggested remedies (preferably organic).
 */
export type PlantTreatment = {
  /** Common pests and diseases */
  pests: string[];
  /** Suggested organic remedies/treatments */
  remedies: string[];
};

/**
 * Convention for interpreting `spacingCm`:
 * - `center-to-center`: center-to-center distance between adjacent plants (default).
 * - `edge-to-edge`: empty space between adjacent plants, assuming the plant
 *   diameter equals the spacing value.
 * - `footprint`: side length of the square area reserved for each plant.
 */
export type SpacingMode = "center-to-center" | "edge-to-edge" | "footprint";

/**
 * Plant layout within a patch:
 * - `square`: regular `cols x rows` grid.
 * - `triangular`: alternating rows offset by half a step, with a reduced
 *   vertical step (hexagonal packing; ~15% more compact).
 */
export type PatchArrangement = "square" | "triangular";

/** Companion/antagonist entry in the catalog (name + human-readable reason). */
export type PlantNeighborEntry = {
  /** Plant ID in the catalog (for matching with nearby patches). */
  plantId: string;
  /** Common name shown in the UI. */
  name: string;
  /** Why the relationship is recommended or to be avoided (home-garden guidance). */
  reason: string;
};

export type Plant = {
  id: string;
  name: string;
  scientific?: string;
  emoji: string;
  category: PlantCategory;
  /** Botanical family (rotation). */
  cropFamily?: CropFamily;
  /** Simplified rotation group. */
  rotationGroup?: RotationGroup;
  /** Recommended break (years) before repeating family/group in the same bed. */
  rotationBreakYears?: number;
  /**
   * Typical crop cycle length (days). Optional: if missing, we fall back to
   * sowing/harvest months and the events log.
   */
  cropCycleDays?: { min: number; max: number };
  /**
   * Plants per 30×30 cm square (catalog reference / simplified square-foot);
   * in the UI, "N/cell" is scaled based on `Bed.cellSizeCm` (same density, area).
   */
  perCell: 1 | 2 | 4 | 9 | 16;
  /** Recommended spacing between plants of the same species (cm) */
  defaultSpacingCm: number;
  /** Default convention for `defaultSpacingCm` (default: `center-to-center`) */
  defaultSpacingMode?: SpacingMode;
  /** Default layout (default: `square`) */
  defaultArrangement?: PatchArrangement;
  sun: SunNeed;
  water: "low" | "medium" | "high";
  /** Sowing months (1-12) */
  sowing: number[];
  /**
   * Transplant months (1-12), when it’s common to put a seedling in the bed
   * (tray/pot) instead of direct sowing.
   * Optional: if missing, the species is considered only for sowing/harvest.
   */
  transplanting?: number[];
  /** Harvest months (1-12) */
  harvest: number[];
  /** Recommended neighbors, with a short reason. */
  companions: PlantNeighborEntry[];
  /** Plants to keep apart, with a short reason. */
  antagonists: PlantNeighborEntry[];
  /** Fertilization guidelines (optional) */
  fertilizer?: PlantFertilizer;
  /** Common issues and suggested remedies (optional) */
  treatments?: PlantTreatment;
};

/**
 * Block of same-species plants on a bed. Physical placement uses metric
 * coordinates (`positionCm`, `sizeCm`). Spacing and arrangement drive density
 * estimates; grid-aligned UI derives cell spans via `geometry.ts`.
 */
export type PlantPatch = {
  id: string;
  plantId: string;
  /** Top-left corner inside the bed, in cm from bed origin */
  positionCm: { x: number; y: number };
  /** Physical footprint on the bed, in cm */
  sizeCm: { width: number; height: number };
  /** Override species spacing (cm) */
  spacingCm?: number;
  /** Override spacing convention */
  spacingMode?: SpacingMode;
  /** Override layout */
  arrangement?: PatchArrangement;
  /** Manual plant count; when unset, density is derived from footprint and spacing */
  plantCount?: number;
};

export type Bed = {
  id: string;
  name: string;
  position: { x: number; y: number };
  widthCm: number;
  heightCm: number;
  patches: PlantPatch[];
};

export type SunOrientation = "N" | "S" | "E" | "O";

/**
 * Garden geographic location (optional). Used by the suggestions engine
 * to fetch local weather via Open-Meteo.
 */
export type GardenLocation = {
  lat: number;
  lon: number;
  /** Human-readable label, e.g. "Bologna, IT" */
  label?: string;
  /** IANA timezone, e.g. "Europe/Rome" */
  timezone?: string;
};

export type GardenMeta = {
  name: string;
  sunOrientation: SunOrientation;
  createdAt: number;
  /** Geographic location (optional, enables weather features) */
  location?: GardenLocation;
};

export type Selection =
  | { kind: "bed"; bedId: string }
  | { kind: "plant"; bedId: string; patchId: string }
  | null;

export type CompanionConflict = {
  bedId: string;
  patchId: string;
  neighborPatchId: string;
  type: "good" | "bad";
};

/**
 * Activity log entry kind (separate Italian UI labels exist).
 */
export type GardenActivityKind =
  | "sowing"
  | "weeding"
  | "watering"
  | "transplanting"
  | "treatment"
  | "harvest"
  | "note"
  | "other";

/**
 * Gardening event: date, kind, and optional references.
 * `plantId` is denormalized when tied to a patch, so the name can still be
 * shown even if the patch is later removed.
 */
export type GardenActivity = {
  id: string;
  /** Activity timestamp (ms) */
  at: number;
  kind: GardenActivityKind;
  notes?: string;
  bedId?: string;
  patchId?: string;
  plantId?: string;
  /**
   * True if the activity was created from an accepted suggestion and lies in
   * the future. Used by the Log to render it as "planned" with a "Mark as done"
   * action.
   */
  planned?: boolean;
};

/**
 * Suggestion generated by the LLM. It lives in memory in the Suggestions
 * panel until the user accepts it (becoming a `GardenActivity`) or dismisses
 * it (id stored in `dismissedSuggestionIds`).
 */
export type SuggestionConfidence = "low" | "medium" | "high";

/**
 * One row per plant/patch within a suggestion grouped by `kind`: indicates
 * whether the activity is needed and why (cadences, events, weather).
 */
export type SuggestionPlantItem = {
  bedId?: string;
  patchId?: string;
  plantId?: string;
  /** Name to display (catalog or model text) */
  plantName?: string;
  /** True if this patch needs the activity in the proposed window */
  needsAction: boolean;
  /** Specific rationale: last activity, plant age, cadence, weather */
  rationale: string;
};

export type Suggestion = {
  id: string;
  createdAt: number;
  kind: GardenActivityKind;
  /** Recommended timestamp for the action (same for all plants in the group) */
  suggestedFor: number;
  /** Tolerance in days around `suggestedFor` (e.g. 3 = +/- 3 days) */
  windowDays?: number;
  /**
   * Legacy: a single target (if `items` is missing, the suggestion applies to
   * one patch).
   */
  bedId?: string;
  patchId?: string;
  plantId?: string;
  /** Short title shown on the card */
  title: string;
  /** Overall rationale in Italian (including the weather link) */
  rationale: string;
  /** Optional weather note that guided the decision */
  weatherNote?: string;
  /** Optional lunar-calendar note that guided the suggested date */
  moonNote?: string;
  confidence: SuggestionConfidence;
  /**
   * Evaluation for each patch relevant to this activity kind.
   * If present, the suggestion is "by category" with a plant list.
   */
  items?: SuggestionPlantItem[];
};
