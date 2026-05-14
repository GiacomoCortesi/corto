"use client";

import * as React from "react";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { perSquareMeterLabelForPlant } from "@/lib/utils/spacing";
import { formatMonthRanges } from "@/lib/data/plants";
import type { Plant } from "@/lib/types";
import { Sun, CloudSun, CloudMoon, Droplet, Droplets, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { quickAddPlantToGarden } from "@/lib/utils/quick-add-plant";

type Props = {
  plant: Plant;
  index: number;
  outOfSeason?: boolean;
  onAdded?: () => void;
  /** When false, the card is tap-to-add only (e.g. add-plant dialog). */
  draggable?: boolean;
  /** When false, hides today/season hints and shows static sowing/transplant periods. */
  showTodayHints?: boolean;
};

const SUN_ICON = {
  full: Sun,
  partial: CloudSun,
  shade: CloudMoon,
} as const;

const WATER_LABEL = {
  low: "Poca acqua",
  medium: "Media acqua",
  high: "Molta acqua",
};

export function PlantCard({
  plant,
  index,
  outOfSeason,
  onAdded,
  draggable = true,
  showTodayHints = true,
}: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `plant:${plant.id}`,
    data: { plantId: plant.id },
    disabled: !draggable,
  });

  const perCellLabel = perSquareMeterLabelForPlant(plant);

  const quickAdd = React.useCallback(() => {
    quickAddPlantToGarden(plant, { onAdded });
  }, [onAdded, plant]);

  const SunIcon = SUN_ICON[plant.sun];
  const calendarMonth = new Date().getMonth() + 1;
  const canSowNow = showTodayHints && plant.sowing.includes(calendarMonth);
  const canTransplantNow =
    showTodayHints && (plant.transplanting ?? []).includes(calendarMonth);
  const sowingLabel = formatMonthRanges(plant.sowing);
  const transplantLabel = formatMonthRanges(plant.transplanting ?? []);

  return (
    <div
      ref={draggable ? setNodeRef : undefined}
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
      style={{ animationDelay: `${index * 18}ms` }}
      onClick={(e) => {
        if (isDragging) return;
        const tapToAdd =
          !draggable ||
          (typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches);
        if (tapToAdd) {
          e.preventDefault();
          e.stopPropagation();
          quickAdd();
        }
      }}
      className={cn(
        "group relative rounded-xl border border-border bg-card p-3 transition-all duration-150",
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        "hover:border-primary/40 hover:shadow-sm hover:-translate-y-0.5",
        "fade-in-up",
        isDragging && "opacity-30",
        showTodayHints && outOfSeason && "opacity-55",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-muted/70 grid place-items-center text-2xl shrink-0">
          {plant.emoji}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-sm font-medium tracking-tight truncate min-w-0">
            {plant.name}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {showTodayHints ? (
              <>
                {canSowNow ? (
                  <Badge
                    variant="secondary"
                    className="h-auto min-h-5 shrink-0 px-1.5 py-0.5 text-[9px] font-mono uppercase leading-none tracking-wide whitespace-nowrap bg-[var(--sage)]/15 text-[var(--sage)] border border-[var(--sage)]/30 overflow-visible"
                    title="In questo mese puoi seminare"
                  >
                    semina
                  </Badge>
                ) : null}
                {canTransplantNow ? (
                  <Badge
                    variant="secondary"
                    className="h-auto min-h-5 shrink-0 px-1.5 py-0.5 text-[9px] font-mono uppercase leading-none tracking-wide whitespace-nowrap bg-[var(--ochre)]/15 text-[var(--ochre)] border border-[var(--ochre)]/30 overflow-visible"
                    title="In questo mese puoi trapiantare"
                  >
                    trapianto
                  </Badge>
                ) : null}
                {!canSowNow && !canTransplantNow ? (
                  <Badge
                    variant="outline"
                    className="h-auto min-h-5 shrink-0 px-1.5 py-0.5 text-[9px] font-mono uppercase leading-none tracking-wide whitespace-nowrap text-muted-foreground/80 overflow-visible"
                    title="Questo mese non è indicato per semina o trapianto"
                  >
                    non oggi
                  </Badge>
                ) : null}
              </>
            ) : (
              <>
                {sowingLabel ? (
                  <Badge
                    variant="secondary"
                    className="h-auto min-h-5 shrink-0 px-1.5 py-0.5 text-[9px] font-mono uppercase leading-none tracking-wide whitespace-nowrap bg-[var(--sage)]/15 text-[var(--sage)] border border-[var(--sage)]/30 overflow-visible"
                    title={`Semina: ${sowingLabel}`}
                  >
                    sem {sowingLabel}
                  </Badge>
                ) : null}
                {transplantLabel ? (
                  <Badge
                    variant="secondary"
                    className="h-auto min-h-5 shrink-0 px-1.5 py-0.5 text-[9px] font-mono uppercase leading-none tracking-wide whitespace-nowrap bg-[var(--ochre)]/15 text-[var(--ochre)] border border-[var(--ochre)]/30 overflow-visible"
                    title={`Trapianto: ${transplantLabel}`}
                  >
                    trap {transplantLabel}
                  </Badge>
                ) : null}
              </>
            )}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground truncate">
            {plant.category}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              quickAdd();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              "size-8 rounded-lg border border-border bg-muted/50 text-muted-foreground grid place-items-center transition-colors hover:bg-primary hover:text-primary-foreground hover:border-primary",
              draggable && "sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100",
            )}
            aria-label={`Aggiungi ${plant.name} all'aiuola`}
          >
            <Plus className="size-3.5" />
          </button>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Tooltip>
            <TooltipTrigger asChild>
              <span aria-label={`Sole: ${plant.sun}`}>
                <SunIcon className="size-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="left">
              {plant.sun === "full"
                ? "Pieno sole"
                : plant.sun === "partial"
                  ? "Mezzombra"
                  : "Ombra"}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span aria-label={WATER_LABEL[plant.water]}>
                {plant.water === "high" ? (
                  <Droplets className="size-3.5" />
                ) : (
                  <Droplet
                    className={cn(
                      "size-3.5",
                      plant.water === "low" && "opacity-40",
                    )}
                  />
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent side="left">{WATER_LABEL[plant.water]}</TooltipContent>
          </Tooltip>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
        <span>{perCellLabel}</span>
        {showTodayHints ? (
          <span className="opacity-70">
            {outOfSeason
              ? "fuori stagione"
              : canSowNow || canTransplantNow
                ? "utilizzabile ora"
                : "non ora"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
