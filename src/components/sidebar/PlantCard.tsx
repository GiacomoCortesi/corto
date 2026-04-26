"use client";

import * as React from "react";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { useGardenStore } from "@/lib/store";
import { cellSizeForCatalog, perCellLabelForCellSize } from "@/lib/utils/spacing";
import type { Plant } from "@/lib/types";
import { Sun, CloudSun, CloudMoon, Droplet, Droplets } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = {
  plant: Plant;
  index: number;
  outOfSeason?: boolean;
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

export function PlantCard({ plant, index, outOfSeason }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `plant:${plant.id}`,
    data: { plantId: plant.id },
  });

  const perCellLabel = useGardenStore((s) =>
    perCellLabelForCellSize(plant, cellSizeForCatalog(s.beds, s.selection)),
  );

  const SunIcon = SUN_ICON[plant.sun];
  const calendarMonth = new Date().getMonth() + 1;
  const canSowNow = plant.sowing.includes(calendarMonth);
  const canTransplantNow = (plant.transplanting ?? []).includes(calendarMonth);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ animationDelay: `${index * 18}ms` }}
      className={cn(
        "group relative rounded-xl border border-border bg-card p-3 cursor-grab active:cursor-grabbing transition-all duration-150",
        "hover:border-primary/40 hover:shadow-sm hover:-translate-y-0.5",
        "fade-in-up",
        isDragging && "opacity-30",
        outOfSeason && "opacity-55",
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
                className="h-auto min-h-5 shrink-0 px-1.5 py-0.5 text-[9px] font-mono uppercase leading-none tracking-wide whitespace-nowrap bg-[var(--sky)]/15 text-[var(--sky)] border border-[var(--sky)]/30 overflow-visible"
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
          </div>
          <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground truncate">
            {plant.category}
          </div>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground shrink-0">
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
      <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
        <span>{perCellLabel}</span>
        <span className="opacity-70">
          {outOfSeason
            ? "fuori stagione"
            : canSowNow || canTransplantNow
              ? "utilizzabile ora"
              : "non ora"}
        </span>
      </div>
    </div>
  );
}
