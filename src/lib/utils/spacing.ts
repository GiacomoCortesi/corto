import type {
  Bed,
  PatchArrangement,
  Plant,
  PlantPatch,
  Selection,
  SpacingMode,
} from "@/lib/types";

export const DEFAULT_CELL_SIZE_CM = 30;
export const DEFAULT_SPACING_MODE: SpacingMode = "center-to-center";
export const DEFAULT_ARRANGEMENT: PatchArrangement = "square";

/** Max bed side: 15 m (1500 cm) per side. */
export const MAX_BED_SIDE_CM = 1500;

/**
 * Max number of cells per side for a given resolution, so that
 * `cells * cellSizeCm <= MAX_BED_SIDE_CM` (up to 15 m with a minimum
 * step of 5 cm → 300 cells).
 */
export function maxGridDimForCellSizeCm(cellSizeCm: number): number {
  const s = Math.max(1, cellSizeCm);
  return Math.max(1, Math.floor(MAX_BED_SIDE_CM / s));
}

/** Pixels per centimeter when rendering the canvas (fixed ratio). */
export const PX_PER_CM = 1.87; // 30 cm = ~56 px (compatible with the old CELL_PX)

const TRIANGULAR_ROW_FACTOR = Math.sqrt(3) / 2;

export function bedCellSizeCm(bed: Pick<Bed, "cellSizeCm">): number {
  return bed.cellSizeCm ?? DEFAULT_CELL_SIZE_CM;
}

export function bedCellSizePx(bed: Pick<Bed, "cellSizeCm">): number {
  return bedCellSizeCm(bed) * PX_PER_CM;
}

/**
 * Cell size (cm) used to display the "plants/cell" density in the catalog:
 * selected bed if present, otherwise the first bed, otherwise `DEFAULT_CELL_SIZE_CM`.
 */
export function cellSizeForCatalog(
  beds: Pick<Bed, "id" | "cellSizeCm">[],
  selection: Selection,
): number {
  const bedId =
    selection?.kind === "bed" || selection?.kind === "plant"
      ? selection.bedId
      : null;
  const bed = bedId ? beds.find((b) => b.id === bedId) : beds[0];
  return bed ? bedCellSizeCm(bed) : DEFAULT_CELL_SIZE_CM;
}

/**
 * Estimates how many plants fit in a `cellSizeCm`-cm square using the plant
 * spacing (square-foot gardening method): `(cell/spacing)²`, rounded.
 * More realistic than scaling `perCell` by area.
 */
export function plantsPerCellFromSpacing(
  spacingCm: number,
  cellSizeCm: number,
): number {
  if (spacingCm <= 0) return 0;
  const perAxis = cellSizeCm / spacingCm;
  return Math.max(0, Math.round(perAxis * perAxis));
}

/**
 * UI label: `N/cell`, or `<1/cell` if rounding yields zero.
 * Uses the plant spacing (not a fixed perCell).
 */
export function perCellLabelForCellSize(plant: Plant, cellSizeCm: number): string {
  const spacingCm = plant.defaultSpacingCm;
  const n = plantsPerCellFromSpacing(spacingCm, cellSizeCm);
  if (n >= 1) return `${n} ${n === 1 ? "pianta" : "piante"} / 1 cella`;

  // When a single plant needs more than one cell, be explicit.
  const perAxis = minCellsForOnePlant(spacingCm, cellSizeCm);
  const cells = perAxis * perAxis;
  return `1 pianta / ${cells} ${cells === 1 ? "cella" : "celle"}`;
}

/**
 * Minimum number of cells (per side) needed to fit at least 1 plant, given
 * the cell size and spacing. Used to automatically expand the patch when the
 * cell is smaller than the spacing.
 *
 * `ceil(spacing / cellCm)` → e.g. spacing 60 cm, cell 15 cm → 4 cells.
 */
export function minCellsForOnePlant(spacingCm: number, cellSizeCm: number): number {
  if (cellSizeCm <= 0) return 1;
  return Math.max(1, Math.ceil(spacingCm / cellSizeCm));
}

export function patchSpacingCm(patch: PlantPatch, plant: Plant): number {
  return patch.spacingCm ?? plant.defaultSpacingCm;
}

