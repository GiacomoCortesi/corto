import type { GardenActivityKind } from "@/lib/types";

export const ACTIVITY_KIND_ORDER: GardenActivityKind[] = [
  "sowing",
  "weeding",
  "watering",
  "transplanting",
  "treatment",
  "harvest",
  "note",
  "other",
];

export const ACTIVITY_KIND_LABEL: Record<GardenActivityKind, string> = {
  sowing: "Semina",
  weeding: "Sarchiatura / diserbo",
  watering: "Annaffiatura",
  transplanting: "Trapianto",
  treatment: "Trattamento",
  harvest: "Raccolta",
  note: "Nota",
  other: "Altro",
};

export const ACTIVITY_KIND_EMOJI: Record<GardenActivityKind, string> = {
  sowing: "🌱",
  weeding: "⛏️",
  watering: "💧",
  transplanting: "🪴",
  treatment: "🧪",
  harvest: "🧺",
  note: "📝",
  other: "📌",
};
