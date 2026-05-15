"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { EvolutionPlan } from "@/lib/evolution-plan/types";
import type { TipOfTheDay } from "@/lib/suggestions/tip-types";
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
  clampBedSizeCm,
  clampPatchPositionCm,
  clampPatchSizeCm,
  defaultPatchSizeCm,
  MAX_BED_SIDE_CM,
  migratePatchV6ToV7,
  MIN_BED_SIDE_CM,
  quantizeCm,
  type LegacyPatchV6,
} from "@/lib/utils/geometry";
import {
  anchorToCellIndex,
  cellIndexToAnchor,
  patchFitsInBed,
  patchesOverlap,
} from "@/lib/utils/spacing";
import { normalizeGardenLocation } from "@/lib/weather/location";
import { clearHourlyWeatherCache } from "@/lib/weather/hourly-weather-cache";
import { clearMonthWeatherCache } from "@/lib/weather/month-weather-cache";

const HISTORY_LIMIT = 30;

type Snapshot = {
  meta: GardenMeta;
  beds: Bed[];
};

export const PERSIST_KEY = "corto-garden-v1";
export const PERSIST_VERSION = 11;

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
  /** Daily tip cache (one per calendar day + garden layout) */
  cachedTipOfTheDay?: {
    dayKey: string;
    gardenFingerprint: string;
    tip: TipOfTheDay;
    savedAt: number;
  };
  /** IDs of evolution/rotation plans the user explicitly dismissed */
  dismissedEvolutionPlanIds: string[];
  /** Last evolution plan response (persisted cache) */
  cachedEvolutionPlans?: {
    plans: EvolutionPlan[];
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
  positionCm: { x: number; y: number };
  sizeCm?: { width: number; height: number };
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
  resizeBedCm: (id: string, widthCm: number, heightCm: number) => number;

  addPatch: (bedId: string, input: AddPatchInput) => PlantPatch | null;
  removePatch: (bedId: string, patchId: string) => void;
  resizePatchCm: (
    bedId: string,
    patchId: string,
    sizeCm: { width: number; height: number },
  ) => boolean;
  /** Moves the patch to a metric position. Returns `false` if invalid. */
  movePatchCm: (
    bedId: string,
    patchId: string,
    positionCm: { x: number; y: number },
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
  /** Sets or clears manual plant count for a patch. */
  setPatchPlantCount: (
    bedId: string,
    patchId: string,
    plantCount: number | undefined,
  ) => boolean;

  /** Creates a patch at a metric position (fluid catalog drop). */
  addPlantToBedAtCm: (
    bedId: string,
    plantId: string,
    positionCm: { x: number; y: number },
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
  setCachedTipOfTheDay: (cache: State["cachedTipOfTheDay"] | undefined) => void;

  /**
   * Accepts a rotation plan: creates a planned diary entry at
   * `transitionWindow.start` (trapianto for replace, nota otherwise).
   */
  acceptEvolutionPlan: (plan: EvolutionPlan, preferredPlantId?: string) => void;
  /** Marks an evolution plan as dismissed (persisted) */
  dismissEvolutionPlan: (id: string) => void;
  /** Saves (persisting) the last evolution plan response */
  setCachedEvolutionPlans: (
    cache: State["cachedEvolutionPlans"] | undefined,
  ) => void;

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
        positionCm: { ...p.positionCm },
        sizeCm: { ...p.sizeCm },
      })),
    })),
  };
}

function pushHistory(state: State): Pick<State, "past" | "future"> {
  const past = [...state.past, snapshot(state)].slice(-HISTORY_LIMIT);
  return { past, future: [] };
}

