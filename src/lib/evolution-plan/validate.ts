import { plantById } from "@/lib/data/plants";
import type { EvolutionPlan } from "@/lib/evolution-plan/types";
import type { RotationCandidate } from "@/lib/evolution-plan/scoring";

type RawAlt = {
  plantId?: unknown;
  score?: unknown;
  rotationReason?: unknown;
  tradeoffs?: unknown;
};

type RawPlan = {
  bedId?: unknown;
  patchId?: unknown;
  currentPlantId?: unknown;
  transitionWindow?: unknown;
  recommendation?: unknown;
  rationale?: unknown;
  confidence?: unknown;
};

function isString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function parseIsoDate(input: string): string | null {
  // Be tolerant: LLMs sometimes return full ISO datetimes.
  // We normalize to YYYY-MM-DD if the prefix matches.
  const s = input.trim();
  const prefix = s.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(prefix)) return null;
  return prefix;
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export type EvolutionValidatedContext = {
  patchIndex: Map<string, { bedId: string; plantId: string }>;
  candidatesByPatchId: Map<string, RotationCandidate[]>;
  dismissedIds?: ReadonlySet<string>;
};

function normalizeAlt(raw: unknown, allowedPlantIds: Set<string>): EvolutionPlan["recommendation"]["alternatives"][number] | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as RawAlt;
  if (!isString(r.plantId)) return null;
  if (!allowedPlantIds.has(r.plantId)) return null;
  if (!plantById(r.plantId)) return null;
  const score = typeof r.score === "number" ? Math.round(r.score) : null;
  if (score === null || score < 0 || score > 100) return null;
  if (!isString(r.rotationReason)) return null;
  const tradeoffs = Array.isArray(r.tradeoffs) ? r.tradeoffs.filter(isString).slice(0, 6) : [];
  return {
    plantId: r.plantId,
    score,
    rotationReason: r.rotationReason.slice(0, 240),
    tradeoffs: tradeoffs.map((t) => t.slice(0, 160)),
  };
}

export function validateEvolutionPlans(
  raw: unknown,
  nowMs: number,
  ctx: EvolutionValidatedContext,
): EvolutionPlan[] {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { plans?: unknown }).plans)) return [];
  const plansRaw = (raw as { plans: unknown[] }).plans;

  const out: EvolutionPlan[] = [];
  for (const item of plansRaw) {
    if (!item || typeof item !== "object") continue;
    const r = item as RawPlan;

    if (!isString(r.bedId)) continue;
    const bedId = r.bedId;

    const patchId = isString(r.patchId) ? r.patchId : undefined;
    if (patchId && !ctx.patchIndex.has(patchId)) continue;
    if (patchId) {
      const idx = ctx.patchIndex.get(patchId)!;
      if (idx.bedId !== bedId) continue;
    }

    const currentPlantId = isString(r.currentPlantId) ? r.currentPlantId : undefined;
    if (currentPlantId && !plantById(currentPlantId)) continue;

    if (!r.transitionWindow || typeof r.transitionWindow !== "object") continue;
    const tw = r.transitionWindow as { start?: unknown; end?: unknown };
    const start = isString(tw.start) ? parseIsoDate(tw.start) : null;
    const end = isString(tw.end) ? parseIsoDate(tw.end) : null;
    if (!start || !end) continue;

    if (!r.recommendation || typeof r.recommendation !== "object") continue;
    const rec = r.recommendation as {
      action?: unknown;
      preferredPlantId?: unknown;
      alternatives?: unknown;
    };

    const action = isString(rec.action) ? rec.action : null;
    if (!action || !["replace", "keep", "rest", "green_manure"].includes(action)) continue;

    const candidates = patchId ? ctx.candidatesByPatchId.get(patchId) ?? [] : [];
    const allowedSet = new Set(candidates.map((c) => c.plantId));

    const preferredPlantId = isString(rec.preferredPlantId) ? rec.preferredPlantId : undefined;
    if (action === "replace") {
      if (!preferredPlantId || !allowedSet.has(preferredPlantId)) continue;
    }

    const altsRaw = Array.isArray(rec.alternatives) ? rec.alternatives : [];
    const alts = altsRaw
      .map((a) => normalizeAlt(a, allowedSet))
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .slice(0, 5);

    const rationale = isString(r.rationale) ? r.rationale.slice(0, 1600) : null;
    if (!rationale) continue;

    const confidence = isString(r.confidence) ? r.confidence : null;
    const conf = confidence ? confidence.toLowerCase() : null;
    if (!conf || !["low", "medium", "high"].includes(conf)) continue;

    const id = uid("plan");
    if (ctx.dismissedIds?.has(id)) continue;

    out.push({
      id,
      bedId,
      patchId,
      currentPlantId,
      transitionWindow: { start, end },
      recommendation: {
        action: action as any,
        preferredPlantId: action === "replace" ? preferredPlantId : undefined,
        alternatives: alts,
      },
      rationale,
      confidence: conf as any,
    });
  }

  // Prefer piani con patchId (più concreti) e limita quantità.
  out.sort((a, b) => Number(Boolean(b.patchId)) - Number(Boolean(a.patchId)));
  return out.slice(0, 40);
}

