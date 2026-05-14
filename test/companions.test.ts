import test from "node:test";
import assert from "node:assert/strict";
import type { Bed, PlantPatch } from "@/lib/types";
import { uniqueCompanionPairs } from "@/lib/utils/companions";

function bed(patches: PlantPatch[]): Bed {
  return {
    id: "b1",
    name: "Test",
    position: { x: 0, y: 0 },
    widthCm: 200,
    heightCm: 200,
    patches,
  };
}

function patch(
  plantId: string,
  x: number,
  id = plantId,
): PlantPatch {
  return {
    id,
    plantId,
    positionCm: { x, y: 0 },
    sizeCm: { width: 50, height: 50 },
  };
}

test("uniqueCompanionPairs detects companions across typical quick-add gaps", () => {
  const pairs = uniqueCompanionPairs(
    bed([patch("pomodoro", 0), patch("basilico", 55, "basilico-1")]),
  );
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0]?.type, "good");
});

test("uniqueCompanionPairs detects antagonists across typical quick-add gaps", () => {
  const pairs = uniqueCompanionPairs(
    bed([patch("pomodoro", 0), patch("finocchio", 55, "finocchio-1")]),
  );
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0]?.type, "bad");
});
