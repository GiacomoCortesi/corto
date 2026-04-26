import { useGardenStore } from "@/lib/store";
import type { GardenMeta, Bed, GardenActivity } from "@/lib/types";
import { PERSIST_VERSION, migratePersistedState } from "@/lib/store";

type ExportableState = {
  meta: GardenMeta;
  beds: Bed[];
  events: GardenActivity[];
  dismissedSuggestionIds: string[];
  seasonFilter: number | null;
  initialized: boolean;
};

type CortoProjectFileV1 = {
  corto: 1;
  version: number;
  exportedAt: number;
  state: ExportableState;
};

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function buildExportableState(): ExportableState {
  const s = useGardenStore.getState();
  return {
    meta: s.meta,
    beds: s.beds,
    events: s.events,
    dismissedSuggestionIds: s.dismissedSuggestionIds,
    seasonFilter: s.seasonFilter,
    initialized: s.initialized,
  };
}

export function exportProjectJson(filename: string) {
  const payload: CortoProjectFileV1 = {
    corto: 1,
    version: PERSIST_VERSION,
    exportedAt: Date.now(),
    state: buildExportableState(),
  };
  downloadText(filename, JSON.stringify(payload, null, 2), "application/json");
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

export function importProjectJsonText(text: string) {
  const parsed: unknown = JSON.parse(text);
  if (!isPlainObject(parsed) || parsed.corto !== 1) {
    throw new Error("File non valido (header Corto mancante).");
  }

  const version = typeof parsed.version === "number" ? parsed.version : 0;
  const rawState = (parsed as Record<string, unknown>).state;
  if (!isPlainObject(rawState)) {
    throw new Error("File non valido (state mancante).");
  }

  const migrated = migratePersistedState(rawState, version) as Partial<ExportableState>;

  // Minimal validation to avoid corrupted state.
  if (!migrated.meta || !migrated.beds) {
    throw new Error("File non valido (campi obbligatori mancanti).");
  }

  useGardenStore.setState({
    meta: migrated.meta,
    beds: migrated.beds,
    events: Array.isArray(migrated.events) ? migrated.events : [],
    dismissedSuggestionIds: Array.isArray(migrated.dismissedSuggestionIds)
      ? migrated.dismissedSuggestionIds
      : [],
    seasonFilter:
      typeof migrated.seasonFilter === "number" || migrated.seasonFilter === null
        ? migrated.seasonFilter
        : null,
    initialized: Boolean(migrated.initialized),
    selection: null,
    past: [],
    future: [],
  });
}

