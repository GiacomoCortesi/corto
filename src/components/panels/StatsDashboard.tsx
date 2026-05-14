"use client";

import * as React from "react";
import { useGardenStore } from "@/lib/store";
import { plantById, MONTHS_LONG } from "@/lib/data/plants";
import { patchDensitySummaryForUI, bedAreaCm2, patchOccupiedAreaCm2 } from "@/lib/utils/spacing";
import { Sprout, LayoutGrid, Layers3, CalendarRange } from "lucide-react";

export function StatsDashboard() {
  const beds = useGardenStore((s) => s.beds);

  const stats = React.useMemo(() => {
    const bedCount = beds.length;
    const totalAreaCm2 = beds.reduce((acc, b) => acc + bedAreaCm2(b), 0);
    let occupiedAreaCm2 = 0;
    for (const b of beds) {
      for (const patch of b.patches) {
        occupiedAreaCm2 += patchOccupiedAreaCm2(patch);
      }
    }
    const occupation =
      totalAreaCm2 === 0
        ? 0
        : Math.round((occupiedAreaCm2 / totalAreaCm2) * 100);

    const byCategory = new Map<string, { units: number; hasLessThanOne?: boolean }>();
    const byPlant = new Map<string, { units: number; hasLessThanOne?: boolean }>();
    let totalPlantUnits = 0;
    for (const b of beds) {
      for (const patch of b.patches) {
        const p = plantById(patch.plantId);
        if (!p) continue;
        const density = patchDensitySummaryForUI(patch, b, p);
        const units = density.totalPlants;

        const prevCat = byCategory.get(p.category);
        if (prevCat) {
          prevCat.units += units;
          prevCat.hasLessThanOne =
            prevCat.hasLessThanOne || density.showTotalLessThanOne || undefined;
        } else {
          byCategory.set(p.category, {
            units,
            hasLessThanOne: density.showTotalLessThanOne || undefined,
          });
        }

        const prevPlant = byPlant.get(p.id);
        if (prevPlant) {
          prevPlant.units += units;
          prevPlant.hasLessThanOne =
            prevPlant.hasLessThanOne || density.showTotalLessThanOne || undefined;
        } else {
          byPlant.set(p.id, {
            units,
            hasLessThanOne: density.showTotalLessThanOne || undefined,
          });
        }

        totalPlantUnits += units;
      }
    }

    const now = new Date().getMonth() + 1;
    const upcoming: { month: number; plants: string[] }[] = [];
    for (let offset = 0; offset < 12; offset++) {
      const month = ((now - 1 + offset) % 12) + 1;
      const harvesting = new Set<string>();
      for (const b of beds) {
        for (const patch of b.patches) {
          const p = plantById(patch.plantId);
          if (p?.harvest.includes(month)) harvesting.add(p.name);
        }
      }
      if (harvesting.size > 0) {
        upcoming.push({ month, plants: Array.from(harvesting) });
        if (upcoming.length >= 3) break;
      }
    }

    const topPlants = Array.from(byPlant.entries())
      .sort((a, b) => {
        const au = a[1].units === 0 && a[1].hasLessThanOne ? 0.5 : a[1].units;
        const bu = b[1].units === 0 && b[1].hasLessThanOne ? 0.5 : b[1].units;
        return bu - au;
      })
      .slice(0, 5);

    return {
      bedCount,
      totalAreaCm2,
      occupiedAreaCm2,
      occupation,
      totalPlantUnits,
      speciesCount: byPlant.size,
      byCategory: Array.from(byCategory.entries()).sort((a, b) => {
        const au = a[1].units === 0 && a[1].hasLessThanOne ? 0.5 : a[1].units;
        const bu = b[1].units === 0 && b[1].hasLessThanOne ? 0.5 : b[1].units;
        return bu - au;
      }),
      topPlants,
      upcoming,
    };
  }, [beds]);

  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Tile
          icon={<LayoutGrid className="size-3.5" />}
          label="Aiuole"
          value={stats.bedCount}
        />
        <Tile
          icon={<Layers3 className="size-3.5" />}
          label="Orto utilizzato"
          value={`${stats.occupation}%`}
        />
        <Tile
          icon={<Sprout className="size-3.5" />}
          label="Piante (unità)"
          value={stats.totalPlantUnits}
        />
        <Tile
          icon={<CalendarRange className="size-3.5" />}
          label="Specie"
          value={stats.speciesCount}
        />
      </div>

      {stats.byCategory.length > 0 ? (
        <Section title="Per categoria">
          <div className="space-y-1.5">
            {stats.byCategory.map(([cat, v]) => {
              const max = Math.max(
                ...stats.byCategory.map((c) => {
                  const u = c[1].units;
                  return u === 0 && c[1].hasLessThanOne ? 0.5 : u;
                }),
              );
              const n = v.units === 0 && v.hasLessThanOne ? 0.5 : v.units;
              const pct = max === 0 ? 0 : (n / max) * 100;
              return (
                <div key={cat}>
                  <div className="flex justify-between text-[11px]">
                    <span className="capitalize">{cat}</span>
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {v.units === 0 && v.hasLessThanOne ? "<1" : v.units}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden mt-0.5">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      ) : null}

      {stats.topPlants.length > 0 ? (
        <Section title="Top piante">
          <div className="flex flex-wrap gap-1">
            {stats.topPlants.map(([id, v]) => {
              const p = plantById(id);
              if (!p) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs"
                >
                  <span>{p.emoji}</span>
                  <span className="font-medium">{p.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    ×{v.units === 0 && v.hasLessThanOne ? "<1" : v.units}
                  </span>
                </span>
              );
            })}
          </div>
        </Section>
      ) : null}

      {stats.upcoming.length > 0 ? (
        <Section title="Prossimi raccolti">
          <div className="space-y-1.5">
            {stats.upcoming.map((u) => (
              <div
                key={u.month}
                className="flex items-start justify-between gap-3 text-xs"
              >
                <span className="font-medium">{MONTHS_LONG[u.month - 1]}</span>
                <span className="text-right text-muted-foreground line-clamp-2">
                  {u.plants.join(", ")}
                </span>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {stats.bedCount === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          Aggiungi aiuole e piante per vedere le statistiche.
        </div>
      ) : null}
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-1">
        <div className="text-xl font-semibold tabular-nums tracking-tight">
          {value}
        </div>
        {hint ? (
          <div className="text-[10px] font-mono text-muted-foreground">
            {hint}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}
