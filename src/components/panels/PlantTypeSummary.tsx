"use client";

import * as React from "react";
import { Sprout } from "lucide-react";
import type { Bed, Plant } from "@/lib/types";
import { plantById } from "@/lib/data/plants";
import { patchDensitySummaryForUI } from "@/lib/utils/spacing";

type Props = {
  beds: Bed[];
  /** Etichetta opzionale mostrata in alto */
  title?: string;
  /** Sottotitolo opzionale (es. nome aiuola o conteggio aiuole) */
  subtitle?: string;
};

type PlantTypeRow = {
  plant: Plant;
  units: number;
  hasLessThanOne?: boolean;
};

export function PlantTypeSummary({ beds, title, subtitle }: Props) {
  const rows = React.useMemo(() => {
    const acc = new Map<string, PlantTypeRow>();
    for (const bed of beds) {
      for (const patch of bed.patches) {
        const plant = plantById(patch.plantId);
        if (!plant) continue;
        const density = patchDensitySummaryForUI(patch, bed, plant);
        const units = density.totalPlants;
        const prev = acc.get(plant.id);
        if (prev) {
          prev.units += units;
          prev.hasLessThanOne =
            prev.hasLessThanOne || density.showTotalLessThanOne || undefined;
        } else {
          acc.set(plant.id, {
            plant,
            units,
            hasLessThanOne: density.showTotalLessThanOne || undefined,
          });
        }
      }
    }
    return Array.from(acc.values()).sort((a, b) => {
      const au = a.units === 0 && a.hasLessThanOne ? 0.5 : a.units;
      const bu = b.units === 0 && b.hasLessThanOne ? 0.5 : b.units;
      return bu - au;
    });
  }, [beds]);

  const totals = React.useMemo(() => {
    let units = 0;
    for (const r of rows) {
      units += r.units;
    }
    return { units, types: rows.length };
  }, [rows]);

  return (
    <div className="space-y-3">
      {title || subtitle ? (
        <div className="space-y-0.5">
          {title ? (
            <div className="text-sm font-semibold tracking-tight">{title}</div>
          ) : null}
          {subtitle ? (
            <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
              {subtitle}
            </div>
          ) : null}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5">
          <Sprout className="size-4 text-muted-foreground/70" />
          Nessuna pianta ancora.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <SummaryTile label="Tipi" value={totals.types} />
            <SummaryTile label="Piante" value={totals.units} />
          </div>

          <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {rows.map((r) => (
              <li
                key={r.plant.id}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs"
              >
                <span className="text-base leading-none" aria-hidden>
                  {r.plant.emoji}
                </span>
                <span className="flex-1 min-w-0 truncate font-medium">
                  {r.plant.name}
                </span>
                <span className="font-mono tabular-nums text-sm font-semibold w-10 text-right">
                  {r.units === 0 && r.hasLessThanOne ? "<1" : r.units}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-2 py-1.5">
      <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground leading-none">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold tabular-nums leading-none">
        {value}
      </div>
    </div>
  );
}
