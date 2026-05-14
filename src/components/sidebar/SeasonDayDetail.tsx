"use client";

import type { GardenActivity } from "@/lib/types";
import type { ForecastDay } from "@/lib/weather/openmeteo";
import { MoonPhaseIcon } from "@/components/icons/MoonPhaseIcon";
import { getMoonPhaseFromDayKey } from "@/lib/lunar/phase";
import {
  ACTIVITY_KIND_EMOJI,
  ACTIVITY_KIND_LABEL,
} from "@/lib/activity/labels";
import { plantById } from "@/lib/data/plants";
import { wmoDayVisual, formatTempRange, weatherSourceLabel } from "@/lib/weather/wmo-labels";
import { cn } from "@/lib/utils";

type Props = {
  dayKey: string;
  events: GardenActivity[];
  weather?: ForecastDay | null;
  bedsById: Map<string, string>;
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayHeading(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function SeasonDayDetail({ dayKey, events, weather, bedsById }: Props) {
  const moon = getMoonPhaseFromDayKey(dayKey);
  const wmo = weather ? wmoDayVisual(weather.weatherCode) : null;
  const temps = weather ? formatTempRange(weather.tMin, weather.tMax) : null;
  const sourceLabel = weather ? weatherSourceLabel(weather.source) : null;

  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-2.5 space-y-2">
      <div className="text-[11px] font-medium capitalize leading-snug">
        {formatDayHeading(dayKey)}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MoonPhaseIcon
            angleRadians={moon.angleRadians}
            size={14}
            className="shrink-0"
          />
          <span>
            {moon.labelIt} · {Math.round(moon.illumination * 100)}%
          </span>
        </span>
        {weather && wmo ? (
          <span className="inline-flex items-center gap-1">
            <span aria-hidden>{wmo.emoji}</span>
            <span>
              {wmo.label}
              {sourceLabel ? ` · ${sourceLabel}` : ""}
              {temps ? ` · ${temps}` : ""}
              {weather.precipMm != null && weather.precipMm >= 0.1
                ? ` · ${weather.precipMm.toFixed(1)} mm`
                : ""}
            </span>
          </span>
        ) : (
          <span>Meteo non disponibile per questo giorno</span>
        )}
      </div>

      {events.length > 0 ? (
        <ul className="space-y-1">
          {events.map((e) => {
            const plant = e.plantId ? plantById(e.plantId) : undefined;
            const bedName = e.bedId ? bedsById.get(e.bedId) : undefined;
            return (
              <li
                key={e.id}
                className={cn(
                  "flex items-start gap-2 rounded-md border px-2 py-1 text-[10px]",
                  e.planned
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/60 bg-background/50",
                )}
              >
                <span className="shrink-0" aria-hidden>
                  {ACTIVITY_KIND_EMOJI[e.kind]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground/90">
                    {ACTIVITY_KIND_LABEL[e.kind]}
                    {e.planned ? (
                      <span className="ml-1 font-normal text-primary">· pianificata</span>
                    ) : null}
                  </div>
                  {(bedName || plant) && (
                    <div className="text-muted-foreground truncate">
                      {[bedName, plant?.name].filter(Boolean).join(" — ")}
                    </div>
                  )}
                  {e.notes ? (
                    <div className="text-muted-foreground leading-snug">{e.notes}</div>
                  ) : null}
                </div>
                <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
                  {formatTime(e.at)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[10px] text-muted-foreground">Nessuna attività registrata.</p>
      )}
    </div>
  );
}