/**
 * Helper shared by `resizePatchCm`/`movePatchCm`/`setPatchSpacing`/...
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
      dismissedEvolutionPlanIds: [],
      cachedEvolutionPlans: undefined,
      selection: null,
      seasonFilter: defaultSeasonMonth(),
      initialized: false,
      past: [],
      future: [],

      initGarden: (name, sunOrientation, location) => {
        const normalizedLocation = normalizeGardenLocation(location);
        if (normalizedLocation) {
          clearMonthWeatherCache();
          clearHourlyWeatherCache();
        }
        set({
          meta: {
            name,
            sunOrientation,
            createdAt: Date.now(),
            ...(normalizedLocation ? { location: normalizedLocation } : {}),
          },
          beds: [],
          events: [],
          dismissedSuggestionIds: [],
          cachedSuggestions: undefined,
          dismissedEvolutionPlanIds: [],
          cachedEvolutionPlans: undefined,
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
          dismissedEvolutionPlanIds: [],
          cachedEvolutionPlans: undefined,
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
        const normalizedLocation = normalizeGardenLocation(location);
        const prev = state.meta.location;
        const changed =
          (prev?.lat !== normalizedLocation?.lat) ||
          (prev?.lon !== normalizedLocation?.lon) ||
          (prev?.timezone ?? "") !== (normalizedLocation?.timezone ?? "") ||
          Boolean(prev) !== Boolean(normalizedLocation);
        if (changed) {
          clearMonthWeatherCache();
          clearHourlyWeatherCache();
        }
        set({
          meta: normalizedLocation
            ? { ...state.meta, location: normalizedLocation }
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
          widthCm: 120,
          heightCm: 120,
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

      resizeBedCm: (id, widthCm, heightCm) => {
        const state = get();
        const bed = state.beds.find((b) => b.id === id);
        if (!bed) return 0;
        const size = clampBedSizeCm(widthCm, heightCm);
        if (size.width === bed.widthCm && size.height === bed.heightCm) return 0;

        const candidate: Bed = {
          ...bed,
          widthCm: size.width,
          heightCm: size.height,
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
          if (!patchFitsInBed(patch, candidate, plant)) {
            dropped++;
            continue;
          }
          const collides = kept.some((existing) =>
            patchesOverlap(patch, existing, candidate, plantById),
          );
          if (collides) {
            dropped++;
            continue;
          }
          kept.push(patch);
        }
        candidate.patches = kept;

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

        const spacing = input.spacingCm ?? plant.defaultSpacingCm;
        const sizeCm =
          input.sizeCm ?? defaultPatchSizeCm(spacing);

        const positionCm = clampPatchPositionCm(
          { sizeCm },
          bed,
          {
            x: quantizeCm(input.positionCm.x),
            y: quantizeCm(input.positionCm.y),
          },
        );

        const candidate: PlantPatch = {
          id: uid("patch"),
          plantId: input.plantId,
          positionCm,
          sizeCm,
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

      resizePatchCm: (bedId, patchId, sizeCm) => {
        const bed = get().beds.find((b) => b.id === bedId);
        if (!bed) return false;
        const current = bed.patches.find((p) => p.id === patchId);
        if (!current) return false;
        const clamped = clampPatchSizeCm(current, bed, sizeCm);
        return applyPatchUpdate(get, set, bedId, patchId, (patch) => ({
          ...patch,
          sizeCm: clamped,
        }));
      },

      movePatchCm: (bedId, patchId, positionCm) => {
        const bed = get().beds.find((b) => b.id === bedId);
        if (!bed) return false;
        const current = bed.patches.find((p) => p.id === patchId);
        if (!current) return false;
        const next = clampPatchPositionCm(current, bed, {
          x: quantizeCm(positionCm.x),
          y: quantizeCm(positionCm.y),
        });
        return applyPatchUpdate(get, set, bedId, patchId, (patch) => ({
          ...patch,
          positionCm: next,
        }));
      },

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

      setPatchPlantCount: (bedId, patchId, plantCount) =>
        applyPatchUpdate(get, set, bedId, patchId, (current) => ({
          ...current,
          plantCount,
        })),

      addPlantToBedAtCm: (bedId, plantId, positionCm) =>
        get().addPatch(bedId, { plantId, positionCm }),

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

      setCachedTipOfTheDay: (cache) => {
        set({ cachedTipOfTheDay: cache });
      },

      acceptEvolutionPlan: (plan, preferredPlantId) => {
        const at = Date.parse(`${plan.transitionWindow.start}T12:00:00`);
        const when = Number.isFinite(at) ? (at as number) : Date.now();
        const planned = when > Date.now();
        const notes = plan.rationale.slice(0, 650);
        const action = plan.recommendation.action;
        const targetPlantId =
          preferredPlantId ?? plan.recommendation.preferredPlantId;

        if (action === "replace" && targetPlantId) {
          const plant = plantById(targetPlantId);
          const title = plant
            ? `Rotazione → ${plant.emoji} ${plant.name}`
            : "Rotazione colturale";
          get().addActivity({
            at: when,
            kind: "transplanting",
            notes: `${title} — ${notes}`,
            bedId: plan.bedId,
            patchId: plan.patchId,
            plantId: targetPlantId,
            planned,
          });
        } else {
          const actionLabel: Record<EvolutionPlan["recommendation"]["action"], string> = {
            replace: "Sostituisci",
            keep: "Mantieni",
            rest: "Riposo suolo",
            green_manure: "Sovescio",
          };
          get().addActivity({
            at: when,
            kind: "note",
            notes: `${actionLabel[action]} — ${notes}`,
            bedId: plan.bedId,
            patchId: plan.patchId,
            plantId: plan.currentPlantId,
            planned,
          });
        }
        get().dismissEvolutionPlan(plan.id);
      },

      dismissEvolutionPlan: (id) => {
        set((state) =>
          state.dismissedEvolutionPlanIds.includes(id)
            ? state
            : {
                dismissedEvolutionPlanIds: [
                  ...state.dismissedEvolutionPlanIds,
                  id,
                ].slice(-200),
              },
        );
      },

      setCachedEvolutionPlans: (cache) => {
        set({ cachedEvolutionPlans: cache });
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
        cachedTipOfTheDay: state.cachedTipOfTheDay,
        dismissedEvolutionPlanIds: state.dismissedEvolutionPlanIds,
        cachedEvolutionPlans: state.cachedEvolutionPlans,
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

type LegacyBedV7 = {
  id: string;
  name: string;
  position: { x: number; y: number };
  cols: number;
  rows: number;
  cellSizeCm?: number;
  patches: PlantPatch[];
};

type LegacyBed = {
  id: string;
  name: string;
  position: { x: number; y: number };
  cols: number;
  rows: number;
  cellSizeCm?: number;
  plants?: LegacyPlantInstance[];
  patches?: Array<LegacyPatchV6 | PlantPatch>;
};

function normalizeBed(bed: Bed): Bed {
  return {
    ...bed,
    widthCm: Math.max(
      MIN_BED_SIDE_CM,
      Math.min(MAX_BED_SIDE_CM, bed.widthCm ?? 120),
    ),
    heightCm: Math.max(
      MIN_BED_SIDE_CM,
      Math.min(MAX_BED_SIDE_CM, bed.heightCm ?? 120),
    ),
    patches: bed.patches.map((p) => ({
      ...p,
      positionCm: { ...p.positionCm },
      sizeCm: { ...p.sizeCm },
    })),
  };
}

function stripGridStepFromBed(bed: Bed & { gridStepCm?: number }): Bed {
  const { gridStepCm: _removed, ...rest } = bed;
  return normalizeBed(rest as Bed);
}

function migrateBedV7ToV8(bed: LegacyBedV7 | Bed): Bed {
  if ("widthCm" in bed && typeof bed.widthCm === "number") {
    return stripGridStepFromBed(bed as Bed & { gridStepCm?: number });
  }
  const legacy = bed as LegacyBedV7;
  const cell = legacy.cellSizeCm ?? 30;
  return normalizeBed({
    id: legacy.id,
    name: legacy.name,
    position: legacy.position,
    widthCm: legacy.cols * cell,
    heightCm: legacy.rows * cell,
    patches: legacy.patches,
  });
}

function normalizeBeds(beds: Bed[]): Bed[] {
  return beds.map((b) => normalizeBed(b));
}

function isMetricPatch(patch: LegacyPatchV6 | PlantPatch): patch is PlantPatch {
  return (
    "positionCm" in patch &&
    "sizeCm" in patch &&
    patch.positionCm != null &&
    patch.sizeCm != null
  );
}

function ensureMetricPatch(
  patch: LegacyPatchV6 | PlantPatch,
  cellSize: number,
): PlantPatch {
  if (isMetricPatch(patch)) return patch;
  return migratePatchV6ToV7(patch, cellSize);
}

function migrateBedPatchesToMetric(bed: LegacyBed): LegacyBedV7 {
  const cell = bed.cellSizeCm ?? 30;
  let rawPatches: Array<LegacyPatchV6 | PlantPatch>;
  if (Array.isArray(bed.patches)) {
    rawPatches = bed.patches;
  } else {
    rawPatches = (bed.plants ?? []).map((p) => ({
      id: p.id,
      plantId: p.plantId,
      anchor: cellIndexToAnchor(p.cellIndex, bed.cols),
      plantCols: 1,
      plantRows: 1,
    }));
  }
  return {
    id: bed.id,
    name: bed.name,
    position: bed.position,
    cols: bed.cols,
    rows: bed.rows,
    cellSizeCm: cell,
    patches: rawPatches.map((p) => ensureMetricPatch(p, cell)),
  };
}

function migrateBedV1ToV2(bed: LegacyBed): LegacyBed {
  if (Array.isArray(bed.patches)) return bed;
  const patches: LegacyPatchV6[] = (bed.plants ?? []).map((p) => ({
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
    cellSizeCm: bed.cellSizeCm ?? 30,
    patches,
  };
}

export function migratePersistedState(persisted: unknown, fromVersion: number) {
  if (!persisted || typeof persisted !== "object") return persisted;
  let state = persisted as Partial<State> & {
    beds?: LegacyBed[];
  };
  if (fromVersion < 2) {
    const beds = (state.beds ?? []).map((b) =>
      migrateBedV1ToV2(b as unknown as LegacyBed),
    );
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
  if (fromVersion < 7) {
    const beds = (state.beds ?? []).map((b) =>
      migrateBedPatchesToMetric(b as unknown as LegacyBed),
    );
    state = { ...state, beds } as typeof state;
  }
  if (fromVersion < 8) {
    const beds = ((state.beds ?? []) as Array<LegacyBedV7 | Bed>).map((b) =>
      migrateBedV7ToV8(b),
    );
    state = { ...state, beds } as typeof state;
  }
  if (fromVersion < 9) {
    const beds = ((state.beds ?? []) as Array<Bed & { gridStepCm?: number }>).map(
      (b) => stripGridStepFromBed(b),
    );
    state = { ...state, beds } as typeof state;
  }
  if (fromVersion < 10) {
    const s = state as Partial<State>;
    state = {
      ...state,
      dismissedEvolutionPlanIds: Array.isArray(s.dismissedEvolutionPlanIds)
        ? s.dismissedEvolutionPlanIds
        : [],
      cachedEvolutionPlans:
        s.cachedEvolutionPlans && typeof s.cachedEvolutionPlans === "object"
          ? s.cachedEvolutionPlans
          : undefined,
    } as typeof state;
  }
  if (fromVersion < 11) {
    const s = state as Partial<State>;
    state = {
      ...state,
      cachedTipOfTheDay:
        s.cachedTipOfTheDay && typeof s.cachedTipOfTheDay === "object"
          ? s.cachedTipOfTheDay
          : undefined,
    } as typeof state;
  }
  const normalized = state as Partial<State>;
  if (Array.isArray(normalized.beds)) {
    state = {
      ...state,
      beds: normalizeBeds(normalized.beds as Bed[]),
    } as typeof state;
  }
  if (typeof normalized.seasonFilter !== "number") {
    state = { ...state, seasonFilter: defaultSeasonMonth() } as typeof state;
  }
  const meta = (state as Partial<State>).meta;
  if (meta && typeof meta === "object") {
    const loc = normalizeGardenLocation(
      (meta as GardenMeta).location,
    );
    const nextMeta = { ...(meta as GardenMeta) };
    if (loc) nextMeta.location = loc;
    else delete nextMeta.location;
    state = { ...state, meta: nextMeta } as typeof state;
  }
  return state as Partial<State>;
}

// Re-export for callers that need to translate between cell index and anchor
export { anchorToCellIndex, cellIndexToAnchor };
