import { useGardenStore } from "@/lib/store";
import { plantById } from "@/lib/data/plants";
import { defaultPatchSizeCm, quantizeCm } from "@/lib/utils/geometry";
import { toast } from "sonner";

/** Scan step when searching for free space in quick-add (cm). */
const QUICK_ADD_SCAN_STEP_CM = 5;
const GEOMETRY_EPS = 0.01;

type PlantRef = { id: string; emoji: string; name: string };

export type QuickAddBatchResult = {
  added: PlantRef[];
  failed: PlantRef[];
  createdBed: boolean;
};

function bedIdsForQuickAdd(): string[] {
  const state = useGardenStore.getState();
  const selectedBedId = state.selection?.kind === "bed" ? state.selection.bedId : undefined;
  return [
    ...(selectedBedId ? [selectedBedId] : []),
    ...state.beds.map((b) => b.id).filter((id) => id !== selectedBedId),
  ];
}

/** Tries to place one plant in the first free slot; does not show toasts. */
export function tryQuickAddPlantToGarden(plant: PlantRef): boolean {
  const state = useGardenStore.getState();
  const bedIds = bedIdsForQuickAdd();

  for (const bedId of bedIds) {
    const bed = useGardenStore.getState().beds.find((b) => b.id === bedId);
    if (!bed) continue;
    const species = plantById(plant.id);
    if (!species) continue;
    const size = defaultPatchSizeCm(species.defaultSpacingCm);

    for (let y = 0; y <= bed.heightCm - size.height + GEOMETRY_EPS; y += QUICK_ADD_SCAN_STEP_CM) {
      for (let x = 0; x <= bed.widthCm - size.width + GEOMETRY_EPS; x += QUICK_ADD_SCAN_STEP_CM) {
        const placed = useGardenStore.getState().addPatch(bedId, {
          plantId: plant.id,
          positionCm: { x: quantizeCm(x), y: quantizeCm(y) },
        });
        if (placed) return true;
      }
    }
  }

  if (state.beds.length === 0) {
    const newBedId = state.addBed();
    return Boolean(
      useGardenStore.getState().addPatch(newBedId, {
        plantId: plant.id,
        positionCm: { x: 0, y: 0 },
      }),
    );
  }

  return false;
}

export function quickAddPlantToGarden(
  plant: PlantRef,
  options?: { onAdded?: () => void },
): boolean {
  const state = useGardenStore.getState();
  const hadBeds = state.beds.length > 0;
  const placed = tryQuickAddPlantToGarden(plant);

  if (placed) {
    const createdBed = !hadBeds;
    toast.success(`${plant.emoji} ${plant.name} piantato`, {
      description: createdBed
        ? "Creata un'aiuola e aggiunta la pianta."
        : "Aggiunto nel primo spazio libero disponibile.",
      duration: createdBed ? 1800 : 1600,
    });
    options?.onAdded?.();
    return true;
  }

  toast.error("Nessuno spazio libero", {
    description: "Non ho trovato uno spazio disponibile in cui il patch possa entrare.",
    duration: 2200,
  });
  return false;
}

export function quickAddPlantsToGarden(
  plants: PlantRef[],
  options?: { onAdded?: () => void },
): QuickAddBatchResult {
  const state = useGardenStore.getState();
  const hadBeds = state.beds.length > 0;
  const added: PlantRef[] = [];
  const failed: PlantRef[] = [];

  for (const plant of plants) {
    if (tryQuickAddPlantToGarden(plant)) {
      added.push(plant);
    } else {
      failed.push(plant);
    }
  }

  const createdBed = !hadBeds && added.length > 0;

  if (added.length > 0 && failed.length === 0) {
    const names = added.map((p) => `${p.emoji} ${p.name}`).join(", ");
    toast.success(
      added.length === 1 ? `${added[0]!.emoji} ${added[0]!.name} piantato` : `${added.length} piante aggiunte`,
      {
        description:
          added.length === 1
            ? createdBed
              ? "Creata un'aiuola e aggiunta la pianta."
              : "Aggiunto nel primo spazio libero disponibile."
            : createdBed
              ? `Creata un'aiuola: ${names}.`
              : names,
        duration: 2200,
      },
    );
    options?.onAdded?.();
  } else if (added.length > 0) {
    toast.warning(`${added.length} aggiunte, ${failed.length} senza spazio`, {
      description: `Non c'era posto per: ${failed.map((p) => p.name).join(", ")}.`,
      duration: 2800,
    });
    options?.onAdded?.();
  } else if (plants.length > 0) {
    toast.error("Nessuno spazio libero", {
      description: "Non ho trovato spazio per le piante selezionate.",
      duration: 2200,
    });
  }

  return { added, failed, createdBed };
}
