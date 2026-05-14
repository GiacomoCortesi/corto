import type { Bed, CompanionConflict, PlantPatch } from "@/lib/types";
import { plantById } from "@/lib/data/plants";
import { patchesAdjacent } from "@/lib/utils/spacing";

export type CellRelation = "good" | "bad" | "none";

export type CompanionPair = {
  a: PlantPatch;
  b: PlantPatch;
  type: "good" | "bad";
};

/** Plant IDs of patches considered neighbors of `patch` in the same bed. */
export function neighborPlantIdsForPatch(bed: Bed, patch: PlantPatch): string[] {
  const ids: string[] = [];
  for (const other of bed.patches) {
    if (other.id === patch.id) continue;
    if (!patchesAdjacent(patch, other, bed, plantById)) continue;
    ids.push(other.plantId);
  }
  return ids;
}

/**
 * Adjacent patch pairs with a companion or antagonist relationship, deduplicated
 * so each unordered pair appears once (a before b by patch order in the bed).
 */
export function uniqueCompanionPairs(bed: Bed): CompanionPair[] {
  const pairs: CompanionPair[] = [];
  const patches = bed.patches;

  for (let i = 0; i < patches.length; i++) {
    const a = patches[i];
    const plantA = plantById(a.plantId);
    if (!plantA) continue;

    for (let j = i + 1; j < patches.length; j++) {
      const b = patches[j];
      const plantB = plantById(b.plantId);
      if (!plantB) continue;
      if (!patchesAdjacent(a, b, bed, plantById)) continue;

      const antagonist =
        plantA.antagonists.some((e) => e.plantId === b.plantId) ||
        plantB.antagonists.some((e) => e.plantId === a.plantId);
      if (antagonist) {
        pairs.push({ a, b, type: "bad" });
        continue;
      }

      const companion =
        plantA.companions.some((e) => e.plantId === b.plantId) ||
        plantB.companions.some((e) => e.plantId === a.plantId);
      if (companion) {
        pairs.push({ a, b, type: "good" });
      }
    }
  }

  return pairs;
}

/**
 * For each patch in a bed, computes relationships with adjacent patches
 * (rectangles that share a horizontal or vertical edge).
 * For each adjacent pair, at most one conflict per direction is emitted.
 */
export function evaluateBedConflicts(bed: Bed): CompanionConflict[] {
  const conflicts: CompanionConflict[] = [];
  const patches = bed.patches;
  for (let i = 0; i < patches.length; i++) {
    const a = patches[i];
    const plantA = plantById(a.plantId);
    if (!plantA) continue;
    for (let j = 0; j < patches.length; j++) {
      if (i === j) continue;
      const b = patches[j];
      if (!patchesAdjacent(a, b, bed, plantById)) continue;
      if (plantA.antagonists.some((e) => e.plantId === b.plantId)) {
        conflicts.push({
          bedId: bed.id,
          patchId: a.id,
          neighborPatchId: b.id,
          type: "bad",
        });
      } else if (plantA.companions.some((e) => e.plantId === b.plantId)) {
        conflicts.push({
          bedId: bed.id,
          patchId: a.id,
          neighborPatchId: b.id,
          type: "good",
        });
      }
    }
  }
  return conflicts;
}

/**
 * Maps patchId -> worst relationship (bad > good > none) to highlight the
 * whole block rather than individual cells.
 */
export function patchRelationsForBed(bed: Bed): Map<string, CellRelation> {
  const map = new Map<string, CellRelation>();
  const patchById = new Map<string, PlantPatch>();
  for (const p of bed.patches) patchById.set(p.id, p);

  const conflicts = evaluateBedConflicts(bed);
  for (const c of conflicts) {
    const current = map.get(c.patchId);
    if (c.type === "bad" || current !== "bad") {
      map.set(c.patchId, c.type);
    }
  }
  return map;
}
