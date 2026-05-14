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
export const PERSIST_VERSION = 6;

export function defaultSeasonMonth(): number {
  return new Date().getMonth() + 1;
}

export function normalizeSeasonFilter(month: unknown): number {
  if (typeof month === "number" && month >= 1 && month <= 12) return month;
  return defaultSeasonMonth();
}

type State = {
  meta: GardenMeta;
  beds: Bed[];
  /** Activity log (separate from the layout undo snapshot) */
  events: GardenActivity[];
  /** IDs of suggestions the user explicitly dismissed */
  dismissedSuggestionIds: string[];
  /** Last suggestions response (persisted cache) */
  cachedSuggestions?: {
    items: Suggestion[];
    weatherSummary?: string;
    savedAt: number;
  };
  selection: Selection;
  seasonFilter: number;
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
   * Changes grid resolution while preserving the bed's physical size in cm.
   * Rescales `cols`/`rows` and each patch `anchor` to the new step. Patches
   * that no longer fit in the grid after rescaling (or that collide with each
   * other after rounding) are dropped. Returns the number of dropped patches
   * (0 = perfect rescale).
   */
  setBedCellSize: (id: string, cellSizeCm: number) => number;

  addPatch: (bedId: string, input: AddPatchInput) => PlantPatch | null;
  removePatch: (bedId: string, patchId: string) => void;
  /** Resizes the patch. Returns `false` if the change was rejected
   *  (overlap or bed overflow). */
  resizePatch: (
    bedId: string,
    patchId: string,
    plantCols: number,
    plantRows: number,
  ) => boolean;
  /** Moves the patch. Returns `false` if the new position is invalid. */
  movePatch: (
    bedId: string,
    patchId: string,
    anchor: { col: number; row: number },
  ) => boolean;
  /** Changes (or resets) patch spacing. Returns `false` if rejected. */
  setPatchSpacing: (
    bedId: string,
    patchId: string,
    spacingCm: number | undefined,
  ) => boolean;
  /** Changes (or resets) the spacing convention. Returns `false` if rejected. */
  setPatchSpacingMode: (
    bedId: string,
    patchId: string,
    spacingMode: SpacingMode | undefined,
  ) => boolean;
  /** Changes (or resets) the arrangement (square/triangular). Returns `false` if rejected. */
  setPatchArrangement: (
    bedId: string,
    patchId: string,
    arrangement: PatchArrangement | undefined,
  ) => boolean;

  /** Backward-compatible wrapper: creates a 1x1 patch on the given cell. */
  addPlantToBed: (
    bedId: string,
    plantId: string,
    cellIndex: number,
  ) => PlantPatch | null;
  /** Backward-compatible wrapper: equivalent to `removePatch`. */
  removePlantInstance: (bedId: string, instanceId: string) => void;

  setSelection: (selection: Selection) => void;
  setSeasonFilter: (month: number) => void;

  addActivity: (input: AddActivityInput) => void;
  removeActivity: (id: string) => void;
  /**
   * Updates an existing activity. Returns `false` if it doesn't exist.
   * Used by the Log to mark a planned activity as done (moves `at` to now and
   * removes `planned`).
   */
  updateActivity: (id: string, patch: Partial<Omit<GardenActivity, "id">>) => boolean;

  /**
   * Accepts a suggestion: creates a planned activity with `at` equal to
   * `suggestedFor` and marks it as `planned: true`.
   */
  acceptSuggestion: (s: Suggestion) => void;
  /** Marks a suggestion as dismissed (persisted) */
  dismissSuggestion: (id: string) => void;
  /** Saves (persisting) the last suggestions response */
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
 * Helper shared by `resizePatch`/`movePatch`/`setPatchSpacing`/...
 * Applies `update` to the patch, validates fit + overlap in the bed, and
 * updates the store. Returns `true` if applied, `false` if rejected (overlap,
 * overflow, missing objects).
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
      seasonFilter: defaultSeasonMonth(),
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
          seasonFilter: defaultSeasonMonth(),
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
          seasonFilter: defaultSeasonMonth(),
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
                // Removes location without leaving the key as undefined in JSON.
                const next = { ...state.meta };
                delete next.location;
                return next;
              })(),
        });
      },

      addBed: (position) => {
        const state = get();
        const id = uid("bed");
        // Default to 5 cm resolution so patch footprints (e.g. carrot 8 cm,
        // lettuce 20 cm) align accurately to the grid. 24 x 24 = 1.20 m x 1.20 m,
        // the same visual size as the old default 4 x 4 at 30 cm.
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

      setSeasonFilter: (month) =>
        set({ seasonFilter: normalizeSeasonFilter(month) }),

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
  if (fromVersion < 6) {
    const s = state as Partial<State>;
    state = {
      ...state,
      seasonFilter: normalizeSeasonFilter(s.seasonFilter),
    } as typeof state;
  }
  const normalized = state as Partial<State>;
  if (typeof normalized.seasonFilter !== "number") {
    state = { ...state, seasonFilter: defaultSeasonMonth() } as typeof state;
  }
  return state as Partial<State>;
}

// Re-export for callers that need to translate between cell index and anchor
export { anchorToCellIndex, cellIndexToAnchor };
