"use client";

import * as React from "react";
import { NodeProps, NodeResizeControl } from "@xyflow/react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Trash2, Grid3x3, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGardenStore } from "@/lib/store";
import type { Bed } from "@/lib/types";
import { BedPlotArea } from "@/components/canvas/BedPlotArea";
import { patchRelationsForBed } from "@/lib/utils/companions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PlantTypeSummary } from "@/components/panels/PlantTypeSummary";
import { bedPlotSizePx, PX_PER_CM } from "@/lib/utils/spacing";

const HEADER_PX = 40;

type BedNodeData = { bed: Bed };

export function BedNode({ data, id, selected }: NodeProps & { data: BedNodeData }) {
  const bed = data.bed;
  const renameBed = useGardenStore((s) => s.renameBed);
  const removeBed = useGardenStore((s) => s.removeBed);
  const setSelection = useGardenStore((s) => s.setSelection);
  const seasonFilter = useGardenStore((s) => s.seasonFilter);

  const [name, setName] = React.useState(bed.name);
  React.useEffect(() => setName(bed.name), [bed.name]);

  const plotSize = bedPlotSizePx(bed);

  const conflictsCount = React.useMemo(() => {
    let bad = 0;
    patchRelationsForBed(bed).forEach((v) => {
      if (v === "bad") bad++;
    });
    return bad;
  }, [bed]);

  const commitName = () => {
    const next = name.trim() || bed.name;
    if (next !== bed.name) renameBed(bed.id, next);
    setName(next);
  };

  return (
    <Card
      className={cn(
        "rounded-2xl gap-0 py-0 shadow-sm transition-shadow duration-200",
        "border-border bg-card",
        "hover:shadow-md",
        selected && "ring-2 ring-primary shadow-lg",
        conflictsCount > 0 && !selected && "ring-1 ring-[var(--terracotta)]/50",
      )}
      onClick={() => setSelection({ kind: "bed", bedId: bed.id })}
      style={{ width: plotSize.width }}
    >
      <div className="bed-drag-handle h-10 px-3 flex items-center gap-2 border-b border-border cursor-grab active:cursor-grabbing">
        <Grid3x3 className="size-3.5 text-muted-foreground shrink-0" />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="h-6 px-1 border-transparent bg-transparent text-xs font-medium shadow-none hover:bg-muted/60 focus-visible:bg-background focus-visible:border-input"
          aria-label="Nome aiuola"
        />
        <span
          className="text-[10px] font-mono text-muted-foreground tabular-nums shrink-0"
          title={`${bed.widthCm}×${bed.heightCm} cm`}
        >
          {(bed.widthCm / 100).toFixed(2)}×
          {(bed.heightCm / 100).toFixed(2)} m
        </span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-foreground shrink-0"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              aria-label="Riepilogo aiuola"
            >
              <Info className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-72"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <PlantTypeSummary
              beds={[bed]}
              title={bed.name}
              subtitle="Riepilogo per tipo"
            />
          </PopoverContent>
        </Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-destructive shrink-0"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                removeBed(bed.id);
              }}
              aria-label="Elimina aiuola"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Elimina aiuola</TooltipContent>
        </Tooltip>
      </div>

      <BedPlotArea
        bed={bed}
        nodeId={id}
        seasonFilter={seasonFilter}
      />

      {conflictsCount > 0 ? (
        <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wide text-[var(--terracotta)]">
          {conflictsCount} {conflictsCount === 1 ? "conflitto" : "conflitti"} di vicinato
        </div>
      ) : null}

      <NodeResizeControl
        style={{ display: "none" }}
        minWidth={0}
        minHeight={0}
      />
    </Card>
  );
}

export const BED_NODE_DIMENSIONS = { PX_PER_CM, HEADER_PX };
