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

/** Lato massimo dell'aiuola: 15 m (1500 cm) per lato. */
export const MAX_BED_SIDE_CM = 1500;

/**
 * Numero massimo di celle per lato per una data risoluzione, cosi' che
 * `cells * cellSizeCm <= MAX_BED_SIDE_CM` (fino a 15 m con passo
 * minimo 5 cm → 300 celle).
 */
export function maxGridDimForCellSizeCm(cellSizeCm: number): number {
  const s = Math.max(1, cellSizeCm);
  return Math.max(1, Math.floor(MAX_BED_SIDE_CM / s));
}

/** Pixel per centimetro al rendering del canvas (rapporto fisso). */
export const PX_PER_CM = 1.87; // 30 cm = ~56 px (compatibile con il vecchio CELL_PX)

const TRIANGULAR_ROW_FACTOR = Math.sqrt(3) / 2;

export function bedCellSizeCm(bed: Pick<Bed, "cellSizeCm">): number {
  return bed.cellSizeCm ?? DEFAULT_CELL_SIZE_CM;
}

export function bedCellSizePx(bed: Pick<Bed, "cellSizeCm">): number {
  return bedCellSizeCm(bed) * PX_PER_CM;
}

/**
 * Cella in cm usata per mostrare la densità "piante/cella" nel catalogo:
 * aiuola selezionata se presente, altrimenti la prima aiuola, altrimenti
 * `DEFAULT_CELL_SIZE_CM`.
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
 * Stima quante piante stanno in un quadrato di lato `cellSizeCm` cm usando la
 * spaziatura della pianta (metodo square foot gardening): `(cella/spaziatura)²`
 * arrotondato. Più realistico di scalare `perCell` per area.
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
 * Etichetta UI: `N/cella` oppure `<1/cella` se l'arrotondamento è zero.
 * Usa la spaziatura della pianta (non perCell fisso).
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
 * Numero minimo di celle (lato) necessarie per contenere almeno 1 pianta,
 * dato il lato cella e la spaziatura. Usato per espandere automaticamente
 * il patch quando la cella è più piccola della spaziatura.
 *
 * `ceil(spaziatura / cellaCm)` → es. spaziatura 60 cm, cella 15 cm → 4 celle.
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
 * Footprint fisico in cm di un patch. La formula dipende dalla convenzione
 * `spacingMode` e dalla disposizione `arrangement`.
 *
 * Convenzioni (con `s = spacingCm`, `c = plantCols`, `r = plantRows`):
 *
 * - center-to-center: alone di `s/2` su ciascun lato
 *     w = c * s, h = r * s
 * - edge-to-edge: gap `s` fra piante e diametro pianta = `s`
 *     w = (2c - 1) * s, h = (2r - 1) * s
 * - footprint: tile `s x s` per pianta, nessun alone
 *     w = c * s, h = r * s
 *
 * Per disposizione triangolare le righe sono distanziate di `s * sqrt(3)/2`
 * verticalmente e sfalsate di `s/2` orizzontalmente; usiamo questa
 * compattazione con la convenzione c2c (per le altre la riduciamo a
 * `square` per coerenza geometrica).
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
 * Celle occupate e footprint "a griglia".
 *
 * Convenzione: `plantCols × plantRows` rappresenta SEMPRE quante celle del bed
 * il patch occupa sul canvas. Questo mantiene allineati:
 * - stepper Colonne/Righe
 * - rendering (CSS grid span)
 * - collisioni/fit (store)
 * - pannello proprietà ("Celle occupate" e "Ingombro")
 *
 * La spaziatura e la disposizione influenzano invece la stima di "piante totali"
 * (densità), non la dimensione del rettangolo in griglia.
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
 * Celle occupate dal patch su griglia/aiuola: allineate a
 * `patchDensityLayout` (non al solo footprint spaziatura grezzo), cosi'
 * lato canvas, collisioni e pannello coincidono.
 */
export function patchOccupiedCells(
  patch: PlantPatch,
  bed: Pick<Bed, "cellSizeCm">,
  plant: Plant,
): { cols: number; rows: number } {
  return patchDensityLayout(patch, bed, plant).occupied;
}

/**
 * Rettangolo (in celle) che il patch occupa nella griglia dell'aiuola,
 * a partire da `anchor`. Estremi inclusivi.
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
 * `true` se i due patch occupano celle che si sovrappongono.
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
 * `true` se i rettangoli dei due patch nella griglia condividono almeno
 * uno spigolo orizzontale o verticale (esclusi i contatti diagonali).
 * Patch sovrapposti vengono trattati come adiacenti.
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
 * Restituisce il patch che copre la cella indicata (se presente).
 * Per patch 1x1 e' una corrispondenza diretta.
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
 * Numero totale di piante singole rappresentate dal patch (`plantCols * plantRows`).
 */
export function patchPlantCount(patch: PlantPatch): number {
  return patch.plantCols * patch.plantRows;
}

/**
 * Riepilogo pannello: piante calcolate dalla spaziatura (square foot gardening),
 * stesso `patchDensityLayout` di canvas e `patchOccupiedCells`.
 *
 * Formula piante: `areaTotale / areaPerPianta` = `(m × cella²) / spaziatura²`
 * dove `m = plantCols × plantRows`. Garantisce almeno 1 pianta se l'area
 * totale >= area minima per una pianta.
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
 * `true` se il rettangolo occupato dal patch sta interamente dentro la griglia.
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

/** Etichetta italiana per la convenzione di spaziatura. */
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
