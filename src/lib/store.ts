"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Bed,
  GardenActivity,
  GardenLocation,
  GardenMeta,
  PatchArrangement,
  PlantPatch,
  Selection,
  SpacingMode,
  Suggestion,
  SunOrientation,
} from "@/lib/types";
import { plantById } from "@/lib/data/plants";
import {
  DEFAULT_CELL_SIZE_CM,
  anchorToCellIndex,
  bedCellSizeCm,
  cellIndexToAnchor,
  maxGridDimForCellSizeCm,
  minCellsForOnePlant,
  patchFitsInBed,
  patchesOverlap,
} from "@/lib/utils/spacing";

const HISTORY_LIMIT = 30;

const MIN_CELL_SIZE_CM = 5;
const MAX_CELL_SIZE_CM = 60;

type Snapshot = {
  meta: GardenMeta;
  beds: Bed[];
};

export const PERSIST_KEY = "corto-garden-v1";
export const PERSIST_VERSION = 5;

type State = {
  meta: GardenMeta;
  beds: Bed[];
  /** Diario attività (separato dallo snapshot undo del layout) */
  events: GardenActivity[];
  /** Id dei suggerimenti che l'utente ha esplicitamente ignorato */
  dismissedSuggestionIds: string[];
  /** Ultima risposta suggerimenti (cache persistita) */
  cachedSuggestions?: {
    items: Suggestion[];
    weatherSummary?: string;
    savedAt: number;
  };
  selection: Selection;
  seasonFilter: number | null;
  initialized: boolean;
  past: Snapshot[];
  future: Snapshot[];
};

export type AddActivityInput = Omit<GardenActivity, "id">;

export type AddPatchInput = {
  plantId: string;
  anchor: { col: number; row: number };
  plantCols?: number;
  plantRows?: number;
  spacingCm?: number;
  spacingMode?: SpacingMode;
  arrangement?: PatchArrangement;
};

type Actions = {
  initGarden: (
    name: string,
    sunOrientation: SunOrientation,
    location?: GardenLocation,
  ) => void;
  resetGarden: () => void;

  renameGarden: (name: string) => void;
  setGardenLocation: (location: GardenLocation | undefined) => void;

  addBed: (position?: { x: number; y: number }) => string;
  removeBed: (id: string) => void;
  moveBed: (id: string, position: { x: number; y: number }) => void;
  renameBed: (id: string, name: string) => void;
  resizeBed: (id: string, cols: number, rows: number) => void;
  /**
   * Cambia la risoluzione della griglia preservando le dimensioni
   * fisiche dell'aiuola in cm. Riscala `cols`/`rows` e l'`anchor` di
   * ogni patch al nuovo passo. I patch che dopo il riscalamento non
   * stanno piu' nella griglia (oppure entrano in collisione fra loro
   * dopo l'arrotondamento) vengono scartati. Restituisce il numero di
   * patch scartati (0 = riscalamento perfetto).
   */
  setBedCellSize: (id: string, cellSizeCm: number) => number;

  addPatch: (bedId: string, input: AddPatchInput) => PlantPatch | null;
  removePatch: (bedId: string, patchId: string) => void;
  /** Ridimensiona il patch. Restituisce `false` se la modifica e' stata
   *  rifiutata (overlap o overflow del bed). */
  resizePatch: (
    bedId: string,
    patchId: string,
    plantCols: number,
    plantRows: number,
  ) => boolean;
  /** Sposta il patch. Restituisce `false` se la nuova posizione e' invalida. */
  movePatch: (
    bedId: string,
    patchId: string,
    anchor: { col: number; row: number },
  ) => boolean;
  /** Cambia (o azzera) la spaziatura del patch. Restituisce `false` se rifiutata. */
  setPatchSpacing: (
    bedId: string,
    patchId: string,
    spacingCm: number | undefined,
  ) => boolean;
  /** Cambia (o azzera) la convenzione di spaziatura. Restituisce `false` se rifiutata. */
  setPatchSpacingMode: (
    bedId: string,
    patchId: string,
    spacingMode: SpacingMode | undefined,
  ) => boolean;
  /** Cambia (o azzera) la disposizione (square/triangular). Restituisce `false` se rifiutata. */
  setPatchArrangement: (
    bedId: string,
    patchId: string,
    arrangement: PatchArrangement | undefined,
  ) => boolean;

  /** Wrapper retro-compatibile: crea un patch 1x1 sulla cella indicata. */
  addPlantToBed: (
    bedId: string,
    plantId: string,
    cellIndex: number,
  ) => PlantPatch | null;
  /** Wrapper retro-compatibile: equivalente a `removePatch`. */
  removePlantInstance: (bedId: string, instanceId: string) => void;

  setSelection: (selection: Selection) => void;
  setSeasonFilter: (month: number | null) => void;

  addActivity: (input: AddActivityInput) => void;
  removeActivity: (id: string) => void;
  /**
   * Aggiorna un'attività esistente. Restituisce `false` se non esiste.
   * Usato dal Diario per segnare un'attività pianificata come fatta
   * (sposta `at` ad ora e rimuove `planned`).
   */
  updateActivity: (id: string, patch: Partial<Omit<GardenActivity, "id">>) => boolean;

  /**
   * Accetta un suggerimento: crea un'attività pianificata con `at`
   * pari a `suggestedFor` e la marca come `planned: true`.
   */
  acceptSuggestion: (s: Suggestion) => void;
  /** Marca un suggerimento come ignorato (persistito) */
  dismissSuggestion: (id: string) => void;
  /** Salva (persistendo) l'ultima risposta suggerimenti */
  setCachedSuggestions: (cache: State["cachedSuggestions"] | undefined) => void;

  undo: () => void;
  redo: () => void;
};

