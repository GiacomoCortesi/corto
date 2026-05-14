/**
 * Extends the standard suggestion context with planting-space analysis
 * for the daily tip prompt.
 */

import { PLANTS, plantById } from "@/lib/data/plants";
import { buildContext } from "@/lib/suggestions/build-context";
import type { GardenSnapshot } from "@/lib/suggestions/types";
import { bedsWithSpaceForPlant } from "@/lib/utils/bed-space";
import { bedAreaCm2, patchOccupiedAreaCm2 } from "@/lib/utils/spacing";

export function buildTipContext(
  snapshot: GardenSnapshot,
  weatherSummary: string | null,
  nowMs: number,
): ReturnType<typeof buildContext> {
  const built = buildContext(snapshot, weatherSummary, nowMs);
  const month = new Date(nowMs).getMonth() + 1;
  const lines: string[] = [built.text, "", "## Spazio libero e catalogo (per consigli di semina/trapianto)"];

  const inSeasonWithSpace: string[] = [];
  const inSeasonNoSpace: string[] = [];

  for (const plant of PLANTS) {
    const canSow = plant.sowing.includes(month);
    const canTransplant = (plant.transplanting ?? []).includes(month);
    if (!canSow && !canTransplant) continue;

    const beds = bedsWithSpaceForPlant(snapshot.beds, plant.id);
    const seasonBits = [
      canSow ? "semina" : null,
      canTransplant ? "trapianto" : null,
    ]
      .filter(Boolean)
      .join(" / ");

    if (beds.length === 0) {
      inSeasonNoSpace.push(
        `- ${plant.name} [${plant.id}] (${seasonBits}): in stagione ma NESSUNA aiuola ha spazio — non proporre questa specie per nuove piantagioni.`,
      );
    } else {
      inSeasonWithSpace.push(
        `- ${plant.name} [${plant.id}] (${seasonBits}): spazio disponibile in ${beds.map((b) => `"${b.name}" [${b.id}]`).join(", ")}`,
      );
    }
  }

  if (inSeasonWithSpace.length === 0) {
    lines.push("(nessuna specie in stagione con spazio libero)");
  } else {
    lines.push(...inSeasonWithSpace);
  }
  if (inSeasonNoSpace.length > 0) {
    lines.push("", "In stagione ma senza spazio (vietato suggerire semina/trapianto):");
    lines.push(...inSeasonNoSpace.slice(0, 40));
    if (inSeasonNoSpace.length > 40) {
      lines.push(`… e altre ${inSeasonNoSpace.length - 40} specie`);
    }
  }

  lines.push("", "## Occupazione aiuole");
  if (snapshot.beds.length === 0) {
    lines.push("(nessuna aiuola — puoi suggerire di creare la prima aiuola o pianificare la stagione)");
  } else {
    for (const bed of snapshot.beds) {
      const total = bedAreaCm2(bed);
      let occupied = 0;
      for (const patch of bed.patches) {
        occupied += patchOccupiedAreaCm2(patch);
      }
      const pct = total === 0 ? 0 : Math.round((occupied / total) * 100);
      lines.push(
        `- "${bed.name}" [${bed.id}]: ${pct}% occupata, ${bed.patches.length} patch`,
      );
    }
  }

  const planted = new Map<string, number>();
  for (const bed of snapshot.beds) {
    for (const patch of bed.patches) {
      const p = plantById(patch.plantId);
      if (!p) continue;
      planted.set(p.id, (planted.get(p.id) ?? 0) + 1);
    }
  }

  lines.push("", "## Specie già presenti (per consigli di cura, raccolta, ecc.)");
  if (planted.size === 0) {
    lines.push("(nessuna pianta piantata)");
  } else {
    for (const [id, count] of planted) {
      const p = plantById(id);
      if (!p) continue;
      const care =
        p.treatments?.pests?.length || p.treatments?.remedies?.length
          ? ` | note colturali: ${[...(p.treatments?.pests ?? []), ...(p.treatments?.remedies ?? [])].slice(0, 4).join("; ")}`
          : "";
      lines.push(`- ${p.name} [${id}]: ${count} patch${care}`);
    }
  }

  return { ...built, text: lines.join("\n") };
}
