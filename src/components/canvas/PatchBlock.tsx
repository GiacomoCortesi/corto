"use client";

import * as React from "react";
import { useDndContext, useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { Bed, PlantPatch } from "@/lib/types";
import {
  type PlantSeasonMode,
  MONTHS_LONG,
  plantById,
} from "@/lib/data/plants";
import { useGardenStore } from "@/lib/store";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GripVertical, X } from "lucide-react";
import {
  arrangementLabel,
  patchDensitySummaryForUI,
  patchEffectiveArrangement,
  patchPlantCount,
  patchRectPx,
  patchSpacingCm,
} from "@/lib/utils/spacing";
import { patchSizeFromResizeDelta } from "@/lib/utils/geometry";
import { toast } from "sonner";

type Props = {
  bedId: string;
  bed: Bed;
  patch: PlantPatch;
  relation?: "good" | "bad" | "none";
  outOfSeason?: boolean;
  /** 1-12: season filter month, or calendar month when the filter is off. */
  seasonMonth: number;
  /** Cell background: color based on sowing/harvest for that month. */
  seasonMode: PlantSeasonMode;
};

function seasonModeHint(mode: PlantSeasonMode, month: number): string {
  const m = MONTHS_LONG[month - 1] ?? "—";
  switch (mode) {
    case "sowing":
      return `In ${m} è periodo di semina.`;
    case "transplanting":
      return `In ${m} è periodo di trapianto.`;
    case "harvest":
      return `In ${m} è periodo di raccolta.`;
    case "sowing+transplanting":
      return `In ${m} semina e trapianto.`;
    case "sowing+harvest":
      return `In ${m} semina e raccolto.`;
    case "transplanting+harvest":
      return `In ${m} trapianto e raccolto.`;
    case "all":
      return `In ${m} semina, trapianto e raccolto.`;
    case "none":
      return `In ${m} non c'è semina, trapianto o raccolto in scheda.`;
  }
}

