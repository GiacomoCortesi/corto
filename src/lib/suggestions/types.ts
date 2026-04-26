/**
 * Tipi condivisi fra client (panel + store) e route handler delle
 * suggerimenti. Lo `GardenSnapshot` e' la versione "ridotta" dello stato
 * che il client manda al server: nessun history, nessun selection.
 */

import type {
  Bed,
  GardenLocation,
  GardenActivity,
  Suggestion,
} from "@/lib/types";

/** Payload che il client manda a `POST /api/suggestions`. */
export type SuggestionsRequest = {
  /** Snapshot minimo del giardino per ragionare sui suggerimenti */
  snapshot: GardenSnapshot;
  /** Id di suggerimenti gia' ignorati (vengono filtrati lato server) */
  dismissedIds: string[];
  /** ISO datetime "now" lato client (con timezone) — opzionale */
  nowIso?: string;
};

/** Snapshot inviato al server: solo cio' che serve all'LLM. */
export type GardenSnapshot = {
  meta: {
    name: string;
    sunOrientation: "N" | "S" | "E" | "O";
    location?: GardenLocation;
  };
  beds: Bed[];
  /** Eventi recenti (ultimi N giorni). Filtrati lato client. */
  events: GardenActivity[];
};

/** Risposta della route. */
export type SuggestionsResponse = {
  suggestions: Suggestion[];
  /** Riepilogo meteo testuale, restituito anche al client per trasparenza */
  weatherSummary?: string;
  /** Errore "soft": null = ok, stringa = motivo (es. missing API key) */
  error?: string;
};
