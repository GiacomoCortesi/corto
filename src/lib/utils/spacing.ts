import type {
  Bed,
  PatchArrangement,
  Plant,
  PlantPatch,
  SpacingMode,
} from "@/lib/types";
import {
  patchFitsInBedCm,
  patchesAdjacentCm,
  patchesOverlapCm,
} from "@/lib/utils/geometry";

export {
  bedSizeCm,
  bedSizeFromResizeDelta,
  bedPlotSizePx,
  clampBedSizeCm,
  clampPatchPositionCm,
  clampPatchSizeCm,
  cmToPx,
  defaultPatchSizeCm,
  patchPositionFromDragDelta,
  patchPositionFromDropPx,
  patchRectPx,
  patchSizeFromResizeDelta,
  pxToCm,
  quantizeBedCm,
  quantizeCm,
} from "@/lib/utils/geometry";

export const DEFAULT_SPACING_MODE: SpacingMode = "center-to-center";
export const DEFAULT_ARRANGEMENT: PatchArrangement = "square";

/** Max bed side: 30 m (3000 cm) per side. */
export { MAX_BED_SIDE_CM } from "@/lib/utils/geometry";

/** Pixels per centimeter when rendering the canvas (fixed ratio). */
export { PX_PER_CM } from "@/lib/utils/geometry";

const TRIANGULAR_ROW_FACTOR = Math.sqrt(3) / 2;

/**
 * Catalog density label based on plants per square meter from spacing.
 */
export function perSquareMeterLabelForPlant(plant: Plant): string {
  const spacingCm = plant.defaultSpacingCm;
  if (spacingCm <= 0) return "—";
  const perM = 100 / spacingCm;
  const n = Math.round(perM * perM);
  if (n >= 1) {
    return `${n} ${n === 1 ? "pianta" : "piante"} / m²`;
  }
  const area = spacingCm * spacingCm;
  return `1 pianta / ${area} cm²`;
}

export function patchSpacingCm(patch: PlantPatch, plant: Plant): number {
  return patch.spacingCm ?? plant.defaultSpacingCm;
}

export function patchEffectiveSpacingMode(
  patch: PlantPatch,
  plant: Plant,
): SpacingMode {
  void patch;
  void plant;
  return DEFAULT_SPACING_MODE;
}

export function patchEffectiveArrangement(
  patch: PlantPatch,
  plant: Plant,
): PatchArrangement {
  return patch.arrangement ?? plant.defaultArrangement ?? DEFAULT_ARRANGEMENT;
}

/**
 * Botanical footprint (cm) estimated from patch area and spacing convention.
 */
export function patchFootprintCm(
  patch: PlantPatch,
  plant: Plant,
): { widthCm: number; heightCm: number } {
  const s = patchSpacingCm(patch, plant);
  const mode = patchEffectiveSpacingMode(patch, plant);
  const arrangement = patchEffectiveArrangement(patch, plant);
  const c = Math.max(1, Math.round(patch.sizeCm.width / s));
  const r = Math.max(1, Math.round(patch.sizeCm.height / s));

  if (arrangement === "triangular" && mode === "center-to-center" && r > 1) {
    const widthCm = c * s + s / 2;
    const heightCm = (r - 1) * s * TRIANGULAR_ROW_FACTOR + s;
    return { widthCm, heightCm };
  }

  switch (mode) {
    case "edge-to-edge":
      return {
        widthCm: Math.max(0, (2 * c - 1) * s),
        heightCm: Math.max(0, (2 * r - 1) * s),
      };
    case "center-to-center":
    case "footprint":
    default:
      return { widthCm: c * s, heightCm: r * s };
  }
}

const MIN_AREA_CM2 = 1e-6;

export function patchDensityLayout(
  patch: PlantPatch,
): {
  displayFootprint: { widthCm: number; heightCm: number };
} {
  return {
    displayFootprint: {
      widthCm: patch.sizeCm.width,
      heightCm: patch.sizeCm.height,
    },
  };
}

export function cellIndexToAnchor(
  cellIndex: number,
  cols: number,
): { col: number; row: number } {
  return {
    col: cellIndex % cols,
    row: Math.floor(cellIndex / cols),
  };
}

export function anchorToCellIndex(
  anchor: { col: number; row: number },
  cols: number,
): number {
  return anchor.row * cols + anchor.col;
}

export function patchesOverlap(
  a: PlantPatch,
  b: PlantPatch,
  bed: Bed,
  getPlant: (id: string) => Plant | undefined,
): boolean {
  void getPlant;
  void bed;
  return patchesOverlapCm(a, b);
}

export function patchesAdjacent(
  a: PlantPatch,
  b: PlantPatch,
  bed: Bed,
  getPlant: (id: string) => Plant | undefined,
): boolean {
  void getPlant;
  void bed;
  return patchesAdjacentCm(a, b);
}

export function patchPlantCount(
  patch: PlantPatch,
  bed: Bed,
  plant: Plant,
): number {
  return patchDensitySummaryForUI(patch, bed, plant).totalPlants;
}

export function patchDensitySummaryForUI(
  patch: PlantPatch,
  bed: Bed,
  plant: Plant,
): {
  totalPlants: number;
  calculatedPlants: number;
  showTotalLessThanOne: boolean;
  hasPlantCountOverride: boolean;
  displayFootprint: { widthCm: number; heightCm: number };
} {
  void bed;
  const spacing = patchSpacingCm(patch, plant);
  const patchAreaCm2 = patch.sizeCm.width * patch.sizeCm.height;
  const arrangement = patchEffectiveArrangement(patch, plant);
  const mode = patchEffectiveSpacingMode(patch, plant);
  const densityFactor =
    arrangement === "triangular" && mode === "center-to-center"
      ? 2 / Math.sqrt(3)
      : 1;
  const plantAreaCm2 = Math.max(MIN_AREA_CM2, spacing * spacing);
  const totalF = (patchAreaCm2 / plantAreaCm2) * densityFactor;
  const showTotalLessThanOne = totalF < 1;
  const calculatedPlants = showTotalLessThanOne
    ? 0
    : Math.max(1, Math.round(totalF));

  const hasPlantCountOverride = patch.plantCount !== undefined;
  const totalPlants = hasPlantCountOverride
    ? Math.max(1, Math.round(patch.plantCount!))
    : calculatedPlants;

  const { displayFootprint } = patchDensityLayout(patch);
  return {
    totalPlants,
    calculatedPlants,
    showTotalLessThanOne: hasPlantCountOverride ? false : showTotalLessThanOne,
    hasPlantCountOverride,
    displayFootprint,
  };
}

export function patchFitsInBed(
  patch: PlantPatch,
  bed: Bed,
  plant: Plant,
): boolean {
  void plant;
  return patchFitsInBedCm(patch, bed);
}

export function bedAreaCm2(bed: Pick<Bed, "widthCm" | "heightCm">): number {
  return bed.widthCm * bed.heightCm;
}

export function patchOccupiedAreaCm2(patch: PlantPatch): number {
  return patch.sizeCm.width * patch.sizeCm.height;
}

export function spacingModeLabel(mode: SpacingMode): string {
  switch (mode) {
    case "center-to-center":
      return "centro-centro";
    case "edge-to-edge":
      return "fra piante";
    case "footprint":
      return "ingombro";
  }
}

export function arrangementLabel(arrangement: PatchArrangement): string {
  return arrangement === "triangular" ? "triangolare" : "quadrata";
}
