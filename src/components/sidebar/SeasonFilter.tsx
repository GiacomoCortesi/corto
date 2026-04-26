"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useGardenStore } from "@/lib/store";
import { MONTHS, MONTHS_LONG } from "@/lib/data/plants";
import { CalendarOff, Calendar } from "lucide-react";

export function SeasonFilter() {
  const seasonFilter = useGardenStore((s) => s.seasonFilter);
  const setSeasonFilter = useGardenStore((s) => s.setSeasonFilter);

  /**
   * When `seasonFilter` is `null` ("tutte le piante") the slider and month
   * buttons are only a *preview* of which month the UI is showing — they
   * must not write to the store, otherwise the canvas would apply
   * `outOfSeason` (opacity) as if the filter were active, which made new
   * patches look "disabled" after any nudge of the control.
   */
  const [previewMonth, setPreviewMonth] = React.useState(
    () => new Date().getMonth() + 1,
  );

  const month = seasonFilter ?? previewMonth;
  const isFilterActive = seasonFilter !== null;

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Stagione</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px] font-mono uppercase tracking-wide text-muted-foreground"
          onClick={() => {
            if (seasonFilter === null) {
              setSeasonFilter(previewMonth);
            } else {
              setPreviewMonth(seasonFilter);
              setSeasonFilter(null);
            }
          }}
        >
          {seasonFilter === null ? (
            <>Attiva</>
          ) : (
            <>
              <CalendarOff className="size-3" />
              Disattiva
            </>
          )}
        </Button>
      </div>

      <div className="flex items-baseline justify-between mb-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">
          {MONTHS_LONG[month - 1]}
        </span>
        <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
          {seasonFilter === null ? "tutte le piante" : "filtro attivo"}
        </span>
      </div>

      <Slider
        value={[month]}
        min={1}
        max={12}
        step={1}
        onValueChange={(v) => {
          const next = Array.isArray(v) ? v[0] : v;
          if (seasonFilter === null) {
            setPreviewMonth(next);
          } else {
            setSeasonFilter(next);
          }
        }}
      />
      <div className="grid grid-cols-12 gap-px text-[9px] font-mono text-muted-foreground mt-1.5 select-none">
        {MONTHS.map((m, i) => {
          const idx = i + 1;
          const selected =
            (isFilterActive && seasonFilter === idx) ||
            (!isFilterActive && previewMonth === idx);
          return (
            <button
              key={m}
              type="button"
              onClick={() => {
                if (seasonFilter === null) {
                  setPreviewMonth(idx);
                } else {
                  setSeasonFilter(idx);
                }
              }}
              className={
                "py-0.5 text-center hover:text-foreground transition-colors " +
                (selected ? "text-foreground font-semibold" : "")
              }
            >
              {m[0]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
