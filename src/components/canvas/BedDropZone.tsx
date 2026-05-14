"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

type Props = {
  bedId: string;
};

export function BedDropZone({ bedId }: Props) {
  const { isOver, setNodeRef, active } = useDroppable({
    id: `bed:${bedId}`,
    data: { kind: "bed", bedId },
  });

  const isPlantDrag = Boolean(
    active?.id && String(active.id).startsWith("plant:"),
  );

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute inset-0 transition-[box-shadow,background-color] duration-150",
        isPlantDrag &&
          isOver &&
          "bg-primary/15 ring-2 ring-inset ring-primary/50",
      )}
      style={{ zIndex: 1 }}
      aria-hidden
    />
  );
}
