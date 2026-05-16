"use client";

import * as React from "react";
import type { Bed } from "@/lib/types";
import { plantById, plantActiveInMonth, plantSeasonModeForMonth } from "@/lib/data/plants";
import { BedDropZone } from "@/components/canvas/BedDropZone";
import { PatchBlock } from "@/components/canvas/PatchBlock";
import { patchRelationsForBed } from "@/lib/utils/companions";
import { bedPlotSizePx } from "@/lib/utils/spacing";

type Props = {
  bed: Bed;
  nodeId: string;
  seasonFilter: number;
};

export function BedPlotArea({ bed, nodeId, seasonFilter }: Props) {
  const [infoPatchId, setInfoPatchId] = React.useState<string | null>(null);
  const plotSize = bedPlotSizePx(bed);
  const patchRelations = patchRelationsForBed(bed);

  return (
    <div
      className="relative nodrag nopan bed-soil-texture"
      data-bed-plot={bed.id}
      style={{ width: plotSize.width, height: plotSize.height }}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) setInfoPatchId(null);
      }}
    >
      <BedDropZone bedId={bed.id} />

      {bed.patches.map((patch) => {
        const plant = plantById(patch.plantId);
        const outOfSeason =
          plant != null && !plantActiveInMonth(plant, seasonFilter);
        const seasonMode =
          plant != null
            ? plantSeasonModeForMonth(plant, seasonFilter)
            : "none";
        return (
          <PatchBlock
            key={`${nodeId}-patch-${patch.id}`}
            bedId={bed.id}
            bed={bed}
            patch={patch}
            relation={patchRelations.get(patch.id) ?? "none"}
            outOfSeason={outOfSeason}
            seasonMonth={seasonFilter}
            seasonMode={seasonMode}
            infoOpen={infoPatchId === patch.id}
            onInfoOpenChange={(open) =>
              setInfoPatchId(open ? patch.id : null)
            }
          />
        );
      })}
    </div>
  );
}
