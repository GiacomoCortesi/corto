"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useGardenStore } from "@/lib/store";
import { MONTHS, MONTHS_LONG } from "@/lib/data/plants";
import { resolveSeasonYear } from "@/lib/calendar/resolve-year";
import { localDayKey } from "@/lib/calendar/day-key";
import { getMoonPhaseForDate } from "@/lib/lunar/phase";
import { wmoDayVisual } from "@/lib/weather/wmo-labels";
import { useMonthWeather } from "@/hooks/useMonthWeather";
import { SeasonCalendarGrid } from "@/components/sidebar/SeasonCalendarGrid";
import { MoonPhaseIcon } from "@/components/icons/MoonPhaseIcon";
import { Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function SeasonFilter() {
  const seasonFilter = useGardenStore((s) => s.seasonFilter);
  const setSeasonFilter = useGardenStore((s) => s.setSeasonFilter);
  const location = useGardenStore((s) => s.meta?.location);
  const [detailOpen, setDetailOpen] = React.useState(false);

  const seasonYear = resolveSeasonYear(seasonFilter);

  const today = React.useMemo(() => new Date(), []);
  const todayKey = React.useMemo(() => localDayKey(today.getTime()), [today]);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const todayHeading = today.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
  });

  const moon = React.useMemo(
    () => getMoonPhaseForDate(todayYear, todayMonth, todayDay),
    [todayYear, todayMonth, todayDay],
  );

  const { days: weatherDays } = useMonthWeather(
    location,
    todayYear,
    todayMonth,
    Boolean(location),
  );
  const todayWeather = weatherDays[todayKey];
  const wmo = todayWeather ? wmoDayVisual(todayWeather.weatherCode) : null;
  const selectedMonthLabel = MONTHS_LONG[seasonFilter - 1] ?? "";

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xl font-semibold tracking-tight capitalize leading-none">
            {todayHeading}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            {wmo && wmo.emoji !== "·" ? (
              <span
                className="text-base leading-none"
                title={wmo.label}
                aria-label={wmo.label}
              >
                {wmo.emoji}
              </span>
            ) : (
              <span
                className="text-[10px] font-mono text-muted-foreground"
                title={location ? "Meteo non disponibile" : "Imposta posizione per il meteo"}
              >
                ·
              </span>
            )}
            <span title={moon.labelIt} aria-label={moon.labelIt}>
              <MoonPhaseIcon angleRadians={moon.angleRadians} size={18} />
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">Stagione</span>
          </div>
          <Button
            variant="ghost"
            size="icon-lg"
            className={cn(
              "shrink-0 touch-manipulation",
              detailOpen ? "text-foreground" : "text-muted-foreground",
            )}
            onClick={() => setDetailOpen((v) => !v)}
            aria-expanded={detailOpen}
            aria-label={
              detailOpen ? "Nascondi calendario mensile" : "Mostra calendario mensile"
            }
          >
            {detailOpen ? (
              <ChevronUp className="size-4" aria-hidden />
            ) : (
              <ChevronDown className="size-4" aria-hidden />
            )}
          </Button>
        </div>

        <p className="mb-2 text-xl font-semibold tracking-tight leading-none">
          {selectedMonthLabel}
        </p>

        <Slider
          value={[seasonFilter]}
          min={1}
          max={12}
          step={1}
          onValueChange={(v) => {
            const next = Array.isArray(v) ? v[0] : v;
            setSeasonFilter(next);
          }}
        />
        <div className="grid grid-cols-12 gap-0.5 text-[9px] font-mono text-muted-foreground mt-1.5 select-none">
          {MONTHS.map((m, i) => {
            const idx = i + 1;
            const selected = seasonFilter === idx;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setSeasonFilter(idx)}
                className={cn(
                  "min-h-8 rounded-sm py-1 text-center touch-manipulation transition-colors hover:text-foreground active:bg-muted/60",
                  selected && "bg-muted/50 font-semibold text-foreground",
                )}
              >
                {m[0]}
              </button>
            );
          })}
        </div>

        {detailOpen ? (
          <SeasonCalendarGrid year={seasonYear} month={seasonFilter} />
        ) : null}
      </div>
    </div>
  );
}
