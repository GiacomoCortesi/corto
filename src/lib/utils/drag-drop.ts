import type { DragEndEvent } from "@dnd-kit/core";
import { plantById } from "@/lib/data/plants";
import type { Bed } from "@/lib/types";
import {
  defaultPatchSizeCm,
  patchPositionFromDropPx,
  type CmPoint,
} from "@/lib/utils/geometry";

export function resolveDropBedId(event: DragEndEvent): string | null {
  const overId = event.over ? String(event.over.id) : "";
  if (overId.startsWith("bed:")) {
    return overId.slice("bed:".length);
  }

  const translated = event.active.rect.current.translated;
  if (!translated) return null;

  const cx = translated.left + translated.width / 2;
  const cy = translated.top + translated.height / 2;

  for (const el of document.querySelectorAll("[data-bed-plot]")) {
    const rect = el.getBoundingClientRect();
    if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom) {
      return el.getAttribute("data-bed-plot");
    }
  }
  return null;
}

export function resolveCatalogDropPositionCm(
  event: DragEndEvent,
  bed: Bed,
  plantId: string,
): CmPoint | null {
  const plotEl = document.querySelector(`[data-bed-plot="${bed.id}"]`);
  if (!plotEl) return null;

  const translated = event.active.rect.current.translated;
  if (!translated) return null;

  const plotRect = plotEl.getBoundingClientRect();
  const dropLeftPx = translated.left - plotRect.left;
  const dropTopPx = translated.top - plotRect.top;

  const plant = plantById(plantId);
  if (!plant) return null;

  const sizeCm = defaultPatchSizeCm(plant.defaultSpacingCm);

  return patchPositionFromDropPx(bed, sizeCm, dropLeftPx, dropTopPx);
}