export function patchEffectiveSpacingMode(
  patch: PlantPatch,
  plant: Plant,
): SpacingMode {
  // UI only supports center-to-center; keep legacy data but normalize behavior.
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
 * Physical footprint (cm) of a patch. The formula depends on the `spacingMode`
 * convention and the `arrangement` layout.
 *
 * Conventions (with `s = spacingCm`, `c = plantCols`, `r = plantRows`):
 *
 * - center-to-center: margin of `s/2` on each side
 *     w = c * s, h = r * s
 * - edge-to-edge: gap `s` between plants and plant diameter = `s`
 *     w = (2c - 1) * s, h = (2r - 1) * s
 * - footprint: `s x s` tile per plant, no margin
 *     w = c * s, h = r * s
 *
 * For triangular layout, rows are spaced by `s * sqrt(3)/2` vertically and
 * offset by `s/2` horizontally; we apply this compaction with the c2c
 * convention (for the others we reduce it to `square` for geometric consistency).
 */
export function patchFootprintCm(
  patch: PlantPatch,
  plant: Plant,
): { widthCm: number; heightCm: number } {
  const s = patchSpacingCm(patch, plant);
  const mode = patchEffectiveSpacingMode(patch, plant);
  const arrangement = patchEffectiveArrangement(patch, plant);
  const c = patch.plantCols;
  const r = patch.plantRows;

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

/**
 * Occupied cells and "grid" footprint.
 *
 * Convention: `plantCols × plantRows` ALWAYS represents how many bed cells the
 * patch occupies on the canvas. This keeps aligned:
 * - Columns/Rows steppers
 * - rendering (CSS grid span)
 * - collisions/fit (store)
 * - properties panel ("Occupied cells" and "Footprint")
 *
 * Spacing and arrangement affect the estimated "total plants" (density), not
 * the size of the grid rectangle.
 */
export function patchDensityLayout(
  patch: PlantPatch,
  bed: Pick<Bed, "cellSizeCm">,
  plant: Plant,
): {
  displayFootprint: { widthCm: number; heightCm: number };
  occupied: { cols: number; rows: number };
} {
  const s = bedCellSizeCm(bed);
  void plant; // keep signature stable; density uses plant elsewhere
  const cols = Math.max(1, Math.floor(patch.plantCols));
  const rows = Math.max(1, Math.floor(patch.plantRows));
  const displayW = cols * s;
  const displayH = rows * s;
  return {
    displayFootprint: { widthCm: displayW, heightCm: displayH },
    occupied: {
      cols,
      rows,
    },
  };
}

/**
 * Cells occupied by the patch in the bed/grid: aligned to `patchDensityLayout`
 * (not just the raw spacing footprint), so the canvas, collisions, and panel
 * all match.
 */
export function patchOccupiedCells(
  patch: PlantPatch,
  bed: Pick<Bed, "cellSizeCm">,
  plant: Plant,
): { cols: number; rows: number } {
  return patchDensityLayout(patch, bed, plant).occupied;
}

/**
 * Rectangle (in cells) occupied by the patch in the bed grid, starting from
 * `anchor`. Inclusive bounds.
 */
export function patchCellRect(
  patch: PlantPatch,
  bed: Pick<Bed, "cellSizeCm">,
  plant: Plant,
): { col0: number; row0: number; col1: number; row1: number } {
  const { cols, rows } = patchOccupiedCells(patch, bed, plant);
  return {
    col0: patch.anchor.col,
    row0: patch.anchor.row,
    col1: patch.anchor.col + cols - 1,
    row1: patch.anchor.row + rows - 1,
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

/**
 * `true` if the two patches occupy overlapping cells.
 */
export function patchesOverlap(
  a: PlantPatch,
  b: PlantPatch,
  bed: Pick<Bed, "cellSizeCm">,
  getPlant: (id: string) => Plant | undefined,
): boolean {
  const pa = getPlant(a.plantId);
  const pb = getPlant(b.plantId);
  if (!pa || !pb) return false;
  const ra = patchCellRect(a, bed, pa);
  const rb = patchCellRect(b, bed, pb);
  return !(
    ra.col1 < rb.col0 ||
    rb.col1 < ra.col0 ||
    ra.row1 < rb.row0 ||
    rb.row1 < ra.row0
  );
}

/**
 * `true` if the two patch rectangles in the grid share at least one horizontal
 * or vertical edge (diagonal contacts excluded). Overlapping patches are
 * treated as adjacent.
 */
export function patchesAdjacent(
  a: PlantPatch,
  b: PlantPatch,
  bed: Pick<Bed, "cellSizeCm">,
  getPlant: (id: string) => Plant | undefined,
): boolean {
  const pa = getPlant(a.plantId);
  const pb = getPlant(b.plantId);
  if (!pa || !pb) return false;
  const ra = patchCellRect(a, bed, pa);
  const rb = patchCellRect(b, bed, pb);

  const overlapsX = !(ra.col1 < rb.col0 || rb.col1 < ra.col0);
  const overlapsY = !(ra.row1 < rb.row0 || rb.row1 < ra.row0);
  if (overlapsX && overlapsY) return true;

  const touchesHorizontally = overlapsY && (ra.col1 + 1 === rb.col0 || rb.col1 + 1 === ra.col0);
  const touchesVertically = overlapsX && (ra.row1 + 1 === rb.row0 || rb.row1 + 1 === ra.row0);
  return touchesHorizontally || touchesVertically;
}

/**
 * Returns the patch that covers the given cell (if any).
 * For 1x1 patches this is a direct match.
 */
export function cellIndexToPatch(
  bed: Bed,
  cellIndex: number,
  getPlant: (id: string) => Plant | undefined,
): PlantPatch | undefined {
  const { col, row } = cellIndexToAnchor(cellIndex, bed.cols);
  for (const patch of bed.patches) {
    const plant = getPlant(patch.plantId);
    if (!plant) continue;
    const rect = patchCellRect(patch, bed, plant);
    if (
      col >= rect.col0 &&
      col <= rect.col1 &&
      row >= rect.row0 &&
      row <= rect.row1
    ) {
      return patch;
    }
  }
  return undefined;
}

/**
 * Total number of individual plants represented by the patch (`plantCols * plantRows`).
 */
export function patchPlantCount(patch: PlantPatch): number {
  return patch.plantCols * patch.plantRows;
}

/**
 * Panel summary: plants computed from spacing (square-foot gardening), using
 * the same `patchDensityLayout` as the canvas and `patchOccupiedCells`.
 *
 * Plant formula: `totalArea / areaPerPlant` = `(m × cellSize²) / spacing²`,
 * where `m = plantCols × plantRows`. Ensures at least 1 plant if the total
 * area >= the minimum area for one plant.
 */
export function patchDensitySummaryForUI(
  patch: PlantPatch,
  bed: Bed,
  plant: Plant,
): {
  totalPlants: number;
  showTotalLessThanOne: boolean;
  displayFootprint: { widthCm: number; heightCm: number };
  occupied: { cols: number; rows: number };
} {
  const s = bedCellSizeCm(bed);
  const m = Math.max(1, Math.floor(patch.plantCols)) * Math.max(1, Math.floor(patch.plantRows));
  const spacing = patchSpacingCm(patch, plant);
  const patchAreaCm2 = m * s * s;
  const arrangement = patchEffectiveArrangement(patch, plant);
  const mode = patchEffectiveSpacingMode(patch, plant);
  // Approx hex/triangular packing bonus vs square grid when spacing is center-to-center.
  // Keep other modes at 1.0 to avoid surprising jumps in legacy semantics.
  const densityFactor =
    arrangement === "triangular" && mode === "center-to-center"
      ? 2 / Math.sqrt(3)
      : 1;
  const plantAreaCm2 = Math.max(MIN_AREA_CM2, spacing * spacing);
  const totalF = (patchAreaCm2 / plantAreaCm2) * densityFactor;
  const showTotalLessThanOne = totalF < 1;
  const totalPlants = showTotalLessThanOne
    ? 0
    : Math.max(1, Math.round(totalF));

  const { displayFootprint, occupied } = patchDensityLayout(patch, bed, plant);
  return {
    totalPlants,
    showTotalLessThanOne,
    displayFootprint,
    occupied,
  };
}

/**
 * `true` if the rectangle occupied by the patch is fully inside the grid.
 */
export function patchFitsInBed(
  patch: PlantPatch,
  bed: Bed,
  plant: Plant,
): boolean {
  const rect = patchCellRect(patch, bed, plant);
  return (
    rect.col0 >= 0 &&
    rect.row0 >= 0 &&
    rect.col1 < bed.cols &&
    rect.row1 < bed.rows
  );
}

/** Italian label for the spacing convention. */
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