export type GardenStore = State & Actions;

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function defaultMeta(): GardenMeta {
  return {
    name: "Il mio orto",
    sunOrientation: "S",
    createdAt: Date.now(),
  };
}

function snapshot(state: State): Snapshot {
  return {
    meta: { ...state.meta },
    beds: state.beds.map((b) => ({
      ...b,
      position: { ...b.position },
      patches: b.patches.map((p) => ({
        ...p,
        anchor: { ...p.anchor },
      })),
    })),
  };
}

function pushHistory(state: State): Pick<State, "past" | "future"> {
  const past = [...state.past, snapshot(state)].slice(-HISTORY_LIMIT);
  return { past, future: [] };
}

/**
 * Helper condiviso da `resizePatch`/`movePatch`/`setPatchSpacing`/...
 * Applica `update` al patch, valida fit + overlap nel bed e aggiorna lo
 * store. Restituisce `true` se la modifica e' stata applicata, `false` se
 * rifiutata (overlap, overflow, oggetti mancanti).
 */
function applyPatchUpdate(
  get: () => GardenStore,
  set: (
    partial: Partial<GardenStore> | ((s: GardenStore) => Partial<GardenStore>),
  ) => void,
  bedId: string,
  patchId: string,
  update: (current: PlantPatch) => PlantPatch,
): boolean {
  const state = get();
  const bed = state.beds.find((b) => b.id === bedId);
  if (!bed) return false;
  const current = bed.patches.find((p) => p.id === patchId);
  if (!current) return false;
  const plant = plantById(current.plantId);
  if (!plant) return false;

  const candidate = update(current);
  if (!patchFitsInBed(candidate, bed, plant)) return false;
  for (const existing of bed.patches) {
    if (existing.id === patchId) continue;
    if (patchesOverlap(candidate, existing, bed, plantById)) return false;
  }

  set({
    ...pushHistory(state),
    beds: state.beds.map((b) =>
      b.id === bedId
        ? {
            ...b,
            patches: b.patches.map((p) => (p.id === patchId ? candidate : p)),
          }
        : b,
    ),
  });
  return true;
}

