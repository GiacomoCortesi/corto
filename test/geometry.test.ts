import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { migratePersistedState } from "../src/lib/store";
import type { Bed, PlantPatch } from "../src/lib/types";
import {
  bedPlotSizePx,
  bedSizeCm,
  bedSizeFromResizeDelta,
  clampBedSizeCm,
  clampPatchPositionCm,
  clampPatchSizeCm,
  cmToPx,
  migratePatchV6ToV7,
  patchBoundsCm,
  patchFitsInBedCm,
  patchGridSpan,
  patchPositionFromDragDelta,
  patchPositionFromDropPx,
  patchRectPx,
  patchSizeFromResizeDelta,
  patchesAdjacentCm,
  patchesOverlapCm,
  positionCmFromAnchor,
  PX_PER_CM,
  pxToCm,
  quantizeCm,
  sizeCmFromGridSpan,
} from "../src/lib/utils/geometry";

function bed(overrides: Partial<Bed> = {}): Bed {
  return {
    id: "bed1",
    name: "Aiuola 1",
    position: { x: 0, y: 0 },
    widthCm: 120,
    heightCm: 120,
    patches: [],
    ...overrides,
  };
}

function patch(overrides: Partial<PlantPatch> = {}): PlantPatch {
  return {
    id: "p1",
    plantId: "tomato",
    positionCm: { x: 10, y: 15 },
    sizeCm: { width: 20, height: 10 },
    ...overrides,
  };
}

describe("geometry", () => {
  it("bedSizeCm reads widthCm and heightCm", () => {
    const size = bedSizeCm(bed({ widthCm: 50, heightCm: 40 }));
    assert.equal(size.width, 50);
    assert.equal(size.height, 40);
  });

  it("patchBoundsCm returns inclusive top-left and exclusive-style corners", () => {
    const b = patchBoundsCm(patch());
    assert.deepEqual(b, { x0: 10, y0: 15, x1: 30, y1: 25 });
  });

  it("patchFitsInBedCm accepts patch inside bed bounds", () => {
    assert.equal(patchFitsInBedCm(patch(), bed()), true);
    assert.equal(
      patchFitsInBedCm(
        patch({ positionCm: { x: 110, y: 0 }, sizeCm: { width: 20, height: 10 } }),
        bed(),
      ),
      false,
    );
  });

  it("patchesOverlapCm detects intersection", () => {
    const a = patch();
    const b = patch({
      id: "p2",
      positionCm: { x: 25, y: 15 },
      sizeCm: { width: 10, height: 10 },
    });
    assert.equal(patchesOverlapCm(a, b), true);
    const c = patch({
      id: "p3",
      positionCm: { x: 30, y: 15 },
      sizeCm: { width: 10, height: 10 },
    });
    assert.equal(patchesOverlapCm(a, c), false);
  });

  it("patchesAdjacentCm detects edge contact without overlap", () => {
    const a = patch({ positionCm: { x: 0, y: 0 }, sizeCm: { width: 10, height: 10 } });
    const b = patch({
      id: "p2",
      positionCm: { x: 10, y: 0 },
      sizeCm: { width: 10, height: 10 },
    });
    assert.equal(patchesOverlapCm(a, b), false);
    assert.equal(patchesAdjacentCm(a, b), true);
  });

  it("patchesAdjacentCm treats small gaps as neighbors for companions", () => {
    const a = patch({ positionCm: { x: 0, y: 0 }, sizeCm: { width: 50, height: 50 } });
    const nearby = patch({
      id: "p2",
      positionCm: { x: 55, y: 0 },
      sizeCm: { width: 50, height: 50 },
    });
    const far = patch({
      id: "p3",
      positionCm: { x: 90, y: 0 },
      sizeCm: { width: 50, height: 50 },
    });
    assert.equal(patchesAdjacentCm(a, nearby), true);
    assert.equal(patchesAdjacentCm(a, far), false);
  });

  it("migration round-trip preserves grid span at 5cm", () => {
    const migrated = migratePatchV6ToV7(
      {
        id: "p1",
        plantId: "carrot",
        anchor: { col: 2, row: 3 },
        plantCols: 4,
        plantRows: 2,
        spacingCm: 8,
      },
      5,
    );
    assert.deepEqual(migrated.positionCm, { x: 10, y: 15 });
    assert.deepEqual(migrated.sizeCm, { width: 20, height: 10 });
    assert.deepEqual(patchGridSpan(migrated, 5), {
      col: 2,
      row: 3,
      cols: 4,
      rows: 2,
    });
  });

  it("positionCmFromAnchor and sizeCmFromGridSpan match migration helpers", () => {
    assert.deepEqual(positionCmFromAnchor({ col: 1, row: 2 }, 30), { x: 30, y: 60 });
    assert.deepEqual(sizeCmFromGridSpan(2, 3, 30), { width: 60, height: 90 });
  });

  it("bedPlotSizePx converts bed physical size to pixels", () => {
    const plot = bedPlotSizePx(bed({ widthCm: 120, heightCm: 120 }));
    assert.equal(plot.width, 120 * PX_PER_CM);
    assert.equal(plot.height, 120 * PX_PER_CM);
  });

  it("patchRectPx maps patch cm geometry to canvas pixels", () => {
    assert.deepEqual(patchRectPx(patch()), {
      left: 10 * PX_PER_CM,
      top: 15 * PX_PER_CM,
      width: 20 * PX_PER_CM,
      height: 10 * PX_PER_CM,
    });
  });

  it("pxToCm inverts cmToPx", () => {
    assert.equal(pxToCm(cmToPx(12.5)), 12.5);
  });

  it("quantizeCm rounds to 0.5 cm steps", () => {
    assert.equal(quantizeCm(10.2), 10);
    assert.equal(quantizeCm(10.3), 10.5);
  });

  it("clampPatchPositionCm keeps patch inside bed", () => {
    const b = bed({ widthCm: 100, heightCm: 100 });
    const p = patch({ sizeCm: { width: 20, height: 10 } });
    assert.deepEqual(clampPatchPositionCm(p, b, { x: 100, y: 95 }), { x: 80, y: 90 });
    assert.deepEqual(clampPatchPositionCm(p, b, { x: -5, y: -3 }), { x: 0, y: 0 });
  });

  it("clampBedSizeCm enforces min and max side", () => {
    assert.deepEqual(clampBedSizeCm(10, 2000), { width: 30, height: 1500 });
  });

  it("clampPatchSizeCm respects bed bounds from patch position", () => {
    const b = bed({ widthCm: 100, heightCm: 80 });
    const p = patch({ positionCm: { x: 70, y: 60 }, sizeCm: { width: 20, height: 20 } });
    assert.deepEqual(clampPatchSizeCm(p, b, { width: 50, height: 50 }), {
      width: 30,
      height: 20,
    });
  });

  it("patchPositionFromDragDelta applies pixel delta in cm", () => {
    const b = bed({ widthCm: 120, heightCm: 120 });
    const p = patch({ positionCm: { x: 10, y: 10 }, sizeCm: { width: 10, height: 10 } });
    const next = patchPositionFromDragDelta(p, b, { x: PX_PER_CM * 2.5, y: PX_PER_CM * 1 });
    assert.deepEqual(next, { x: 12.5, y: 11 });
  });

  it("patchPositionFromDropPx maps plot px to clamped cm", () => {
    const b = bed({ widthCm: 100, heightCm: 100 });
    const size = { width: 20, height: 20 };
    const pos = patchPositionFromDropPx(b, size, cmToPx(15), cmToPx(25));
    assert.deepEqual(pos, { x: 15, y: 25 });
  });

  it("patchSizeFromResizeDelta grows patch from SE handle", () => {
    const b = bed({ widthCm: 100, heightCm: 100 });
    const p = patch({ positionCm: { x: 10, y: 10 }, sizeCm: { width: 20, height: 20 } });
    const next = patchSizeFromResizeDelta(p, b, { x: PX_PER_CM * 5, y: PX_PER_CM * 2 });
    assert.deepEqual(next, { width: 25, height: 22 });
  });

  it("bedSizeFromResizeDelta grows bed from SE handle", () => {
    const b = bed({ widthCm: 120, heightCm: 120 });
    const next = bedSizeFromResizeDelta(b, { x: PX_PER_CM * 10, y: PX_PER_CM * 5 });
    assert.deepEqual(next, { width: 130, height: 125 });
  });
});

