import type { Bed, PlantPatch } from "@/lib/types";

export const GEOMETRY_EPS_CM = 0.01;
export const MIN_PATCH_SIDE_CM = 1;
export const MIN_BED_SIDE_CM = 30;
export const MAX_BED_SIDE_CM = 1500;
/** Max edge gap (cm) still treated as companion neighbors (legacy grid cell was 30 cm). */
export const COMPANION_MAX_GAP_CM = 30;
/** Pixels per centimeter when rendering the canvas (fixed ratio). */
export const PX_PER_CM = 1.87;

export type CmPoint = { x: number; y: number };
export type CmSize = { width: number; height: number };
export type CmRect = { x0: number; y0: number; x1: number; y1: number };

export type GridAnchor = { col: number; row: number };
export type GridSpan = { cols: number; rows: number };
export type GridSpanWithAnchor = GridAnchor & GridSpan;
export type ResizeAnchor = "se" | "e" | "s";

/** v6 persisted patch shape (pre-metric migration). */
export type LegacyPatchV6 = {
  id: string;
  plantId: string;
  anchor: GridAnchor;
  plantCols: number;
  plantRows: number;
  spacingCm?: number;
  spacingMode?: PlantPatch["spacingMode"];
  arrangement?: PlantPatch["arrangement"];
};

export function roundCm(value: number): number {
  return Math.round(value * 100) / 100;
}

export function patchGridSpan(
  patch: Pick<PlantPatch, "positionCm" | "sizeCm">,
  gridStepCm: number,
): GridSpanWithAnchor {
  const step = Math.max(1, gridStepCm);
  return {
    col: Math.round(patch.positionCm.x / step),
    row: Math.round(patch.positionCm.y / step),
    cols: Math.max(1, Math.round(patch.sizeCm.width / step)),
    rows: Math.max(1, Math.round(patch.sizeCm.height / step)),
  };
}

export function bedSizeCm(bed: Pick<Bed, "widthCm" | "heightCm">): CmSize {
  return {
    width: bed.widthCm,
    height: bed.heightCm,
  };
}

export function patchBoundsCm(patch: Pick<PlantPatch, "positionCm" | "sizeCm">): CmRect {
  return {
    x0: patch.positionCm.x,
    y0: patch.positionCm.y,
    x1: patch.positionCm.x + patch.sizeCm.width,
    y1: patch.positionCm.y + patch.sizeCm.height,
  };
}

export function patchFitsInBedCm(
  patch: Pick<PlantPatch, "positionCm" | "sizeCm">,
  bed: Pick<Bed, "widthCm" | "heightCm">,
): boolean {
  const bedSize = bedSizeCm(bed);
  const b = patchBoundsCm(patch);
  return (
    b.x0 >= -GEOMETRY_EPS_CM &&
    b.y0 >= -GEOMETRY_EPS_CM &&
    b.x1 <= bedSize.width + GEOMETRY_EPS_CM &&
    b.y1 <= bedSize.height + GEOMETRY_EPS_CM
  );
}

export function patchesOverlapCm(
  a: Pick<PlantPatch, "positionCm" | "sizeCm">,
  b: Pick<PlantPatch, "positionCm" | "sizeCm">,
): boolean {
  const ra = patchBoundsCm(a);
  const rb = patchBoundsCm(b);
  return !(
    ra.x1 <= rb.x0 + GEOMETRY_EPS_CM ||
    rb.x1 <= ra.x0 + GEOMETRY_EPS_CM ||
    ra.y1 <= rb.y0 + GEOMETRY_EPS_CM ||
    rb.y1 <= ra.y0 + GEOMETRY_EPS_CM
  );
}

export function patchesAdjacentCm(
  a: Pick<PlantPatch, "positionCm" | "sizeCm">,
  b: Pick<PlantPatch, "positionCm" | "sizeCm">,
  maxGapCm = COMPANION_MAX_GAP_CM,
  eps = 0.5,
): boolean {
  const ra = patchBoundsCm(a);
  const rb = patchBoundsCm(b);

  const overlapsX = !(ra.x1 <= rb.x0 + GEOMETRY_EPS_CM || rb.x1 <= ra.x0 + GEOMETRY_EPS_CM);
  const overlapsY = !(ra.y1 <= rb.y0 + GEOMETRY_EPS_CM || rb.y1 <= ra.y0 + GEOMETRY_EPS_CM);
  if (overlapsX && overlapsY) return true;

  const withinGap = (gap: number) => gap >= -eps && gap <= maxGapCm + eps;

  const touchesHorizontally =
    overlapsY &&
    (withinGap(rb.x0 - ra.x1) || withinGap(ra.x0 - rb.x1));
  const touchesVertically =
    overlapsX &&
    (withinGap(rb.y0 - ra.y1) || withinGap(ra.y0 - rb.y1));
  return touchesHorizontally || touchesVertically;
}

export function positionCmFromAnchor(
  anchor: GridAnchor,
  cellSize: number,
): CmPoint {
  return {
    x: roundCm(anchor.col * cellSize),
    y: roundCm(anchor.row * cellSize),
  };
}

export function sizeCmFromGridSpan(
  cols: number,
  rows: number,
  cellSize: number,
): CmSize {
  return {
    width: roundCm(Math.max(1, cols) * cellSize),
    height: roundCm(Math.max(1, rows) * cellSize),
  };
}

