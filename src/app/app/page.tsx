"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Topbar } from "@/components/topbar/Topbar";
import { PlantCatalog } from "@/components/sidebar/PlantCatalog";
import { RightPanel } from "@/components/panels/RightPanel";
import { SetupWizard } from "@/components/dialogs/SetupWizard";
import { useGardenStore } from "@/lib/store";
import { plantById } from "@/lib/data/plants";
import { cellIndexToAnchor } from "@/lib/utils/spacing";
import { toast } from "sonner";
import { Sprout } from "lucide-react";
import { track } from "@/lib/analytics";

const GardenCanvas = dynamic(
  () => import("@/components/canvas/GardenCanvas").then((m) => m.GardenCanvas),
  { ssr: false, loading: () => <div className="flex-1 bg-[var(--canvas-bg)]" /> }
);

export default function AppPage() {
  const initialized = useGardenStore((s) => s.initialized);
  const initGarden = useGardenStore((s) => s.initGarden);
  const resetGarden = useGardenStore((s) => s.resetGarden);
  const beds = useGardenStore((s) => s.beds);
  const addBed = useGardenStore((s) => s.addBed);
  const addPlantToBed = useGardenStore((s) => s.addPlantToBed);
  const movePatch = useGardenStore((s) => s.movePatch);
  const undo = useGardenStore((s) => s.undo);
  const redo = useGardenStore((s) => s.redo);

  const canvasRef = React.useRef<HTMLDivElement>(null);

  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => {
    setHydrated(true);
    track("app_open");
  }, []);

  const [activePlantId, setActivePlantId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    })
  );

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    if (id.startsWith("plant:")) {
      setActivePlantId(id.slice("plant:".length));
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActivePlantId(null);
    const { active, over } = e;
    const activeId = String(active.id);
    if (!over) return;

    const overId = String(over.id);
    if (!overId.startsWith("cell:")) return;
    const data = over.data.current as { bedId?: string; cellIndex?: number } | undefined;
    if (!data?.bedId || data.cellIndex === undefined) return;

    // Drag to move an existing patch
    if (activeId.startsWith("patch:")) {
      const [, dragBedId, patchId] = activeId.split(":");
      if (!dragBedId || !patchId) return;
      if (dragBedId !== data.bedId) {
        toast.error("Sposta solo all'interno della stessa aiuola");
        return;
      }
      const bed = useGardenStore.getState().beds.find((b) => b.id === dragBedId);
      if (!bed) return;
      const anchor = cellIndexToAnchor(data.cellIndex, bed.cols);
      const moved = movePatch(dragBedId, patchId, anchor);
      if (!moved) {
        toast.error("Spazio non disponibile", {
          description: "Il patch non entra o si sovrappone a un altro.",
        });
      }
      return;
    }

    // Drag a new plant from the catalog
    const plantId = (active.data.current as { plantId?: string } | undefined)?.plantId;
    if (!plantId) return;

    const result = addPlantToBed(data.bedId, plantId, data.cellIndex);
    const plant = plantById(plantId);
    if (result && plant) {
      toast.success(`${plant.emoji} ${plant.name} piantato`, {
        description: "Trascina ancora per riempire l'aiuola.",
        duration: 1800,
      });
    } else if (!result) {
      toast.error("Spazio non disponibile", {
        description: "Sovrappone un altro patch o esce dall'aiuola.",
      });
    }
  };

  // Keyboard shortcuts: Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z redo
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const key = e.key.toLowerCase();
      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  // Show wizard if not initialized (and persisted state has hydrated)
  const showWizard = hydrated && !initialized;

  return (
    <div className="flex flex-col h-dvh">
      <Topbar canvasRef={canvasRef} onReset={resetGarden} />

      {hydrated ? (
        <DndContext
          id="corto-dnd"
          sensors={sensors}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="flex-1 min-h-0 flex">
            <PlantCatalog />
            <main className="flex-1 min-w-0 flex flex-col">
              <GardenCanvas innerRef={canvasRef} />
            </main>
            <RightPanel />
          </div>

          <DragOverlay dropAnimation={null}>
            {activePlantId ? <DragPreview plantId={activePlantId} /> : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="flex-1 min-h-0 grid place-items-center bg-[var(--canvas-bg)]">
          <div className="flex items-center gap-2 text-sm text-muted-foreground fade-in-up">
            <Sprout className="size-4 text-primary animate-pulse" />
            Carico l&apos;orto…
          </div>
        </div>
      )}

      <SetupWizard
        open={showWizard}
        onComplete={(name, sun, location) => {
          initGarden(name, sun, location);
          track("onboarding_complete", {
            hasLocation: Boolean(location),
            sun: sun,
          });
          // Seed: create one bed so the user has somewhere to drop
          requestAnimationFrame(() => {
            if (useGardenStore.getState().beds.length === 0) {
              addBed({ x: 200, y: 140 });
            }
          });
          toast.success("Orto pronto!", {
            description: "Trascina le piante dal catalogo nelle celle.",
          });
        }}
      />

      {/* Hint when first bed exists */}
      {hydrated && initialized && beds.length === 1 && beds[0].patches.length === 0 ? (
        <div className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 z-20 fade-in-up">
          <div className="rounded-full border border-primary/25 bg-card/90 backdrop-blur px-4 py-2 text-xs flex items-center gap-2 shadow-sm ring-1 ring-primary/10">
            <Sprout className="size-3.5 text-primary" />
            Trascina una pianta dal catalogo dentro l&apos;aiuola
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DragPreview({ plantId }: { plantId: string }) {
  const plant = plantById(plantId);
  if (!plant) return null;
  return (
    <div className="rounded-xl border border-primary/60 bg-card shadow-lg ring-2 ring-primary/20 px-3 py-2 flex items-center gap-2 cursor-grabbing">
      <span className="text-xl">{plant.emoji}</span>
      <span className="text-sm font-medium">{plant.name}</span>
    </div>
  );
}

