"use client";

import { plantById } from "@/lib/data/plants";
import type { Plant } from "@/lib/types";

type Props = {
  plant: Plant;
};

export function PlantCompanionCatalog({ plant }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1.5">
          Compagne consigliate
        </div>
        <ul className="space-y-1.5">
          {plant.companions.length === 0 ? (
            <li className="text-xs text-muted-foreground">—</li>
          ) : (
            plant.companions.map((entry) => {
              const p = plantById(entry.plantId);
              const emoji = p?.emoji ?? "🌱";
              return (
                <li
                  key={entry.plantId}
                  className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5"
                >
                  <div className="text-[11px] font-medium">
                    {emoji} {entry.name}
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                    {entry.reason}
                  </p>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <div>
        <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1.5">
          Da evitare
        </div>
        <ul className="space-y-1.5">
          {plant.antagonists.length === 0 ? (
            <li className="text-xs text-muted-foreground">—</li>
          ) : (
            plant.antagonists.map((entry) => {
              const p = plantById(entry.plantId);
              const emoji = p?.emoji ?? "🌱";
              return (
                <li
                  key={entry.plantId}
                  className="rounded-md border border-[var(--conflict)]/35 bg-[var(--conflict-soft)]/25 px-2 py-1.5"
                >
                  <div className="text-[11px] font-medium text-[var(--conflict)]">
                    {emoji} {entry.name}
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                    {entry.reason}
                  </p>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
