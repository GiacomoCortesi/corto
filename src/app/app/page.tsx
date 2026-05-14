"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Topbar } from "@/components/topbar/Topbar";
import { PlantCatalog } from "@/components/sidebar/PlantCatalog";
import { RightPanel } from "@/components/panels/RightPanel";
import { SetupWizard } from "@/components/dialogs/SetupWizard";
import { useGardenStore } from "@/lib/store";
import { plantById } from "@/lib/data/plants";
import {
  resolveCatalogDropPositionCm,
  resolveDropBedId,
} from "@/lib/utils/drag-drop";
import { patchPositionFromDragDelta } from "@/lib/utils/spacing";
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
  const addPlantToBedAtCm = useGardenStore((s) => s.addPlantToBedAtCm);
  const movePatchCm = useGardenStore((s) => s.movePatchCm);
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
    const { active, delta } = e;
    const activeId = String(active.id);

    if (activeId.startsWith("patch:")) {
      const [, dragBedId, patchId] = activeId.split(":");
      if (!dragBedId || !patchId) return;
      const bed = useGardenStore.getState().beds.find((b) => b.id === dragBedId);
      if (!bed) return;
      const patch = bed.patches.find((p) => p.id === patchId);
      if (!patch) return;
      const next = patchPositionFromDragDelta(patch, bed, delta);
      const moved = movePatchCm(dragBedId, patchId, next);
      if (!moved) {
        toast.error("Spazio non disponibile", {
          description: "Il patch non entra o si sovrappone a un altro.",
        });
      }
      return;
    }

    if (activeId.startsWith("plant:")) {
      const plantId = (active.data.current as { plantId?: string } | undefined)
        ?.plantId;
      if (!plantId) return;

      const bedId = resolveDropBedId(e);
      if (!bedId) return;

      const bed = useGardenStore.getState().beds.find((b) => b.id === bedId);
      if (!bed) return;

      const positionCm = resolveCatalogDropPositionCm(e, bed, plantId);
      if (!positionCm) return;

      const result = addPlantToBedAtCm(bedId, plantId, positionCm);
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
      {hydrated ? (
        <DndContext
          id="corto-dnd"
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <Topbar canvasRef={canvasRef} onReset={resetGarden} />

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

