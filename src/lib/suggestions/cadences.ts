/**
 * Cadenze indicative per le attività di orto in clima temperato (es.
 * Italia). Servono al prompt per dare al modello dei numeri concreti
 * da considerare invece di farglieli inventare. Sono linee guida, non
 * certezze: il modello deve modulare in base a meteo, stagione e specie.
 */

import type { PlantCategory, GardenActivityKind } from "@/lib/types";

type CadenceWindow = {
  /** Cadenza tipica in giorni per quel tipo di attività */
  everyDays: number;
  /** Tolleranza ammessa (giorni) prima/dopo `everyDays` */
  toleranceDays: number;
};

type Cadences = Partial<
  Record<PlantCategory, Partial<Record<GardenActivityKind, CadenceWindow>>>
>;

/**
 * Cadenze "in piena stagione" per categoria di pianta.
 *
 * - Sarchiatura/diserbo (`weeding`): operazione ricorrente per evitare
 *   competizione e crosta superficiale.
 * - Annaffiatura (`watering`): in piena estate; in primavera/autunno
 *   l'LLM deve raddoppiare i giorni e considerare la pioggia prevista.
 * - Trattamento (`treatment`): cadenza preventiva tipica per le specie
 *   piu' soggette ad avversità (solanacee, cucurbitacee, cavoli).
 *
 * Le specie a cui non si applica un'attività vengono semplicemente omesse.
 */
export const CATEGORY_CADENCES: Cadences = {
  ortaggio: {
    weeding: { everyDays: 10, toleranceDays: 4 },
    watering: { everyDays: 2, toleranceDays: 1 },
    treatment: { everyDays: 14, toleranceDays: 5 },
  },
  aromatica: {
    weeding: { everyDays: 21, toleranceDays: 7 },
    watering: { everyDays: 3, toleranceDays: 2 },
  },
  frutto: {
    weeding: { everyDays: 10, toleranceDays: 4 },
    watering: { everyDays: 2, toleranceDays: 1 },
    treatment: { everyDays: 10, toleranceDays: 4 },
  },
  "frutti-di-bosco": {
    weeding: { everyDays: 14, toleranceDays: 5 },
    watering: { everyDays: 3, toleranceDays: 2 },
    treatment: { everyDays: 14, toleranceDays: 5 },
  },
  leguminosa: {
    weeding: { everyDays: 14, toleranceDays: 5 },
    watering: { everyDays: 3, toleranceDays: 2 },
  },
  radice: {
    weeding: { everyDays: 10, toleranceDays: 4 },
    watering: { everyDays: 3, toleranceDays: 2 },
  },
  foglia: {
    weeding: { everyDays: 10, toleranceDays: 4 },
    watering: { everyDays: 2, toleranceDays: 1 },
  },
};

/**
 * Resa testuale compatta da iniettare nel prompt: una riga per categoria
 * con le cadenze in giorni, cosi' il modello può citarle nel rationale.
 */
export function formatCadencesForPrompt(): string {
  const lines: string[] = [];
  for (const [cat, kinds] of Object.entries(CATEGORY_CADENCES)) {
    if (!kinds) continue;
    const parts = Object.entries(kinds).map(
      ([k, w]) => `${k}: ~${w!.everyDays}gg (±${w!.toleranceDays})`,
    );
    lines.push(`- ${cat}: ${parts.join(", ")}`);
  }
  return lines.join("\n");
}
