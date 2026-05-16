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
import { X } from "lucide-react";
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
import { CanvasResizeHandle } from "@/components/canvas/CanvasResizeHandle";
import { usePrefersHover } from "@/hooks/usePrefersHover";
import type { Plant } from "@/lib/types";

const TOUCH_TAP_MAX_MS = 280;
const TOUCH_TAP_MAX_PX = 10;

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
  /** Controlled info tooltip (touch); one open patch per bed. */
  infoOpen?: boolean;
  onInfoOpenChange?: (open: boolean) => void;
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

function PatchInfoTooltipContent({
  plant,
  density,
  spacing,
  arrangement,
  seasonMode,
  seasonMonth,
}: {
  plant: Plant;
  density: ReturnType<typeof patchDensitySummaryForUI>;
  spacing: number;
  arrangement: ReturnType<typeof patchEffectiveArrangement>;
  seasonMode: PlantSeasonMode;
  seasonMonth: number;
}) {
  return (
    <>
      <div className="font-medium">{plant.name}</div>
      <div className="text-[10px] opacity-70">{plant.scientific ?? "—"}</div>
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
            {density.totalPlants === 1 ? "pianta " : "piante "}
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
    </>
  );
}

export function PatchBlock({
  bedId,
  bed,
  patch,
  relation = "none",
  outOfSeason = false,
  seasonMonth,
  seasonMode,
  infoOpen = false,
  onInfoOpenChange,
}: Props) {
  const prefersHover = usePrefersHover();
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

  const touchTapRef = React.useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startTime: number;
  } | null>(null);

  const shouldIgnoreTouchTarget = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest("[data-patch-resize-handle]") ||
        target.closest('button[aria-label="Rimuovi pianta"]'),
    );
  };

  React.useEffect(() => {
    if (!prefersHover && (isDragging || isResizing) && infoOpen) {
      onInfoOpenChange?.(false);
    }
  }, [prefersHover, isDragging, isResizing, infoOpen, onInfoOpenChange]);

  const handleTouchPointerDown = (e: React.PointerEvent) => {
    if (prefersHover || e.pointerType !== "touch") return;
    if (shouldIgnoreTouchTarget(e.target)) return;
    touchTapRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now(),
    };
  };

  const handleTouchPointerUp = (e: React.PointerEvent) => {
    if (prefersHover || e.pointerType !== "touch") return;
    if (shouldIgnoreTouchTarget(e.target)) return;
    const tap = touchTapRef.current;
    touchTapRef.current = null;
    if (!tap || tap.pointerId !== e.pointerId || isDragging) return;

    const dt = Date.now() - tap.startTime;
    const dist = Math.hypot(e.clientX - tap.startX, e.clientY - tap.startY);
    if (dt > TOUCH_TAP_MAX_MS || dist > TOUCH_TAP_MAX_PX) return;

    e.stopPropagation();
    setSelection({ kind: "plant", bedId, patchId: patch.id });
    onInfoOpenChange?.(!infoOpen);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    e.stopPropagation();
    if (!prefersHover) return;
    setSelection({ kind: "plant", bedId, patchId: patch.id });
  };

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

  const compactPatch =
    renderPatch.sizeCm.width < 30 || renderPatch.sizeCm.height < 30;
  const showPlantText = !compactPatch;
  const showPatchControls =
    isSelected || isResizing || isDragging || compactPatch;

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

  const dndPointerDown = listeners?.onPointerDown;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onPointerDown={(e) => {
        handleTouchPointerDown(e);
        dndPointerDown?.(e);
      }}
      onPointerUp={handleTouchPointerUp}
      onClick={handleClick}
      className={cn(
        "group relative rounded-md border-0 transition-[opacity,box-shadow] duration-150",
        "flex flex-col items-center justify-center select-none touch-none touch-manipulation",
        "cursor-grab active:cursor-grabbing",
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
        relation === "bad" && "ring-2 ring-[var(--conflict)]/70",
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
      <Tooltip
        {...(prefersHover
          ? {}
          : { open: infoOpen, onOpenChange: onInfoOpenChange })}
      >
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
            {showPlantText ? (
              <span className="text-[8px] font-mono uppercase tracking-wide text-muted-foreground truncate max-w-full">
                {plant.name.slice(0, 8)}
              </span>
            ) : null}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <PatchInfoTooltipContent
            plant={plant}
            density={density}
            spacing={spacing}
            arrangement={arrangement}
            seasonMode={seasonMode}
            seasonMonth={seasonMonth}
          />
        </TooltipContent>
      </Tooltip>

      {isMulti && showPlantText ? (
        <span className="absolute bottom-0.5 left-1 text-[8px] font-mono tabular-nums text-muted-foreground/80 pointer-events-none">
          {Math.round(density.displayFootprint.widthCm)}×
          {Math.round(density.displayFootprint.heightCm)}cm
        </span>
      ) : null}

      <CanvasResizeHandle
        visible={showPatchControls}
        active={isResizing}
        onPointerDown={onResizePointerDown}
        aria-label="Ridimensiona patch"
      />

      {!compactPatch ? (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={handleRemove}
          className={cn(
            "absolute top-0 right-0 z-20 flex size-7 touch-none touch-manipulation",
            "items-start justify-end p-px",
            "transition-opacity",
            showPatchControls
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
          )}
          aria-label="Rimuovi pianta"
        >
          <span className="grid size-5 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-destructive hover:border-destructive">
            <X className="size-3" />
          </span>
        </button>
      ) : null}
    </div>
  );
}
