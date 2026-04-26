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
import { useDndContext } from "@dnd-kit/core";
import { DroppableCell } from "@/components/canvas/DroppableCell";
import { PatchBlock } from "@/components/canvas/PatchBlock";
import { patchRelationsForBed } from "@/lib/utils/companions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PlantTypeSummary } from "@/components/panels/PlantTypeSummary";
import {
  plantActiveInMonth,
  plantById,
  plantSeasonModeForMonth,
} from "@/lib/data/plants";
import {
  PX_PER_CM,
  bedCellSizeCm,
  bedCellSizePx,
  patchCellRect,
} from "@/lib/utils/spacing";

const PADDING_PX = 12;
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

  const patchRelations = React.useMemo(() => patchRelationsForBed(bed), [bed]);

  // Track the patch currently being dragged (if any). When the user drags
  // a patch over the bed, we want its own cells to remain droppable so it
  // can be dropped on its current position or overlapping its old footprint.
  const { active } = useDndContext();
  const movingPatchId = React.useMemo(() => {
    const id = active?.id ? String(active.id) : "";
    if (!id.startsWith("patch:")) return null;
    const [, dragBedId, patchId] = id.split(":");
    return dragBedId === bed.id ? patchId : null;
  }, [active, bed.id]);

  const coveredCells = React.useMemo(() => {
    const set = new Set<number>();
    for (const patch of bed.patches) {
      if (patch.id === movingPatchId) continue;
      const plant = plantById(patch.plantId);
      if (!plant) continue;
      const rect = patchCellRect(patch, bed, plant);
      for (let row = rect.row0; row <= rect.row1; row++) {
        for (let col = rect.col0; col <= rect.col1; col++) {
          if (row < 0 || col < 0 || row >= bed.rows || col >= bed.cols) continue;
          set.add(row * bed.cols + col);
        }
      }
    }
    return set;
  }, [bed, movingPatchId]);

  // Cell size derived from the bed's metric cellSizeCm. Patches are still
  // positioned on the cell grid via CSS Grid spanning, so changing
  // cellSizeCm scales the entire bed proportionally without breaking
  // patch placement. PADDING_PX stays a fixed UI gutter.
  const cellPx = bedCellSizePx(bed);

  const conflictsCount = React.useMemo(() => {
    let bad = 0;
    patchRelations.forEach((v) => {
      if (v === "bad") bad++;
    });
    return bad;
  }, [patchRelations]);

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
      style={{ minWidth: bed.cols * cellPx + PADDING_PX * 2 }}
    >
      {/* Drag handle (header) */}
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
          title={`${bed.cols}×${bed.rows} celle da ${bedCellSizeCm(bed)} cm`}
        >
          {(bed.cols * bedCellSizeCm(bed) / 100).toFixed(2)}×
          {(bed.rows * bedCellSizeCm(bed) / 100).toFixed(2)} m
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

      {/* Body */}
      <div
        className="p-3 grid gap-1.5 nodrag nopan"
        style={{
          gridTemplateColumns: `repeat(${bed.cols}, ${cellPx}px)`,
          gridTemplateRows: `repeat(${bed.rows}, ${cellPx}px)`,
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {Array.from({ length: bed.cols * bed.rows }, (_, idx) => {
          if (coveredCells.has(idx)) return null;
          const col = idx % bed.cols;
          const row = Math.floor(idx / bed.cols);
          return (
            <DroppableCell
              key={`${id}-cell-${idx}`}
              bedId={bed.id}
              cellIndex={idx}
              style={{
                gridColumn: col + 1,
                gridRow: row + 1,
              }}
            />
          );
        })}

        {bed.patches.map((patch) => {
          const plant = plantById(patch.plantId);
          const outOfSeason =
            seasonFilter !== null &&
            plant != null &&
            !plantActiveInMonth(plant, seasonFilter);
          const effectiveMonth =
            seasonFilter ?? new Date().getMonth() + 1;
          const seasonMode =
            plant != null
              ? plantSeasonModeForMonth(plant, effectiveMonth)
              : "none";
          return (
            <PatchBlock
              key={`${id}-patch-${patch.id}`}
              bedId={bed.id}
              bed={bed}
              patch={patch}
              relation={patchRelations.get(patch.id) ?? "none"}
              outOfSeason={outOfSeason}
              seasonMonth={effectiveMonth}
              seasonMode={seasonMode}
            />
          );
        })}
      </div>

      {conflictsCount > 0 ? (
        <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wide text-[var(--terracotta)]">
          {conflictsCount} {conflictsCount === 1 ? "conflitto" : "conflitti"} di vicinato
        </div>
      ) : null}

      {/* Hide default resize control; sizing handled via right panel */}
      <NodeResizeControl
        style={{ display: "none" }}
        minWidth={0}
        minHeight={0}
      />
    </Card>
  );
}

export const BED_NODE_DIMENSIONS = { PX_PER_CM, PADDING_PX, HEADER_PX };
