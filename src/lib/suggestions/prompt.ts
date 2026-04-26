/**
 * Prompt e schema JSON per la generazione di suggerimenti di orto.
 * Ogni blocco e' per TIPO di attività (`kind`), con un elenco `items`
 * che valuta ogni pianta/patch (serve o no, con motivazione).
 */

import { formatCadencesForPrompt } from "@/lib/suggestions/cadences";

const ALLOWED_KINDS = [
  "sowing",
  "weeding",
  "watering",
  "transplanting",
  "treatment",
  "harvest",
  "note",
  "other",
] as const;

const ITEM_PROPS = {
  type: "object",
  additionalProperties: false,
  properties: {
    bedId: { type: ["string", "null"] },
    patchId: { type: ["string", "null"] },
    plantId: { type: ["string", "null"] },
    plantName: { type: ["string", "null"] },
    needsAction: { type: "boolean" },
    rationale: { type: "string" },
  },
  required: [
    "bedId",
    "patchId",
    "plantId",
    "plantName",
    "needsAction",
    "rationale",
  ],
} as const;

export const SYSTEM_PROMPT = `Sei un assistente per orti familiari in clima mediterraneo / temperato.
Il tuo compito: per ogni TIPO di attività di orto (annaffiatura, sarchiatura, trattamento, raccolta, semina, trapianto) che ha senso data la configurazione, produrre **un solo blocco** per quel tipo, con data consigliata e una **valutazione riga per riga per ogni pianta/patch** presente nel contesto.

## Formato del ragionamento (obbligatorio)

- Per ogni \`kind\` che includi negli \`suggestions\`, l'array \`items\` DEVE elencare **tutte le piante/patch** dell'orto a cui quel tipo di attività si applica in senso lato (es. per \`watering\`, \`weeding\`, \`treatment\`: **ogni patch** piantato deve comparire con **esattamente una riga**).
- Ogni riga in \`items\` ha:
  * \`needsAction\` = \`true\` se in quel periodo andrebbe fatta l'attività su quel patch, \`false\` se no (es. appena annaffiato, cadenza non ancora scaduta, specie che in quella fase non richiede l'intervento).
  * \`rationale\` in italiano, conciso: cita **ultimo evento omonimo** sul patch (giorni fa), **cadenza** attesa in base a specie/categoria/catalogo, **fase** (crescita/raccolto), e se rilevante il **meteo** (es. pioggia imminente → annaffiatura non necessaria o posticipata).
- Il campo \`rationale\` di livello blocco (non solo delle righe) è la **sintesi** del gruppo: come il meteo influisce sulla data scelta e sul mix di necessità.
- \`suggestedFor\` è la data consigliata (YYYY-MM-DD) entro i prossimi 14 giorni per **condensare** l'intervento; per piante con \`needsAction: false\` usi la riga per spiegare perché, senza forzare una data diversa per ciascuna.
- Al massimo **un oggetto per ogni \`kind\` distinto** (no duplicati di \`watering\`, ecc.).

## Regole

- Rispondi SOLO con JSON valido (\`garden_suggestions\`). Nessun testo fuori dallo JSON.
- Massimo **7** voci in \`suggestions\` (escludi i \`kind\` irrilevanti: es. niente "semina" se nessun patch é idoneo nel periodo).
- \`suggestedFor\` in ogni blocco: YYYY-MM-DD, da oggi a oggi+14 inclusi.
- Meteo: se il contesto contiene le previsioni, **devi** influenzare data e \`rationale\` (annaffiatura inutili prima di pioggia forte, trattamenti a rischio dilavamento, sarchiatura preferibilmente su terreno asciutto, ecc.). Se il meteo non c'è, indicalo nelle motivazioni in modo cauto.
- Cadenze indicative per categoria piante (giorni tipici) — adatta a specie, acqua, stagione:
${formatCadencesForPrompt()}
- I campi \`bedId\`, \`patchId\`, \`plantId\` nelle righe \`items\` devono coincidere con gli ID nel contesto; \`plantName\` = nome comune (es. "Pomodoro").

"kind" permessi: ${ALLOWED_KINDS.join(", ")}.

Output: JSON schema "garden_suggestions".`;

export const SUGGESTIONS_JSON_SCHEMA = {
  name: "garden_suggestions",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      suggestions: {
        type: "array",
        maxItems: 7,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            kind: {
              type: "string",
              enum: [...ALLOWED_KINDS],
            },
            title: {
              type: "string",
              description: "Titolo del blocco, es. Annaffiatura: valutazione per aiuole",
            },
            rationale: {
              type: "string",
              description: "Sintesi complessiva + collegamento al meteo",
            },
            suggestedFor: {
              type: "string",
            },
            windowDays: { type: ["integer", "null"] },
            weatherNote: { type: ["string", "null"] },
            confidence: {
              type: "string",
              enum: ["low", "medium", "high"],
            },
            items: {
              type: "array",
              items: ITEM_PROPS,
            },
          },
          required: [
            "kind",
            "title",
            "rationale",
            "suggestedFor",
            "windowDays",
            "weatherNote",
            "confidence",
            "items",
          ],
        },
      },
    },
    required: ["suggestions"],
  },
} as const;

export function buildUserMessage(contextText: string, dismissedIds: string[]): string {
  const dismissedBlock = dismissedIds.length
    ? `\n\nNON riproporre suggestion logicamente identiche a quelle gia' ignorate (riferimento id: ${dismissedIds.slice(0, 50).join(", ")}). Varia almeno data o scelta di piante.`
    : "";

  return `Ecco lo stato dell'orto, l'elenco patch e il meteo previsto.${dismissedBlock}

${contextText}

Genera ora i suggerimenti in formato "garden_suggestions": un blocco per ogni tipo di attivita' pertinente, ogni blocco con array \`items\` che copre tutti i patch a cui quell'attivita' si applica.`;
}
