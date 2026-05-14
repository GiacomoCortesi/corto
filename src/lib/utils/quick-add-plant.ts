import { useGardenStore } from "@/lib/store";
import { plantById } from "@/lib/data/plants";
import { defaultPatchSizeCm, quantizeCm } from "@/lib/utils/geometry";
import { toast } from "sonner";

/** Scan step when searching for free space in quick-add (cm). */
const QUICK_ADD_SCAN_STEP_CM = 5;

type PlantRef = { id: string; emoji: string; name: string };

export function quickAddPlantToGarden(
  plant: PlantRef,
  options?: { onAdded?: () => void },
): boolean {
  const state = useGardenStore.getState();
  const selectedBedId = state.selection?.kind === "bed" ? state.selection.bedId : undefined;
  const bedIds = [
    ...(selectedBedId ? [selectedBedId] : []),
    ...state.beds.map((b) => b.id).filter((id) => id !== selectedBedId),
  ];

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
        if (placed) {
          toast.success(`${plant.emoji} ${plant.name} piantato`, {
            description: "Aggiunto nel primo spazio libero disponibile.",
            duration: 1600,
          });
          options?.onAdded?.();
          return true;
        }
      }
    }
  }

  if (state.beds.length === 0) {
    const newBedId = state.addBed();
    const placed = useGardenStore.getState().addPatch(newBedId, {
      plantId: plant.id,
      positionCm: { x: 0, y: 0 },
    });
    if (placed) {
      toast.success(`${plant.emoji} ${plant.name} piantato`, {
        description: "Creata un'aiuola e aggiunta la pianta.",
        duration: 1800,
      });
      options?.onAdded?.();
      return true;
    }
  }

  toast.error("Nessuno spazio libero", {
    description: "Non ho trovato uno spazio disponibile in cui il patch possa entrare.",
    duration: 2200,
  });
  return false;
}

const GEOMETRY_EPS = 0.01;