export const useGardenStore = create<GardenStore>()(
  persist(
    (set, get) => ({
      meta: defaultMeta(),
      beds: [],
      events: [],
      dismissedSuggestionIds: [],
      cachedSuggestions: undefined,
      selection: null,
      seasonFilter: null,
      initialized: false,
      past: [],
      future: [],

      initGarden: (name, sunOrientation, location) => {
        set({
          meta: {
            name,
            sunOrientation,
            createdAt: Date.now(),
            ...(location ? { location } : {}),
          },
          beds: [],
          events: [],
          dismissedSuggestionIds: [],
          cachedSuggestions: undefined,
          selection: null,
          seasonFilter: null,
          initialized: true,
          past: [],
          future: [],
        });
      },

      resetGarden: () => {
        set({
          meta: defaultMeta(),
          beds: [],
          events: [],
          dismissedSuggestionIds: [],
          cachedSuggestions: undefined,
          selection: null,
          seasonFilter: null,
          initialized: false,
          past: [],
          future: [],
        });
      },

      renameGarden: (name) => {
        const state = get();
        set({
          ...pushHistory(state),
          meta: { ...state.meta, name },
        });
      },

      setGardenLocation: (location) => {
        const state = get();
        set({
          meta: location
            ? { ...state.meta, location }
            : (() => {
                // Rimuove location senza lasciare la chiave a undefined nei JSON.
                const next = { ...state.meta };
                delete next.location;
                return next;
              })(),
        });
      },

      addBed: (position) => {
        const state = get();
        const id = uid("bed");
        // Default a 5 cm di risoluzione cosi' i footprint dei patch
        // (es. carota 8 cm, lattuga 20 cm) si allineano in modo
        // accurato sulla griglia. 24 x 24 = 1.20 m x 1.20 m, stessa
        // dimensione visiva del vecchio default 4 x 4 a 30 cm.
        const newBed: Bed = {
          id,
          name: `Aiuola ${state.beds.length + 1}`,
          position: position ?? {
            x: 120 + state.beds.length * 40,
            y: 80 + state.beds.length * 40,
          },
          cols: 24,
          rows: 24,
          cellSizeCm: 5,
          patches: [],
        };
        set({
          ...pushHistory(state),
          beds: [...state.beds, newBed],
          selection: { kind: "bed", bedId: id },
        });
        return id;
      },

      removeBed: (id) => {
        const state = get();
        set({
          ...pushHistory(state),
          beds: state.beds.filter((b) => b.id !== id),
          selection:
            state.selection &&
            "bedId" in state.selection &&
            state.selection.bedId === id
              ? null
              : state.selection,
        });
      },

      moveBed: (id, position) => {
        // movement is high-frequency: skip history; persist final position only
        set((state) => ({
          beds: state.beds.map((b) =>
            b.id === id ? { ...b, position } : b
          ),
        }));
      },

      renameBed: (id, name) => {
        const state = get();
        set({
          ...pushHistory(state),
          beds: state.beds.map((b) => (b.id === id ? { ...b, name } : b)),
        });
      },

      resizeBed: (id, cols, rows) => {
        const state = get();
        set({
          ...pushHistory(state),
          beds: state.beds.map((b) => {
            if (b.id !== id) return b;
            const cell = b.cellSizeCm ?? DEFAULT_CELL_SIZE_CM;
            const maxDim = maxGridDimForCellSizeCm(cell);
            const c = Math.max(1, Math.min(maxDim, cols));
            const r = Math.max(1, Math.min(maxDim, rows));
            const next: Bed = { ...b, cols: c, rows: r };
            // Drop patches whose anchor falls outside the new grid; patches
            // that still anchor inside are kept even if their footprint
            // overflows (rendered clipped). A future iteration may resize
            // patches to fit instead.
            next.patches = b.patches.filter(
              (p) => p.anchor.col < c && p.anchor.row < r,
            );
            return next;
          }),
        });
      },

      setBedCellSize: (id, cellSizeCm) => {
        const state = get();
        const bed = state.beds.find((b) => b.id === id);
        if (!bed) return 0;
        const newCell = Math.max(
          MIN_CELL_SIZE_CM,
          Math.min(MAX_CELL_SIZE_CM, Math.round(cellSizeCm)),
        );
        const oldCell = bed.cellSizeCm ?? DEFAULT_CELL_SIZE_CM;
        if (newCell === oldCell) return 0;

        // Preserve physical bed dimensions: if the bed is W cm wide and
        // we move from 30 cm cells to 5 cm cells, cols goes from 4 to 24.
        const ratio = oldCell / newCell;
        const maxDim = maxGridDimForCellSizeCm(newCell);
        const cols = Math.max(
          1,
          Math.min(maxDim, Math.round(bed.cols * ratio)),
        );
        const rows = Math.max(
          1,
          Math.min(maxDim, Math.round(bed.rows * ratio)),
        );

        // Rescale each patch's anchor by the same ratio (rounded). Drop
        // anything that no longer fits or collides with an already kept
        // patch after rounding.
        const candidate: Bed = {
          ...bed,
          cellSizeCm: newCell,
          cols,
          rows,
          patches: [],
        };
        const kept: PlantPatch[] = [];
        let dropped = 0;
        for (const patch of bed.patches) {
          const plant = plantById(patch.plantId);
          if (!plant) {
            dropped++;
            continue;
          }
          const next: PlantPatch = {
            ...patch,
            anchor: {
              col: Math.min(
                cols - 1,
                Math.max(0, Math.round(patch.anchor.col * ratio)),
              ),
              row: Math.min(
                rows - 1,
                Math.max(0, Math.round(patch.anchor.row * ratio)),
              ),
            },
          };
          if (!patchFitsInBed(next, candidate, plant)) {
            dropped++;
            continue;
          }
          const collides = kept.some((existing) =>
            patchesOverlap(next, existing, candidate, plantById),
          );
          if (collides) {
            dropped++;
            continue;
          }
          kept.push(next);
        }
        candidate.patches = kept;

        // If the currently selected patch was dropped, fall back to a
        // bed-level selection so the panel doesn't show a dangling ref.
        const sel = state.selection;
        const selectedDropped =
          sel?.kind === "plant" &&
          sel.bedId === id &&
          !kept.some((p) => p.id === sel.patchId);
        const nextSelection: Selection = selectedDropped
          ? { kind: "bed", bedId: id }
          : sel;

        set({
          ...pushHistory(state),
          beds: state.beds.map((b) => (b.id === id ? candidate : b)),
          selection: nextSelection,
        });
        return dropped;
      },

      addPatch: (bedId, input) => {
        const state = get();
        const bed = state.beds.find((b) => b.id === bedId);
        if (!bed) return null;
        const plant = plantById(input.plantId);
        if (!plant) return null;

        const cellCm = bedCellSizeCm(bed);
        const spacing = input.spacingCm ?? plant.defaultSpacingCm;
        const minCells = minCellsForOnePlant(spacing, cellCm);

        const candidate: PlantPatch = {
          id: uid("patch"),
          plantId: input.plantId,
          anchor: { ...input.anchor },
          plantCols: Math.max(minCells, input.plantCols ?? minCells),
          plantRows: Math.max(minCells, input.plantRows ?? minCells),
          spacingCm: input.spacingCm,
          spacingMode: input.spacingMode,
          arrangement: input.arrangement,
        };

        if (!patchFitsInBed(candidate, bed, plant)) return null;
        for (const existing of bed.patches) {
          if (patchesOverlap(candidate, existing, bed, plantById)) return null;
        }

        set({
          ...pushHistory(state),
          beds: state.beds.map((b) =>
            b.id === bedId ? { ...b, patches: [...b.patches, candidate] } : b,
          ),
        });
        return candidate;
      },

      removePatch: (bedId, patchId) => {
        const state = get();
        set({
          ...pushHistory(state),
          beds: state.beds.map((b) =>
            b.id === bedId
              ? { ...b, patches: b.patches.filter((p) => p.id !== patchId) }
              : b,
          ),
          selection:
            state.selection &&
            state.selection.kind === "plant" &&
            state.selection.patchId === patchId
              ? null
              : state.selection,
        });
      },

      resizePatch: (bedId, patchId, plantCols, plantRows) =>
        applyPatchUpdate(get, set, bedId, patchId, (current) => ({
          ...current,
          plantCols: Math.max(1, plantCols),
          plantRows: Math.max(1, plantRows),
        })),

      movePatch: (bedId, patchId, anchor) =>
        applyPatchUpdate(get, set, bedId, patchId, (current) => ({
          ...current,
          anchor: { ...anchor },
        })),

      setPatchSpacing: (bedId, patchId, spacingCm) =>
        applyPatchUpdate(get, set, bedId, patchId, (current) => ({
          ...current,
          spacingCm,
        })),

      setPatchSpacingMode: (bedId, patchId, spacingMode) =>
        applyPatchUpdate(get, set, bedId, patchId, (current) => ({
          ...current,
          spacingMode,
        })),

      setPatchArrangement: (bedId, patchId, arrangement) =>
        applyPatchUpdate(get, set, bedId, patchId, (current) => ({
          ...current,
          arrangement,
        })),

      addPlantToBed: (bedId, plantId, cellIndex) => {
        const bed = get().beds.find((b) => b.id === bedId);
        if (!bed) return null;
        if (cellIndex < 0 || cellIndex >= bed.cols * bed.rows) return null;
        return get().addPatch(bedId, {
          plantId,
          anchor: cellIndexToAnchor(cellIndex, bed.cols),
        });
      },

      removePlantInstance: (bedId, instanceId) => {
        get().removePatch(bedId, instanceId);
      },

      setSelection: (selection) => set({ selection }),

      setSeasonFilter: (month) => set({ seasonFilter: month }),

      addActivity: (input) => {
        const id = uid("act");
        const state = get();
        const next: GardenActivity = { id, ...input };
        const events = [next, ...state.events].sort((a, b) => b.at - a.at);
        set({ events });
      },

      removeActivity: (id) => {
        set((state) => ({
          events: state.events.filter((e) => e.id !== id),
        }));
      },

      updateActivity: (id, patch) => {
        const state = get();
        const exists = state.events.some((e) => e.id === id);
        if (!exists) return false;
        const events = state.events
          .map((e) => (e.id === id ? { ...e, ...patch } : e))
          .sort((a, b) => b.at - a.at);
        set({ events });
        return true;
      },

      acceptSuggestion: (s) => {
        const planned = s.suggestedFor > Date.now();
        if (s.items && s.items.length > 0) {
          const todo = s.items.filter((i) => i.needsAction);
          if (todo.length === 0) {
            get().dismissSuggestion(s.id);
            return;
          }
          for (const it of todo) {
            const notes = `${s.title} — ${it.rationale}`.slice(0, 650);
            get().addActivity({
              at: s.suggestedFor,
              kind: s.kind,
              notes,
              bedId: it.bedId,
              patchId: it.patchId,
              plantId: it.plantId,
              planned,
            });
          }
        } else {
          const notes = s.rationale
            ? `${s.title} — ${s.rationale}`
            : s.title;
          get().addActivity({
            at: s.suggestedFor,
            kind: s.kind,
            notes,
            bedId: s.bedId,
            patchId: s.patchId,
            plantId: s.plantId,
            planned,
          });
        }
        get().dismissSuggestion(s.id);
      },

      dismissSuggestion: (id) => {
        set((state) =>
          state.dismissedSuggestionIds.includes(id)
            ? state
            : {
                dismissedSuggestionIds: [
                  ...state.dismissedSuggestionIds,
                  id,
                ].slice(-200),
              },
        );
      },

      setCachedSuggestions: (cache) => {
        set({ cachedSuggestions: cache });
      },

      undo: () => {
        const state = get();
        if (state.past.length === 0) return;
        const previous = state.past[state.past.length - 1];
        const newPast = state.past.slice(0, -1);
        const future = [snapshot(state), ...state.future].slice(0, HISTORY_LIMIT);
        set({
          past: newPast,
          future,
          meta: previous.meta,
          beds: previous.beds,
          selection: null,
        });
      },

      redo: () => {
        const state = get();
        if (state.future.length === 0) return;
        const next = state.future[0];
        const newFuture = state.future.slice(1);
        const past = [...state.past, snapshot(state)].slice(-HISTORY_LIMIT);
        set({
          past,
          future: newFuture,
          meta: next.meta,
          beds: next.beds,
          selection: null,
        });
      },
    }),
    {
      // Keep the persist key stable so existing v1 data is found by zustand
      // and run through `migrate` below. The `version` field tracks the
      // schema upgrade.
      name: PERSIST_KEY,
      version: PERSIST_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        meta: state.meta,
        beds: state.beds,
        events: state.events,
        dismissedSuggestionIds: state.dismissedSuggestionIds,
        cachedSuggestions: state.cachedSuggestions,
        seasonFilter: state.seasonFilter,
        initialized: state.initialized,
      }),
      migrate: (persisted, fromVersion) => {
        return migratePersistedState(persisted, fromVersion);
      },
    },
  ),
);

