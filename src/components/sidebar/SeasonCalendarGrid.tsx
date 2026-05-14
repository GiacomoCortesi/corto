"use client";

import * as React from "react";
import { buildMonthGrid, WEEKDAY_HEADERS } from "@/lib/calendar/month-grid";
import { eventsForMonth } from "@/lib/calendar/events-by-day";
import { localDayKey } from "@/lib/calendar/day-key";
import { MoonPhaseIcon } from "@/components/icons/MoonPhaseIcon";
import { getMoonPhaseForDate } from "@/lib/lunar/phase";
import { wmoDayVisual } from "@/lib/weather/wmo-labels";
import { useMonthWeather } from "@/hooks/useMonthWeather";
import { useGardenStore } from "@/lib/store";
import { SeasonDayDetail } from "@/components/sidebar/SeasonDayDetail";
import { cn } from "@/lib/utils";

type Props = {
  year: number;
  month: number;
};

export function SeasonCalendarGrid({ year, month }: Props) {
  const events = useGardenStore((s) => s.events);
  const beds = useGardenStore((s) => s.beds);
  const location = useGardenStore((s) => s.meta?.location);

  const todayKey = React.useMemo(() => localDayKey(Date.now()), []);
  const [selectedDay, setSelectedDay] = React.useState<string | null>(todayKey);

  React.useEffect(() => {
    setSelectedDay((prev) => {
      const prefix = `${year}-${String(month).padStart(2, "0")}-`;
      if (prev?.startsWith(prefix)) return prev;
      if (todayKey.startsWith(prefix)) return todayKey;
      return `${prefix}01`;
    });
  }, [year, month, todayKey]);

  const cells = React.useMemo(() => buildMonthGrid(year, month), [year, month]);
  const eventsByDay = React.useMemo(
    () => eventsForMonth(events, year, month),
    [events, year, month],
  );
  const bedsById = React.useMemo(
    () => new Map(beds.map((b) => [b.id, b.name])),
    [beds],
  );

  const { days: weatherDays, partial, loading, error } = useMonthWeather(
    location,
    year,
    month,
    true,
  );

  const selectedEvents = selectedDay ? eventsByDay.get(selectedDay) ?? [] : [];
  const selectedWeather = selectedDay ? weatherDays[selectedDay] ?? null : null;

  const monthUsesClimatology = React.useMemo(
    () => Object.values(weatherDays).some((d) => d.source === "climatology"),
    [weatherDays],
  );

  return (
    <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
          Calendario · {year}
        </span>
        {loading ? (
          <span className="text-[9px] text-muted-foreground">Meteo…</span>
        ) : partial && location ? (
          <span className="text-[9px] text-muted-foreground">meteo incompleto</span>
        ) : monthUsesClimatology && location ? (
          <span
            className="text-[9px] text-muted-foreground"
            title="Giorni oltre l'orizzonte di previsione: stime da dati dello scorso anno"
          >
          </span>
        ) : null}
      </div>

      {monthUsesClimatology && location && !partial ? (
        <p className="text-[9px] text-muted-foreground leading-snug">
          Oltre i prossimi 16 giorni il meteo usa la media dello stesso mese dell&apos;anno
          precedente.
        </p>
      ) : null}

      {!location && (
        <p className="text-[9px] text-muted-foreground leading-snug">
          Imposta la posizione dell&apos;orto per il meteo giornaliero.
        </p>
      )}
      {error && location ? (
        <p className="text-[9px] text-muted-foreground leading-snug">{error}</p>
      ) : null}

      <div className="grid grid-cols-7 gap-px text-[8px] font-mono text-muted-foreground select-none">
        {WEEKDAY_HEADERS.map((d, i) => (
          <div key={`${d}-${i}`} className="text-center py-0.5">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell) => {
          if (cell.kind === "empty") {
            return <div key={cell.key} className="h-[42px]" aria-hidden />;
          }

          const moon = getMoonPhaseForDate(year, month, cell.day);
          const dayEvents = eventsByDay.get(cell.key) ?? [];
          const weather = weatherDays[cell.key];
          const wmo = weather ? wmoDayVisual(weather.weatherCode) : null;
          const isToday = cell.key === todayKey;
          const isSelected = cell.key === selectedDay;
          const hasPlanned = dayEvents.some((e) => e.planned);
          const hasDone = dayEvents.some((e) => !e.planned);

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => setSelectedDay(cell.key)}
              className={cn(
                "h-[42px] rounded-md border px-0.5 py-0.5 flex flex-col items-center justify-between transition-colors",
                isSelected
                  ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                  : "border-border/50 bg-background/40 hover:border-primary/30 hover:bg-muted/30",
                isToday && !isSelected && "ring-1 ring-dashed ring-primary/50",
              )}
              aria-label={`${cell.day} ${moon.labelIt}${dayEvents.length ? `, ${dayEvents.length} attività` : ""}`}
              aria-pressed={isSelected}
            >
              <span className="text-[9px] font-semibold tabular-nums leading-none">
                {cell.day}
              </span>
              <MoonPhaseIcon
                angleRadians={moon.angleRadians}
                size={10}
                className="shrink-0"
                title={moon.labelIt}
              />
              <span className="flex items-center gap-0.5 h-2.5 leading-none">
                {wmo && wmo.emoji !== "·" ? (
                  <span className="text-[8px]" aria-hidden title={wmo.label}>
                    {wmo.emoji}
                  </span>
                ) : (
                  <span className="text-[8px] text-transparent select-none">·</span>
                )}
                {hasDone ? (
                  <span
                    className="size-1 rounded-full bg-[var(--sage)]"
                    aria-hidden
                    title="Attività registrate"
                  />
                ) : null}
                {hasPlanned ? (
                  <span
                    className="size-1 rounded-full bg-primary"
                    aria-hidden
                    title="Attività pianificate"
                  />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {selectedDay ? (
        <SeasonDayDetail
          dayKey={selectedDay}
          events={selectedEvents}
          weather={selectedWeather}
          bedsById={bedsById}
        />
      ) : null}
    </div>
  );
}
