/**
 * Prompt and JSON schema for generating garden suggestions.
 * Each block is for an activity TYPE (`kind`), with an `items` list that
 * evaluates every plant/patch (needed or not, with rationale).
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

## Priorità dei segnali (obbligatorio)
1. **Eventi registrati** e cadenze per specie/categoria → decidono se \`needsAction\` è true o false.
2. **Meteo** → sposta \`suggestedFor\` e può annullare urgenze (es. pioggia imminente).
3. **Stagione / catalogo** (mesi semina-raccolta, fase colturale) → idoneità di semina, trapianto, raccolta.
4. **Calendario lunare** (tradizione orticola italiana) → solo per affinare la data quando 1–3 non impongono un giorno preciso. Non è regola scientifica forte: fattore organizzativo secondario.

## Formato del ragionamento (obbligatorio)

- Per ogni \`kind\` che includi negli \`suggestions\`, l'array \`items\` DEVE elencare **tutte le piante/patch** dell'orto a cui quel tipo di attività si applica in senso lato (es. per \`watering\`, \`weeding\`, \`treatment\`: **ogni patch** piantato deve comparire con **esattamente una riga**).
- Ogni riga in \`items\` ha:
  * \`needsAction\` = \`true\` se in quel periodo andrebbe fatta l'attività su quel patch, \`false\` se no (es. appena annaffiato, cadenza non ancora scaduta, specie che in quella fase non richiede l'intervento).
  * \`rationale\` in italiano, conciso: cita **ultimo evento omonimo** sul patch (giorni fa), **cadenza** attesa in base a specie/categoria/catalogo, **fase** (crescita/raccolto), **meteo** se rilevante, **luna** solo se influenza la data. Formato ideale: "[Evento: ...] · [Fase: ...] · [Meteo: ...] · [Luna: ...]".
- Il campo \`rationale\` di livello blocco (non solo delle righe) è la **sintesi** del gruppo: come eventi, meteo e (se pertinente) luna influiscono sulla data scelta e sul mix di necessità.
- \`suggestedFor\` è la data consigliata (YYYY-MM-DD) entro i prossimi 14 giorni per **condensare** l'intervento; per piante con \`needsAction: false\` usi la riga per spiegare perché, senza forzare una data diversa per ciascuna.
- Al massimo **un oggetto per ogni \`kind\` distinto** (no duplicati di \`watering\`, ecc.).

## Eventi registrati (priorità alta)
- Usa la sezione "Sintesi eventi per patch" e gli ultimi eventi nel contesto.
- Confronta SEMPRE l'ultimo evento dello stesso \`kind\` con la cadenza attesa (categoria/specie).
- Se l'ultimo evento è recente rispetto alla cadenza → \`needsAction: false\` e spiega (es. "annaffiato 2gg fa, cadenza ~5gg").
- Se manca un evento registrato per un'attività ricorrente (es. mai annaffiato) → \`needsAction: false\`, \`confidence\` \`low\`, rationale che invita a registrare l'attività.
- Per semina/trapianto/raccolta: usa anche la data di impianto e i mesi di semina/raccolta dal catalogo.

## Meteo (priorità alta, dopo gli eventi)
- Se il contesto contiene le previsioni, **devi** influenzare data e \`rationale\`.
- Annaffiatura: posticipa se ≥5–10 mm di pioggia previsti entro 2–3 gg; aumenta urgenza se ET0 alta e nessuna pioggia.
- Sarchiatura/trattamento: preferisci giorni asciutti, senza pioggia forte nelle 24–48h successive (dilavamento).
- Semina/trapianto: evita giorni con gelate previste; considera minime notturne per piantine delicate.
- Raccolta per conserva: preferisci finestra asciutta se il meteo lo consente.
- Riassumi l'effetto meteo in \`weatherNote\` a livello blocco.
- Se il meteo non c'è, indicalo nelle motivazioni in modo cauto.

## Calendario lunare — tradizione orticola italiana (priorità bassa)
La luna NON sostituisce meteo, temperatura del terreno o stadio colturale.

### Regola generale
- **Luna crescente**: favorisce parte aerea — semina/trapianto di ortaggi da frutto, legumi, insalate da taglio, aromatiche; germinazione e sviluppo foglie/frutti.
- **Luna calante**: favorisce radici — carote, patate, cipolle, aglio, rape, ravanelli; sarchiatura, potature, raccolta per conserva, trapianti delicati con attenzione.

### Cosa evitare (tradizione)
- **Luna piena**: evita potature forti, raccolte da conserva, trapianti delicati (piante "ricche di linfa").
- **Luna nuova**: periodo poco attivo — evita semine a germinazione lenta e lavori importanti sulle radici.

### Mapping pratico categoria → luna
Usa \`category\` dal contesto:
- \`frutto\`, \`leguminosa\`, \`foglia\`, \`aromatica\`, \`fiore-edule\` → preferisci giorni in fase **crescente** per \`sowing\` / \`transplanting\`.
- \`radice\` → preferisci fase **calante** per \`sowing\`; \`weeding\` e raccolta conserva spesso in calante.
- Per \`weeding\`, \`treatment\`, \`harvest\`: se due date sono equivalenti per eventi+meteo, sposta leggermente verso calante (sarchiatura/raccolta conserva) o crescente (raccolta foglie/frutti freschi).

### Come applicarlo nell'output
- Per \`sowing\` / \`transplanting\`: se la data ideale per meteo+stagione cade in fase sfavorevole, proponi la data più vicina nella finestra 14gg compatibile con meteo, citando la luna nel \`rationale\` o in \`moonNote\`.
- Non impostare \`needsAction: true\` solo per la luna; al massimo modifica \`suggestedFor\` o regola \`confidence\`.
- Compila \`moonNote\` per \`sowing\`, \`transplanting\`, \`weeding\`, \`harvest\` quando la luna influenza la data scelta; altrimenti \`null\`.
- Se il contesto non include il calendario lunare, non inventare fasi lunari.

## Regole

- Rispondi SOLO con JSON valido (\`garden_suggestions\`). Nessun testo fuori dallo JSON.
- Massimo **7** voci in \`suggestions\` (escludi i \`kind\` irrilevanti: es. niente "semina" se nessun patch é idoneo nel periodo).
- \`suggestedFor\` in ogni blocco: YYYY-MM-DD, da oggi a oggi+14 inclusi.
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
              description: "Sintesi complessiva: eventi, meteo e luna",
            },
            suggestedFor: {
              type: "string",
            },
            windowDays: { type: ["integer", "null"] },
            weatherNote: { type: ["string", "null"] },
            moonNote: {
              type: ["string", "null"],
              description: "Effetto del calendario lunare sulla data scelta",
            },
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
            "moonNote",
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

  return `Ecco lo stato dell'orto, gli eventi registrati, il meteo previsto e il calendario lunare.${dismissedBlock}

${contextText}

Genera ora i suggerimenti in formato "garden_suggestions": un blocco per ogni tipo di attivita' pertinente, ogni blocco con array \`items\` che copre tutti i patch a cui quell'attivita' si applica. Basa le decisioni prima su eventi e cadenze, poi su meteo, infine sulla luna come criterio secondario per la data.`;
}
