import type { Bed, CompanionConflict, PlantPatch } from "@/lib/types";
import { plantById } from "@/lib/data/plants";
import { patchCellRect, patchesAdjacent } from "@/lib/utils/spacing";

export type CellRelation = "good" | "bad" | "none";

/**
 * Per ogni patch di un'aiuola, calcola le relazioni con i patch adiacenti
 * (rettangoli che condividono uno spigolo orizzontale o verticale).
 * Per ciascuna coppia adiacente si emette al più un conflitto per direzione.
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
 * Mappa cellIndex -> relazione peggiore (bad > good > none) per styling.
 * Espande l'area occupata da ciascun patch coinvolto in un conflitto sulle
 * celle corrispondenti della griglia, così la visualizzazione su singola
 * cella resta corretta sia per patch 1x1 sia per patch più grandi.
 */
export function cellRelationsForBed(bed: Bed): Map<number, CellRelation> {
  const map = new Map<number, CellRelation>();
  const patchById = new Map<string, PlantPatch>();
  for (const p of bed.patches) patchById.set(p.id, p);

  const conflicts = evaluateBedConflicts(bed);
  for (const c of conflicts) {
    const patch = patchById.get(c.patchId);
    if (!patch) continue;
    const plant = plantById(patch.plantId);
    if (!plant) continue;
    const rect = patchCellRect(patch, bed, plant);
    for (let row = rect.row0; row <= rect.row1; row++) {
      for (let col = rect.col0; col <= rect.col1; col++) {
        if (row < 0 || col < 0 || row >= bed.rows || col >= bed.cols) continue;
        const idx = row * bed.cols + col;
        const current = map.get(idx);
        if (c.type === "bad" || current !== "bad") {
          map.set(idx, c.type);
        }
      }
    }
  }
  return map;
}

/**
 * Mappa patchId -> relazione peggiore (bad > good > none) per evidenziare
 * il blocco intero anziché le singole celle.
 */
export function patchRelationsForBed(bed: Bed): Map<string, CellRelation> {
  const map = new Map<string, CellRelation>();
  for (const c of evaluateBedConflicts(bed)) {
    const current = map.get(c.patchId);
    if (c.type === "bad" || current !== "bad") {
      map.set(c.patchId, c.type);
    }
  }
  return map;
}

export type CompanionPair = {
  a: PlantPatch;
  b: PlantPatch;
  type: "good" | "bad";
};

/**
 * Coppie uniche per il pannello (deduplica le coppie ordinando per id).
 */
export function uniqueCompanionPairs(bed: Bed): CompanionPair[] {
  const seen = new Set<string>();
  const pairs: CompanionPair[] = [];
  const byId = new Map<string, PlantPatch>();
  for (const p of bed.patches) byId.set(p.id, p);

  for (const c of evaluateBedConflicts(bed)) {
    const key = [c.patchId, c.neighborPatchId].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    const a = byId.get(c.patchId);
    const b = byId.get(c.neighborPatchId);
    if (!a || !b) continue;
    pairs.push({ a, b, type: c.type });
  }
  return pairs;
}