export function migratePatchV6ToV7(
  patch: LegacyPatchV6,
  cellSize: number,
): PlantPatch {
  return {
    id: patch.id,
    plantId: patch.plantId,
    positionCm: positionCmFromAnchor(patch.anchor, cellSize),
    sizeCm: sizeCmFromGridSpan(patch.plantCols, patch.plantRows, cellSize),
    spacingCm: patch.spacingCm,
    spacingMode: patch.spacingMode,
    arrangement: patch.arrangement,
  };
}

export type PxRect = { left: number; top: number; width: number; height: number };

export function cmToPx(cm: number): number {
  return cm * PX_PER_CM;
}

export function bedPlotSizePx(bed: Pick<Bed, "widthCm" | "heightCm">): {
  width: number;
  height: number;
} {
  const size = bedSizeCm(bed);
  return { width: cmToPx(size.width), height: cmToPx(size.height) };
}

export function patchRectPx(
  patch: Pick<PlantPatch, "positionCm" | "sizeCm">,
): PxRect {
  return {
    left: cmToPx(patch.positionCm.x),
    top: cmToPx(patch.positionCm.y),
    width: cmToPx(patch.sizeCm.width),
    height: cmToPx(patch.sizeCm.height),
  };
}

export function pxToCm(px: number): number {
  return px / PX_PER_CM;
}

export const QUANTIZE_STEP_CM = 0.5;

export function quantizeCm(value: number, step = QUANTIZE_STEP_CM): number {
  return roundCm(Math.round(value / step) * step);
}

export function quantizeBedCm(value: number): number {
  return quantizeCm(value);
}

export function clampBedSizeCm(width: number, height: number): CmSize {
  return {
    width: quantizeBedCm(
      Math.max(MIN_BED_SIDE_CM, Math.min(MAX_BED_SIDE_CM, width)),
    ),
    height: quantizeBedCm(
      Math.max(MIN_BED_SIDE_CM, Math.min(MAX_BED_SIDE_CM, height)),
    ),
  };
}

export function clampPatchPositionCm(
  patch: Pick<PlantPatch, "sizeCm">,
  bed: Pick<Bed, "widthCm" | "heightCm">,
  positionCm: CmPoint,
): CmPoint {
  const bedSize = bedSizeCm(bed);
  const maxX = Math.max(0, bedSize.width - patch.sizeCm.width);
  const maxY = Math.max(0, bedSize.height - patch.sizeCm.height);
  return {
    x: roundCm(Math.max(0, Math.min(maxX, positionCm.x))),
    y: roundCm(Math.max(0, Math.min(maxY, positionCm.y))),
  };
}

export function clampPatchSizeCm(
  patch: Pick<PlantPatch, "positionCm" | "sizeCm">,
  bed: Pick<Bed, "widthCm" | "heightCm">,
  sizeCm: CmSize,
): CmSize {
  const bedSize = bedSizeCm(bed);
  const maxW = Math.max(MIN_PATCH_SIDE_CM, bedSize.width - patch.positionCm.x);
  const maxH = Math.max(MIN_PATCH_SIDE_CM, bedSize.height - patch.positionCm.y);
  return {
    width: quantizeCm(Math.max(MIN_PATCH_SIDE_CM, Math.min(maxW, sizeCm.width))),
    height: quantizeCm(Math.max(MIN_PATCH_SIDE_CM, Math.min(maxH, sizeCm.height))),
  };
}

export function patchPositionFromDragDelta(
  patch: Pick<PlantPatch, "positionCm" | "sizeCm">,
  bed: Pick<Bed, "widthCm" | "heightCm">,
  deltaPx: { x: number; y: number },
): CmPoint {
  return clampPatchPositionCm(patch, bed, {
    x: quantizeCm(patch.positionCm.x + pxToCm(deltaPx.x)),
    y: quantizeCm(patch.positionCm.y + pxToCm(deltaPx.y)),
  });
}

export function patchPositionFromDropPx(
  bed: Pick<Bed, "widthCm" | "heightCm">,
  patchSizeCm: CmSize,
  dropLeftPx: number,
  dropTopPx: number,
): CmPoint {
  return clampPatchPositionCm(
    { sizeCm: patchSizeCm },
    bed,
    {
      x: quantizeCm(pxToCm(dropLeftPx)),
      y: quantizeCm(pxToCm(dropTopPx)),
    },
  );
}

export function patchSizeFromResizeDelta(
  patch: Pick<PlantPatch, "positionCm" | "sizeCm">,
  bed: Pick<Bed, "widthCm" | "heightCm">,
  deltaPx: { x: number; y: number },
  anchor: ResizeAnchor = "se",
): CmSize {
  const dw = anchor === "se" || anchor === "e" ? pxToCm(deltaPx.x) : 0;
  const dh = anchor === "se" || anchor === "s" ? pxToCm(deltaPx.y) : 0;
  return clampPatchSizeCm(patch, bed, {
    width: quantizeCm(patch.sizeCm.width + dw),
    height: quantizeCm(patch.sizeCm.height + dh),
  });
}

export function bedSizeFromResizeDelta(
  bed: Pick<Bed, "widthCm" | "heightCm">,
  deltaPx: { x: number; y: number },
  anchor: ResizeAnchor = "se",
): CmSize {
  const dw = anchor === "se" || anchor === "e" ? pxToCm(deltaPx.x) : 0;
  const dh = anchor === "se" || anchor === "s" ? pxToCm(deltaPx.y) : 0;
  return clampBedSizeCm(bed.widthCm + dw, bed.heightCm + dh);
}

export function defaultPatchSizeCm(spacingCm: number): CmSize {
  const side = quantizeCm(Math.max(spacingCm, MIN_PATCH_SIDE_CM));
  return { width: side, height: side };
}
