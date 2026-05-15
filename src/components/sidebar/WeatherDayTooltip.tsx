"use client";

import * as React from "react";
import type { ForecastDay } from "@/lib/weather/openmeteo";
import type { GardenLocation } from "@/lib/types";
import {
  formatHourlyRow,
  weatherDayDetailLines,
} from "@/lib/weather/wmo-labels";
import { useDayHourlyWeather } from "@/hooks/useDayHourlyWeather";
import { usePrefersHover } from "@/hooks/usePrefersHover";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  weather?: ForecastDay | null;
  location?: GardenLocation;
  /** Shown when weather is missing (e.g. no location set). */
  fallback?: string;
  side?: "top" | "bottom" | "left" | "right";
  /** Stop tap from bubbling (e.g. weather inside a calendar day button). */
  stopPropagation?: boolean;
  children: React.ReactElement<TriggerChildProps>;
};

function stopBubble(e: React.SyntheticEvent) {
  e.stopPropagation();
}

function HourlySection({
  hours,
  loading,
  unavailable,
  source,
  variant,
}: {
  hours: ReturnType<typeof useDayHourlyWeather>["hours"];
  loading: boolean;
  unavailable: boolean;
  source?: ForecastDay["source"];
  variant: "tooltip" | "popover";
}) {
  const border =
    variant === "tooltip"
      ? "border-background/20"
      : "border-border/60";
  const muted = variant === "tooltip" ? "opacity-70" : "text-muted-foreground";

  if (loading) {
    return (
      <p className={cn("text-[10px] pt-1.5 border-t", muted, border)}>
        Caricamento orario…
      </p>
    );
  }
  if (unavailable || hours.length === 0) {
    const hint =
      source === "climatology"
        ? "Media storica: solo riepilogo giornaliero."
        : "Dettaglio orario non disponibile.";
    return (
      <p className={cn("text-[10px] pt-1.5 border-t", muted, border)}>
        {hint}
      </p>
    );
  }
  return (
    <div className={cn("pt-1.5 border-t", border)}>
      <p className={cn("text-[10px] mb-1", muted)}>Per ora</p>
      <ul className="max-h-44 sm:max-h-40 overflow-y-auto overscroll-contain space-y-0.5 font-mono text-[10px] leading-tight pr-0.5">
        {hours.map((h) => (
          <li key={h.time}>{formatHourlyRow(h)}</li>
        ))}
      </ul>
    </div>
  );
}

function WeatherDetailBody({
  weather,
  location,
  open,
  variant,
}: {
  weather: ForecastDay;
  location?: GardenLocation;
  open: boolean;
  variant: "tooltip" | "popover";
}) {
  const lines = weatherDayDetailLines(weather);
  const { hours, loading, unavailable } = useDayHourlyWeather(
    location,
    weather.date,
    weather.source,
    open,
  );
  const muted = variant === "tooltip" ? "opacity-70" : "text-muted-foreground";

  return (
    <div className="flex flex-col gap-1 text-left leading-snug min-w-[140px]">
      {lines.map((line) => (
        <div key={line.label} className="flex flex-col gap-px">
          <span className={cn("text-[10px]", muted)}>{line.label}</span>
          <span className="font-medium">{line.value}</span>
        </div>
      ))}
      <HourlySection
        hours={hours}
        loading={loading}
        unavailable={unavailable}
        source={weather.source}
        variant={variant}
      />
    </div>
  );
}

type TriggerChildProps = {
  className?: string;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  "aria-label"?: string;
};

function popoverTriggerFromChild(
  child: React.ReactElement,
  opts: { stopPropagation: boolean; label: string },
) {
  const props = child.props as TriggerChildProps;
  const className = cn(
    "inline-flex min-h-8 min-w-8 items-center justify-center touch-manipulation rounded-md p-0 text-inherit cursor-default",
    opts.stopPropagation ? "border-0 bg-transparent" : "border-0 bg-transparent",
    props.className,
  );
  const handlers = {
    onClick: (e: React.MouseEvent) => {
      if (opts.stopPropagation) stopBubble(e);
      props.onClick?.(e);
    },
    onPointerDown: (e: React.PointerEvent) => {
      if (opts.stopPropagation) stopBubble(e);
      props.onPointerDown?.(e);
    },
  };

  // Inside another <button> (calendar day): cannot nest buttons.
  if (opts.stopPropagation) {
    return (
      <PopoverTrigger
        nativeButton={false}
        aria-label={props["aria-label"] ?? opts.label}
        className={className}
        {...handlers}
      >
        {props.children}
      </PopoverTrigger>
    );
  }

  return (
    <PopoverTrigger
      type="button"
      aria-label={props["aria-label"] ?? opts.label}
      className={className}
      {...handlers}
    >
      {props.children}
    </PopoverTrigger>
  );
}

function tooltipTriggerFromChild(
  child: React.ReactElement<TriggerChildProps>,
  label: string,
): React.ReactElement<TriggerChildProps> {
  const props = child.props;
  return React.cloneElement(child, {
    ...props,
    "aria-label": props["aria-label"] ?? label,
  });
}

export function WeatherDayTooltip({
  weather,
  location,
  fallback,
  side = "top",
  stopPropagation = false,
  children,
}: Props) {
  const prefersHover = usePrefersHover();
  const [open, setOpen] = React.useState(false);

  const label =
    weather != null
      ? `Meteo: ${weatherDayDetailLines(weather)[0]?.value ?? "dettagli"}`
      : (fallback ?? "Meteo");

  if (!weather && !fallback) return children;

  if (!prefersHover) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        {popoverTriggerFromChild(children, {
          stopPropagation,
          label,
        })}
        <PopoverContent
          side={side === "left" ? "bottom" : side}
          align="end"
          className="w-[min(100vw-2rem,240px)] p-2.5"
        >
          {weather ? (
            <WeatherDetailBody
              weather={weather}
              location={location}
              open={open}
              variant="popover"
            />
          ) : (
            <p className="text-xs text-muted-foreground">{fallback}</p>
          )}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        {tooltipTriggerFromChild(children, label)}
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-[220px] p-2.5">
        {weather ? (
          <WeatherDetailBody
            weather={weather}
            location={location}
            open={open}
            variant="tooltip"
          />
        ) : (
          fallback
        )}
      </TooltipContent>
    </Tooltip>
  );
}