describe("migratePersistedState v7", () => {
  it("converts v6 patches to metric geometry", () => {
    const result = migratePersistedState(
      {
        beds: [
          {
            id: "b1",
            name: "A",
            position: { x: 0, y: 0 },
            cols: 10,
            rows: 10,
            cellSizeCm: 5,
            patches: [
              {
                id: "p1",
                plantId: "x",
                anchor: { col: 1, row: 2 },
                plantCols: 3,
                plantRows: 2,
                spacingCm: 12,
              },
            ],
          },
        ],
      },
      6,
    ) as { beds: Array<{ patches: PlantPatch[] }> };
    const migrated = result.beds[0].patches[0];
    assert.deepEqual(migrated.positionCm, { x: 5, y: 10 });
    assert.deepEqual(migrated.sizeCm, { width: 15, height: 10 });
    assert.equal(migrated.spacingCm, 12);
  });
});

describe("migratePersistedState v8", () => {
  it("converts v7 grid bed to widthCm and heightCm", () => {
    const result = migratePersistedState(
      {
        beds: [
          {
            id: "b1",
            name: "A",
            position: { x: 0, y: 0 },
            cols: 4,
            rows: 4,
            cellSizeCm: 30,
            patches: [],
          },
        ],
      },
      7,
    ) as { beds: Bed[] };
    const migrated = result.beds[0];
    assert.equal(migrated.widthCm, 120);
    assert.equal(migrated.heightCm, 120);
    assert.equal("cols" in migrated, false);
    assert.equal("gridStepCm" in migrated, false);
  });
});

describe("migratePersistedState v9", () => {
  it("strips gridStepCm from v8 beds", () => {
    const result = migratePersistedState(
      {
        beds: [
          {
            id: "b1",
            name: "A",
            position: { x: 0, y: 0 },
            widthCm: 120,
            heightCm: 120,
            gridStepCm: 10,
            patches: [],
          },
        ],
      },
      8,
    ) as { beds: Bed[] };
    const migrated = result.beds[0];
    assert.equal(migrated.widthCm, 120);
    assert.equal("gridStepCm" in migrated, false);
  });
});
