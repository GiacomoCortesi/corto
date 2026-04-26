/**
 * Types shared between the client (panel + store) and the suggestions route
 * handler. `GardenSnapshot` is the "reduced" version of the state that the
 * client sends to the server: no history, no selection.
 */

import type {
  Bed,
  GardenActivity,
  GardenLocation,
  Suggestion,
} from "@/lib/types";

export type { GardenActivity } from "@/lib/types";

/** Payload sent by the client to `POST /api/suggestions`. */
export type SuggestionsRequest = {
  /** Minimal garden snapshot used to generate suggestions */
  snapshot: GardenSnapshot;
  /** IDs of suggestions already dismissed (filtered server-side) */
  dismissedIds: string[];
  /** Client-side ISO datetime "now" (with timezone) — optional */
  nowIso?: string;
};

/** Snapshot sent to the server: only what the LLM needs. */
export type GardenSnapshot = {
  meta: {
    name: string;
    sunOrientation: "N" | "S" | "E" | "O";
    location?: GardenLocation;
  };
  beds: Bed[];
  /** Recent events (last N days). Filtered client-side. */
  events: GardenActivity[];
};

/** Route response. */
export type SuggestionsResponse = {
  suggestions: Suggestion[];
  /** Text weather summary, also returned to the client for transparency */
  weatherSummary?: string;
  /** "Soft" error: null = ok, string = reason (e.g. missing API key) */
  error?: string;
};
