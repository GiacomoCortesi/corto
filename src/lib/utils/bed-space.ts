import type { Bed } from "@/lib/types";
import { plantById } from "@/lib/data/plants";
import {
  defaultPatchSizeCm,
  GEOMETRY_EPS_CM,
  quantizeCm,
} from "@/lib/utils/geometry";
import { patchFitsInBed, patchesOverlap } from "@/lib/utils/spacing";

const SCAN_STEP_CM = 5;

/** Whether at least one default-sized patch of `plantId` fits in `bed`. */
export function bedHasSpaceForPlant(bed: Bed, plantId: string): boolean {
  const plant = plantById(plantId);
  if (!plant) return false;

  const sizeCm = defaultPatchSizeCm(plant.defaultSpacingCm);
  const probe = {
    id: "__space_probe__",
    plantId,
    sizeCm,
    spacingCm: plant.defaultSpacingCm,
  };

  for (
    let y = 0;
    y <= bed.heightCm - sizeCm.height + GEOMETRY_EPS_CM;
    y += SCAN_STEP_CM
  ) {
    for (
      let x = 0;
      x <= bed.widthCm - sizeCm.width + GEOMETRY_EPS_CM;
      x += SCAN_STEP_CM
    ) {
      const candidate = {
        ...probe,
        positionCm: { x: quantizeCm(x), y: quantizeCm(y) },
      };
      if (!patchFitsInBed(candidate, bed, plant)) continue;
      let fits = true;
      for (const existing of bed.patches) {
        if (patchesOverlap(candidate, existing, bed, plantById)) {
          fits = false;
          break;
        }
      }
      if (fits) return true;
    }
  }
  return false;
}

export function bedsWithSpaceForPlant(beds: Bed[], plantId: string): Bed[] {
  return beds.filter((b) => bedHasSpaceForPlant(b, plantId));
}
