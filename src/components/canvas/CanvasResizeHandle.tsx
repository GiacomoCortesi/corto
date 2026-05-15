"use client";

import { cn } from "@/lib/utils";

type Props = {
  visible: boolean;
  active?: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  "aria-label": string;
};

const CORNER_INSET_PX = 2;
const ARC_GAP_PX = 3;

/**
 * SE corner: two borders with the same radius as the patch (`rounded-md`),
 * inset so both curves stay parallel to the block border.
 */
export function CanvasResizeHandle({
  visible,
  active = false,
  onPointerDown,
  "aria-label": ariaLabel,
}: Props) {
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onClick={(e) => e.stopPropagation()}
      aria-label={ariaLabel}
      className={cn(
        "absolute bottom-0 right-0 z-20",
        "cursor-se-resize touch-none touch-manipulation",
        "transition-opacity",
        visible
          ? "opacity-100"
          : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
      )}
      style={{
        width: `calc(var(--radius-md) + 14px)`,
        height: `calc(var(--radius-md) + 14px)`,
      }}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute box-border",
          "border-b-[1.5px] border-r-[1.5px] border-primary/50",
          active && "border-primary",
        )}
        style={{
          right: CORNER_INSET_PX,
          bottom: CORNER_INSET_PX,
          width: `calc(var(--radius-md) - ${CORNER_INSET_PX}px)`,
          height: `calc(var(--radius-md) - ${CORNER_INSET_PX}px)`,
          borderBottomRightRadius: `calc(var(--radius-md) - ${CORNER_INSET_PX}px)`,
        }}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute box-border",
          "border-b border-r border-primary/35",
          active && "border-primary/75",
        )}
        style={{
          right: CORNER_INSET_PX + ARC_GAP_PX,
          bottom: CORNER_INSET_PX + ARC_GAP_PX,
          width: `calc(var(--radius-md) - ${CORNER_INSET_PX + ARC_GAP_PX}px)`,
          height: `calc(var(--radius-md) - ${CORNER_INSET_PX + ARC_GAP_PX}px)`,
          borderBottomRightRadius: `calc(var(--radius-md) - ${CORNER_INSET_PX + ARC_GAP_PX}px)`,
        }}
      />
    </button>
  );
}