// --- v1 -> v2 migration helpers ---------------------------------------------

type LegacyPlantInstance = {
  id: string;
  plantId: string;
  cellIndex: number;
};

type LegacyBed = {
  id: string;
  name: string;
  position: { x: number; y: number };
  cols: number;
  rows: number;
  cellSizeCm?: number;
  // v1 shape
  plants?: LegacyPlantInstance[];
  // v2 shape (already migrated)
  patches?: PlantPatch[];
};

function migrateBedV1ToV2(bed: LegacyBed): Bed {
  if (Array.isArray(bed.patches)) {
    return {
      id: bed.id,
      name: bed.name,
      position: bed.position,
      cols: bed.cols,
      rows: bed.rows,
      cellSizeCm: bed.cellSizeCm ?? DEFAULT_CELL_SIZE_CM,
      patches: bed.patches,
    };
  }
  const patches: PlantPatch[] = (bed.plants ?? []).map((p) => ({
    id: p.id,
    plantId: p.plantId,
    anchor: cellIndexToAnchor(p.cellIndex, bed.cols),
    plantCols: 1,
    plantRows: 1,
  }));
  return {
    id: bed.id,
    name: bed.name,
    position: bed.position,
    cols: bed.cols,
    rows: bed.rows,
    cellSizeCm: bed.cellSizeCm ?? DEFAULT_CELL_SIZE_CM,
    patches,
  };
}