export function PatchBlock({
  bedId,
  bed,
  patch,
  relation = "none",
  outOfSeason = false,
  seasonMonth,
  seasonMode,
}: Props) {
  const setSelection = useGardenStore((s) => s.setSelection);
  const removePatch = useGardenStore((s) => s.removePatch);
  const resizePatchCm = useGardenStore((s) => s.resizePatchCm);
  const selection = useGardenStore((s) => s.selection);

  const [resizePreview, setResizePreview] = React.useState<
    PlantPatch["sizeCm"] | null
  >(null);
  const isResizing = resizePreview !== null;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `patch:${bedId}:${patch.id}`,
    data: { kind: "patch", bedId, patchId: patch.id },
  });

  const { active } = useDndContext();
  const catalogDragActive = Boolean(
    active?.id && String(active.id).startsWith("plant:"),
  );

  const plant = plantById(patch.plantId);
  if (!plant) return null;

  const renderPatch = resizePreview
    ? { ...patch, sizeCm: resizePreview }
    : patch;

  const density = patchDensitySummaryForUI(renderPatch, bed, plant);
  const spacing = patchSpacingCm(renderPatch, plant);
  const arrangement = patchEffectiveArrangement(renderPatch, plant);
  const rect = patchRectPx(renderPatch);
  const count = patchPlantCount(renderPatch, bed, plant);

  const isSelected =
    selection?.kind === "plant" &&
    selection.bedId === bedId &&
    selection.patchId === patch.id;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelection({ kind: "plant", bedId, patchId: patch.id });
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removePatch(bedId, patch.id);
  };

  const onResizePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startSize = { ...patch.sizeCm };
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const delta = { x: ev.clientX - startX, y: ev.clientY - startY };
      const next = patchSizeFromResizeDelta(
        { ...patch, sizeCm: startSize },
        bed,
        delta,
      );
      setResizePreview(next);
    };

    const onEnd = (ev: PointerEvent) => {
      const delta = { x: ev.clientX - startX, y: ev.clientY - startY };
      const next = patchSizeFromResizeDelta(
        { ...patch, sizeCm: startSize },
        bed,
        delta,
      );
      setResizePreview(null);
      const ok = resizePatchCm(bedId, patch.id, next);
      if (!ok) {
        toast.error("Dimensione rifiutata", {
          description: "Sovrappone un altro patch o esce dall'aiuola.",
          duration: 1800,
        });
      }
      handle.releasePointerCapture(ev.pointerId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
  };

  const isMulti = count > 1;

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      className={cn(
        "group relative rounded-md border-0 transition-[opacity,box-shadow] duration-150",
        "flex flex-col items-center justify-center select-none cursor-pointer overflow-hidden",
        seasonMode === "none" && "bg-card",
        seasonMode === "sowing" && "bg-[var(--sage-soft)]",
        seasonMode === "transplanting" && "bg-[var(--ochre-soft)]",
        seasonMode === "harvest" && "bg-[var(--terracotta-soft)]",
        seasonMode === "sowing+transplanting" &&
          "bg-gradient-to-br from-[var(--sage-soft)] to-[var(--ochre-soft)]",
        seasonMode === "sowing+harvest" &&
          "bg-gradient-to-br from-[var(--sage-soft)] to-[var(--terracotta-soft)]",
        seasonMode === "transplanting+harvest" &&
          "bg-gradient-to-br from-[var(--ochre-soft)] to-[var(--terracotta-soft)]",
        seasonMode === "all" &&
          "bg-gradient-to-br from-[var(--sage-soft)] via-[var(--ochre-soft)] to-[var(--terracotta-soft)]",
        relation === "good" && "ring-2 ring-[var(--sage)]/60",
        relation === "bad" && "ring-2 ring-[var(--terracotta)]/70",
        isSelected && "ring-2 ring-primary",
        outOfSeason && "opacity-40",
        isDragging && "opacity-30 ring-2 ring-primary",
        isResizing && "ring-2 ring-primary/70",
        catalogDragActive && "pointer-events-none",
      )}
      style={{
        position: "absolute",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        zIndex: isDragging || isResizing ? 30 : 2,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        transition: "none",
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center justify-center gap-0.5 px-1 pointer-events-auto w-full h-full">
            <span
              className="leading-none"
              style={{
                fontSize: isMulti ? "1.75rem" : "1.5rem",
              }}
              aria-hidden
            >
              {plant.emoji}
            </span>
            <span className="text-[8px] font-mono uppercase tracking-wide text-muted-foreground truncate max-w-full">
              {plant.name.slice(0, 8)}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="font-medium">{plant.name}</div>
          <div className="text-[10px] opacity-70">
            {plant.scientific ?? "—"}
          </div>
          <div className="mt-1 text-[10px] font-mono tabular-nums leading-snug">
            {density.showTotalLessThanOne ? (
              <>
                &lt;1 pianta (densità) ·{" "}
                {Math.round(density.displayFootprint.widthCm)}×
                {Math.round(density.displayFootprint.heightCm)} cm
              </>
            ) : (
              <>
                {density.totalPlants}{" "}
                {density.totalPlants === 1 ? "pianta" : "piante"} (densità) ·{" "}
                {Math.round(density.displayFootprint.widthCm)}×
                {Math.round(density.displayFootprint.heightCm)} cm
              </>
            )}
          </div>
          <div className="text-[10px] font-mono tabular-nums text-muted-foreground leading-snug">
            {spacing} cm · {arrangementLabel(arrangement)}
          </div>
          <div className="mt-1.5 border-t border-background/25 pt-1.5 text-[10px] leading-snug opacity-95">
            {seasonModeHint(seasonMode, seasonMonth)}
          </div>
        </TooltipContent>
      </Tooltip>

      {isMulti ? (
        <span className="absolute bottom-0.5 right-1 text-[8px] font-mono tabular-nums text-muted-foreground/80 pointer-events-none">
          {Math.round(density.displayFootprint.widthCm)}×
          {Math.round(density.displayFootprint.heightCm)}cm
        </span>
      ) : null}

      {/* Drag handle - only this small grip area initiates a move so that
          clicking the body still selects the patch (and the X removes it). */}
      <button
        type="button"
        {...listeners}
        {...attributes}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "absolute top-0.5 left-0.5 size-4 rounded bg-card/80 border border-border/60 text-muted-foreground",
          "hover:text-foreground hover:border-border opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity",
          "grid place-items-center cursor-grab active:cursor-grabbing",
          isDragging && "opacity-100",
          isSelected && "opacity-100",
        )}
        aria-label="Trascina patch"
      >
        <GripVertical className="size-2.5" />
      </button>

      <button
        type="button"
        onPointerDown={onResizePointerDown}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "absolute bottom-0 right-0 z-10 size-3 translate-x-1/2 translate-y-1/2",
          "rounded-sm bg-card/90 cursor-se-resize nodrag nopan shadow-sm",
          "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity",
          isSelected && "opacity-100",
          isResizing && "opacity-100",
        )}
        aria-label="Ridimensiona patch"
      />

      <button
        type="button"
        onClick={handleRemove}
        className={cn(
          "absolute top-0.5 right-0.5 size-4 rounded-full bg-card border border-border text-muted-foreground",
          "hover:text-destructive hover:border-destructive opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity",
          "grid place-items-center",
          isSelected && "opacity-100"
        )}
        aria-label="Rimuovi pianta"
      >
        <X className="size-2.5" />
      </button>
    </div>
  );
}
