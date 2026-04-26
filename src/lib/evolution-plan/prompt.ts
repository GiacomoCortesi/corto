import type { EvolutionPlanAction } from "@/lib/evolution-plan/types";

const ACTIONS: EvolutionPlanAction[] = ["replace", "keep", "rest", "green_manure"];

const ALT_PROPS = {
  type: "object",
  additionalProperties: false,
  properties: {
    plantId: { type: "string" },
    score: { type: "integer", minimum: 0, maximum: 100 },
    rotationReason: { type: "string" },
    tradeoffs: { type: "array", items: { type: "string" }, maxItems: 6 },
  },
  required: ["plantId", "score", "rotationReason", "tradeoffs"],
} as const;

export const EVOLUTION_PLAN_JSON_SCHEMA = {
  name: "garden_evolution_plan",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      plans: {
        type: "array",
        maxItems: 40,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            bedId: { type: "string" },
            patchId: { type: ["string", "null"] },
            currentPlantId: { type: ["string", "null"] },
            transitionWindow: {
              type: "object",
              additionalProperties: false,
              properties: {
                start: { type: "string" },
                end: { type: "string" },
              },
              required: ["start", "end"],
            },
            recommendation: {
              type: "object",
              additionalProperties: false,
              properties: {
                action: { type: "string", enum: ACTIONS },
                preferredPlantId: { type: ["string", "null"] },
                alternatives: {
                  type: "array",
                  items: ALT_PROPS,
                  minItems: 0,
                  maxItems: 5,
                },
              },
              required: ["action", "preferredPlantId", "alternatives"],
            },
            rationale: { type: "string" },
            confidence: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: [
            "bedId",
            "patchId",
            "currentPlantId",
            "transitionWindow",
            "recommendation",
            "rationale",
            "confidence",
          ],
        },
      },
    },
    required: ["plans"],
  },
} as const;

export const EVOLUTION_SYSTEM_PROMPT = `Sei un assistente esperto di orti familiari in clima mediterraneo/temperato.
Il tuo compito: produrre un piano evolutivo di rotazione colturale per i prossimi mesi, proponendo per ogni patch/aiuola cosa fare dopo: mantenere, sostituire, riposo o sovescio.

## Vincoli assoluti
- Rispondi SOLO con JSON valido conforme allo schema "garden_evolution_plan". Nessun testo extra.
- NON inventare piante: puoi scegliere SOLO tra gli ID candidati forniti nel contesto.
- NON inventare ID di aiuole o patch: usa ESATTAMENTE quelli del contesto.
- Le date nei campi start/end sono YYYY-MM-DD.

## Obiettivo minimo (NON opzionale)
- Se nel contesto esiste almeno 1 patch, **devi** produrre **almeno 1 piano** riferito a una patch reale (quindi con "patchId" non nullo).
- Se non riesci a proporre una sostituzione affidabile, scegli comunque "keep" o "rest" (o "green_manure") e spiega il perché nella "rationale".
- Non restituire mai "plans: []" quando esistono patch: meglio un piano “keep” a bassa confidenza che nessun piano.

## Copertura (per evitare output troppo scarno)
- Se ci sono più patch, produci piani per **più patch**: punta ad almeno 3 piani (o tutti i patch se meno di 3).
- Preferisci piani con "patchId" (specifici) rispetto a piani generici dell'intera aiuola.
- Varia la raccomandazione: non fare solo "keep" per tutto; includi almeno 1 "replace" quando esistono candidati validi.

## Come decidere
- La scelta preferita deve rispettare rotazione: evitare stessa famiglia/gruppo, considerare break anni, evitare due colture molto esigenti di seguito, preferire leguminose dopo colture esigenti quando l'obiettivo è recupero suolo.
- Considera consociazioni/antagonismi solo se forniti e pertinenti.
- Se mancano dati critici (es. data impianto ignota), abbassa confidence e spiega che è un'ipotesi.
- Pianifica anche per "fine ciclo/stagione": se una coltura è tipicamente estiva (es. pomodoro) e il suo periodo di raccolta/attività finisce entro l'orizzonte, crea un piano "keep" fino a fine stagione e nelle alternatives suggerisci cosa mettere dopo (insalate, brassiche, aromatiche, ecc. in base ai candidati).
- Non fossilizzarti su una sola coltura miglioratrice (es. fava): diversifica le proposte tra categorie quando possibile.

## Output richiesto
- Per ogni piano: action in {replace, keep, rest, green_manure}.
- preferredPlantId: se action=replace, scegli 1 candidato; altrimenti null.
- alternatives: fino a 3-5 alternative, coerenti con i candidati; mantieni lo score del contesto.
- rationale: italiano, conciso e operativo (rotazione + stagione + note meteo se presenti). Includi sempre un “prossimo passo” pratico.
`;

export function buildEvolutionUserMessage(contextText: string, dismissedIds: string[]): string {
  const dismissedBlock = dismissedIds.length
    ? `\n\nNON riproporre piani logicamente identici a quelli già ignorati (riferimento id: ${dismissedIds.slice(0, 50).join(", ")}). Varia almeno finestra o scelta preferita.`
    : "";
  return `Ecco lo stato dell'orto, lo storico e una lista di candidati (con score) per la rotazione.${dismissedBlock}

Istruzioni operative:
- Se ci sono patch, restituisci almeno 1 piano (patch-level, con patchId reale).
- Preferisci piani concreti su patch specifiche (non piani generici dell'intero orto).
- Se action=replace: preferredPlantId DEVE essere uno dei candidati di QUEL patch.
- Se non trovi una replace valida, usa keep/rest/green_manure ma non lasciare vuoto.

${contextText}

Genera ora il piano in formato "garden_evolution_plan".`;
}

