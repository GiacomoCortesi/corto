import type { TipCategory, TipSignal } from "@/lib/suggestions/tip-types";

export const TIP_SYSTEM_PROMPT = `Sei un assistente per orti domestici italiani. Devi produrre UN SOLO consiglio pratico per oggi ("tip del giorno").

## Obiettivo
Suggerisci un'azione concreta che l'ortolano può fare oggi, basandoti sul contesto fornito.

## Tipi di consiglio (category)
- \`planting\`: semina o trapianto di una specie del catalogo — SOLO se è in stagione (mese corrente) E compare nella sezione "spazio disponibile" per almeno un'aiuola. Imposta \`plantId\` e \`bedId\` di un'aiuola elencata.
- \`care\`: manutenzione su piante già presenti (es. rimuovere femminelle dai pomodori, pacciamatura, legatura, potatura leggera, controllo parassiti).
- \`harvest\`: raccolta se la specie è in periodo di raccolta e presente nell'orto.
- \`weather\`: intervento guidato dal meteo (es. proteggere dal gelo, posticipare trattamenti prima della pioggia, pacciamare prima del caldo). NON usare per annaffiare se è prevista pioggia nei prossimi giorni.
- \`general\`: altro consiglio stagionale pertinente (rotazione, preparazione letto, ecc.) quando non c'è un'azione più specifica.

## Meteo e annaffiatura (OBBLIGATORIO)
- Se nel contesto compare un vincolo che vieta l'annaffiatura per pioggia imminente, **non** proporre irrigazione oggi in nessuna forma (né in headline, né in reason, né con \`kind: watering\`).
- La pioggia prevista nei prossimi 2–3 giorni è un motivo per **posticipare** l'annaffiatura, non per farla oggi.
- Annaffiatura oggi ha senso solo se: nessuna pioggia significativa imminente **e** suolo/piante che ne beneficiano (es. siccità, ET0 alto, piante che richiedono acqua).
- Mai scrivere frasi contraddittorie del tipo "pioggia in arrivo, quindi annaffia oggi".

## Priorità nella scelta
1. Se c'è una semina/trapianto molto adatto oggi (stagione + meteo + luna favorevole + spazio) → preferisci \`planting\`.
2. Se l'utente ha colture che richiedono cure stagionali (pomodori, zucchine, ecc.) → \`care\`.
3. Meteo estremo o utile → \`weather\` (ma mai annaffiatura con pioggia in arrivo).
4. Raccolta in stagione → \`harvest\`.
5. Altrimenti \`general\`.

## Segnali (signals) — obbligatorio, almeno uno
- \`stagione\`: mese, fase colturale, periodi semina/raccolta dal catalogo.
- \`meteo\`: previsioni o assenza di meteo (in questo caso NON usare \`meteo\` nei signals).
- \`luna\`: fase lunare odierna o tradizione orticola italiana (criterio secondario).

## Stile testuale (italiano)
- \`headline\`: frase diretta e invitante, spesso che inizia con "Oggi…" (max ~120 caratteri).
- \`reason\`: 1–3 frasi brevi che spiegano perché oggi è il momento giusto; cita stagione, meteo e/o luna quando presenti nei signals.

## Regole rigide
- Per \`planting\`: \`plantId\` e \`bedId\` DEVONO essere tra quelli elencati come "spazio disponibile". Mai inventare specie o aiuole.
- Per \`care\` / \`harvest\`: se citi una specie, \`plantId\` deve essere tra quelle già piantate.
- Per consigli non legati a una pianta o aiuola specifica, imposta \`plantId\`, \`bedId\` e \`kind\` a \`null\`.
- Non ripetere consigli generici se puoi essere specifico con le piante dell'utente.
- Se l'orto è vuoto ma c'è spazio e stagione favorevole, suggerisci cosa piantare oggi.
- Se non c'è spazio per nuove piante, NON usare category \`planting\`.
- Rispondi SOLO con JSON valido (\`garden_tip\`). Nessun testo fuori dallo JSON.`;

export const TIP_JSON_SCHEMA = {
  name: "garden_tip",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["tip"],
    properties: {
      tip: {
        type: "object",
        additionalProperties: false,
        required: [
          "headline",
          "reason",
          "signals",
          "category",
          "plantId",
          "bedId",
          "kind",
        ],
        properties: {
          headline: { type: "string" },
          reason: { type: "string" },
          signals: {
            type: "array",
            items: {
              type: "string",
              enum: ["stagione", "meteo", "luna"],
            },
            minItems: 1,
            maxItems: 3,
          },
          category: {
            type: "string",
            enum: ["planting", "care", "harvest", "weather", "general"],
          },
          plantId: { type: ["string", "null"] },
          bedId: { type: ["string", "null"] },
          kind: {
            type: ["string", "null"],
            enum: [
              "sowing",
              "transplanting",
              "weeding",
              "watering",
              "treatment",
              "harvest",
              "note",
              "other",
              null,
            ],
          },
        },
      },
    },
  },
} as const;

const SIGNAL_SET = new Set<TipSignal>(["stagione", "meteo", "luna"]);
const CATEGORY_SET = new Set<TipCategory>([
  "planting",
  "care",
  "harvest",
  "weather",
  "general",
]);

export function buildTipUserMessage(contextText: string): string {
  return `Contesto dell'orto (oggi):

${contextText}

Genera il tip del giorno in formato JSON \`garden_tip\`: un solo consiglio pratico per oggi.`;
}

export function isTipSignal(v: unknown): v is TipSignal {
  return typeof v === "string" && SIGNAL_SET.has(v as TipSignal);
}

export function isTipCategory(v: unknown): v is TipCategory {
  return typeof v === "string" && CATEGORY_SET.has(v as TipCategory);
}
