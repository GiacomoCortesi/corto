"use client";

import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

type Props = {
  bedId: string;
  cellIndex: number;
  style?: React.CSSProperties;
};

export function DroppableCell({ bedId, cellIndex, style }: Props) {
  const { isOver, setNodeRef, active } = useDroppable({
    id: `cell:${bedId}:${cellIndex}`,
    data: { bedId, cellIndex },
  });

  const isDragActive = !!active;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative aspect-square rounded-md border transition-all duration-150",
        "bed-cell-empty border-border/60",
        isDragActive && "border-dashed border-primary/40",
        isOver && "border-primary border-solid bg-primary/10 scale-[1.04]",
      )}
    />
  );
}
