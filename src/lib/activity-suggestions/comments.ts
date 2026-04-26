import type { ActivityKind } from "@/lib/activity-suggestions/types";

export type WateringCommentSignals = {
  lastWateringDays: number | null;
  intervalDays: number;
  next3dRainMm?: number;
};

export type GenericRecencySignals = {
  lastEventDays: number | null;
  intervalDays: number;
};

export type FertilizerCommentSignals = {
  lastFertilizerDays: number | null;
  intervalDays: number;
  phaseText: string;
};

export function commentMissingEvents(activity: ActivityKind): string {
  if (activity === "innaffiatura") {
    return "Nessun evento di innaffiatura registrato per questa pianta: non posso raccomandare in modo affidabile.";
  }
  if (activity === "sarchiatura") {
    return "Nessun evento di sarchiatura registrato per questa pianta: non posso raccomandare in modo affidabile.";
  }
  return "Nessun evento di fertilizzante registrato per questa pianta: non posso raccomandare in modo affidabile.";
}

export function renderWateringComment(s: WateringCommentSignals): string {
  const base =
    s.lastWateringDays === null
      ? `Non trovo l'ultima innaffiatura, ma per questa specie la cadenza tipica è ~${s.intervalDays} giorni.`
      : `Ultima innaffiatura ${s.lastWateringDays} giorni fa; per questa specie la cadenza tipica è ~${s.intervalDays} giorni.`;

  const rainNote =
    s.next3dRainMm !== undefined && s.next3dRainMm >= 10
      ? "È prevista pioggia nei prossimi 3 giorni: valuta di posticipare se il suolo è già umido."
      : "";

  return [base, rainNote].filter(Boolean).join(" ");
}

export function renderRecencyComment(
  activity: Exclude<ActivityKind, "fertilizzante">,
  s: GenericRecencySignals,
): string {
  const label = activity === "sarchiatura" ? "sarchiatura" : "evento";
  if (activity === "sarchiatura") {
    return s.lastEventDays === null
      ? `Non trovo l'ultima sarchiatura; indicativamente può servire ogni ~${s.intervalDays} giorni.`
      : `Ultima sarchiatura ${s.lastEventDays} giorni fa; indicativamente può servire ogni ~${s.intervalDays} giorni.`;
  }
  return s.lastEventDays === null
    ? `Non trovo l'ultimo ${label}; indicativamente può servire ogni ~${s.intervalDays} giorni.`
    : `Ultimo ${label} ${s.lastEventDays} giorni fa; indicativamente può servire ogni ~${s.intervalDays} giorni.`;
}

export function renderFertilizerComment(s: FertilizerCommentSignals): string {
  const base =
    s.lastFertilizerDays === null
      ? `Non trovo l'ultimo fertilizzante; per questa specie la cadenza tipica è ~${s.intervalDays} giorni.`
      : `Ultimo fertilizzante ${s.lastFertilizerDays} giorni fa; per questa specie la cadenza tipica è ~${s.intervalDays} giorni.`;
  return `${base} ${s.phaseText}`.trim();
}