export function migratePersistedState(persisted: unknown, fromVersion: number) {
  if (!persisted || typeof persisted !== "object") return persisted;
  let state = persisted as Partial<State> & {
    beds?: LegacyBed[];
  };
  if (fromVersion < 2) {
    const beds = (state.beds ?? []).map((b) => migrateBedV1ToV2(b));
    state = { ...state, beds } as Partial<State> & { beds?: LegacyBed[] };
  }
  if (fromVersion < 3) {
    const s = state as Partial<State>;
    state = {
      ...state,
      events: Array.isArray(s.events) ? s.events : [],
    } as typeof state;
  }
  if (fromVersion < 4) {
    const s = state as Partial<State>;
    state = {
      ...state,
      dismissedSuggestionIds: Array.isArray(s.dismissedSuggestionIds)
        ? s.dismissedSuggestionIds
        : [],
    } as typeof state;
  }
  if (fromVersion < 5) {
    const s = state as Partial<State>;
    state = {
      ...state,
      cachedSuggestions:
        s.cachedSuggestions && typeof s.cachedSuggestions === "object"
          ? s.cachedSuggestions
          : undefined,
    } as typeof state;
  }
  return state as Partial<State>;
}

// Re-export for callers that need to translate between cell index and anchor
export { anchorToCellIndex, cellIndexToAnchor };
