import type { Bed, GardenActivity, Plant, PlantPatch } from "@/lib/types";
import { plantById } from "@/lib/data/plants";

export type RotationStrategy = "balanced" | "soilRecovery" | "production";

export type RotationCandidate = {
  plantId: string;
  score: number; // 0..100
  reasons: string[];
  tradeoffs: string[];
};

export type RotationContext = {
  nowMs: number;
  horizonMonths: number;
  strategy: RotationStrategy;
};

type PatchHistory = {
  /** Ultima pianta nota sul patch (attuale). */
  currentPlant: Plant;
  /** Famiglie recentemente presenti nell'aiuola (approssimazione). */
  recentFamilies: Array<{ family: string; lastSeenMs: number }>;
  /** Ultima domanda nutritiva vista nell'aiuola (se ricavabile). */
  lastDemand: Plant["fertilizer"] extends infer F
    ? F extends { demand: infer D }
      ? D | null
      : null
    : null;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function monthFromTs(ts: number): number {
  return new Date(ts).getMonth() + 1;
}

function addMonthsIso(nowMs: number, months: number): string {
  const d = new Date(nowMs);
  d.setMonth(d.getMonth() + months);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function plantDemand(p: Plant): "low" | "medium" | "high" | "fixer" | null {
  return p.fertilizer?.demand ?? null;
}

function plantFamily(p: Plant): string | null {
  return p.cropFamily ?? null;
}

function plantGroup(p: Plant): string | null {
  return p.rotationGroup ?? null;
}

function isPlantInSeason(p: Plant, month: number): boolean {
  return (
    p.sowing.includes(month) ||
    (p.transplanting ?? []).includes(month) ||
    p.harvest.includes(month)
  );
}

function isPlantInSeasonBetween(p: Plant, startMonth: number, endMonth: number): boolean {
  // Inclusive range, supports wrap-around (e.g. Nov -> Feb).
  const months: number[] = [];
  let m = startMonth;
  for (let i = 0; i < 12; i++) {
    months.push(m);
    if (m === endMonth) break;
    m = (m % 12) + 1;
  }
  return months.some((mm) => isPlantInSeason(p, mm));
}

function isCompatibleWithSunWater(current: Plant, candidate: Plant): boolean {
  // Non blocchiamo per sole/acqua (orto domestico), ma penalizziamo mismatch forti.
  // Qui solo “hard” per evitare suggerimenti chiaramente opposti.
  if (current.sun === "shade" && candidate.sun === "full") return false;
  return true;
}

function buildHistory(
  bed: Bed,
  patch: PlantPatch,
  events: GardenActivity[],
): PatchHistory | null {
  const currentPlant = plantById(patch.plantId);
  if (!currentPlant) return null;

  // Approssimazione: usiamo gli eventi dell'aiuola con plantId per ricostruire famiglie “recenti”.
  // Non abbiamo una storia di sostituzioni patch, quindi è volutamente semplice.
  const bedEvents = events.filter((e) => e.bedId === bed.id && e.plantId);
  const familyByPlantId = (pid: string) => {
    const p = plantById(pid);
    return p?.cropFamily ?? null;
  };

  const recentFamilies: Array<{ family: string; lastSeenMs: number }> = [];
  const seen = new Map<string, number>();
  for (const e of bedEvents) {
    const fam = e.plantId ? familyByPlantId(e.plantId) : null;
    if (!fam) continue;
    const prev = seen.get(fam);
    if (prev === undefined || e.at > prev) seen.set(fam, e.at);
  }
  for (const [family, lastSeenMs] of seen.entries()) recentFamilies.push({ family, lastSeenMs });
  recentFamilies.sort((a, b) => b.lastSeenMs - a.lastSeenMs);

  const lastDemand = (() => {
    // Prendiamo l'evento più recente con plantId (sull'aiuola) e leggiamo demand.
    const last = bedEvents.sort((a, b) => b.at - a.at)[0];
    const p = last?.plantId ? plantById(last.plantId) : null;
    return p ? plantDemand(p) : null;
  })();

  return { currentPlant, recentFamilies, lastDemand };
}

export function scoreCandidatesForPatch(args: {
  bed: Bed;
  patch: PlantPatch;
  events: GardenActivity[];
  allPlantIds: string[];
  ctx: RotationContext;
  /** Per evitare consociazioni negative immediate: plantIds dei patch vicini (opzionale). */
  neighborPlantIds?: string[];
}): RotationCandidate[] {
  const { bed, patch, events, allPlantIds, ctx, neighborPlantIds } = args;
  const history = buildHistory(bed, patch, events);
  const currentPlant = history?.currentPlant ?? plantById(patch.plantId);
  if (!currentPlant) return [];

  const nowMonth = monthFromTs(ctx.nowMs);
  const horizonMonth = monthFromTs(Date.parse(addMonthsIso(ctx.nowMs, ctx.horizonMonths)));

  const currentFamily = plantFamily(currentPlant);
  const currentGroup = plantGroup(currentPlant);
  const currentDemand = plantDemand(currentPlant);
  const neighborSet = new Set(neighborPlantIds ?? []);

  const out: RotationCandidate[] = [];

  for (const pid of allPlantIds) {
    const cand = plantById(pid);
    if (!cand) continue;
    if (pid === currentPlant.id) continue;

    // Stagionalità: accettiamo se è “in stagione” in QUALSIASI mese tra ora e l'orizzonte.
    // (Usare solo nowMonth/horizonMonth rende i candidati troppo pochi e distorti.)
    const inSeason = isPlantInSeasonBetween(cand, nowMonth, horizonMonth);
    if (!inSeason) continue;

    if (!isCompatibleWithSunWater(currentPlant, cand)) continue;

    let score = 60;
    const reasons: string[] = [];
    const tradeoffs: string[] = [];

    // Rotazione per famiglia/gruppo: evitare uguali.
    const candFamily = plantFamily(cand);
    const candGroup = plantGroup(cand);

    if (currentFamily && candFamily && currentFamily === candFamily) {
      score -= 30;
      tradeoffs.push("Stessa famiglia della coltura attuale (rotazione sfavorevole).");
    } else if (currentGroup && candGroup && currentGroup === candGroup) {
      score -= 10;
      tradeoffs.push("Stesso gruppo di rotazione della coltura attuale.");
    } else {
      score += 10;
      reasons.push("Cambia famiglia/gruppo rispetto alla coltura attuale.");
    }

    // Break years: se la famiglia è apparsa recentemente nell'aiuola, penalizza.
    if (candFamily && history?.recentFamilies?.length) {
      const seen = history.recentFamilies.find((x) => x.family === candFamily);
      const breakYears = cand.rotationBreakYears ?? 0;
      if (seen && breakYears > 0) {
        const yearsAgo = (ctx.nowMs - seen.lastSeenMs) / (365 * 86_400_000);
        if (yearsAgo < breakYears) {
          score -= 20;
          tradeoffs.push(`Famiglia vista in aiuola recentemente (break consigliato ${breakYears} anni).`);
        }
      }
    }

    // Domanda nutritiva: evitare “high -> high”, favorire azotofissatrici dopo high.
    const candDemand = plantDemand(cand);
    if (currentDemand === "high" && candDemand === "high") {
      score -= 15;
      tradeoffs.push("Due colture molto esigenti consecutive: rischio impoverimento.");
    }
    if (currentDemand === "high" && candDemand === "fixer") {
      // Keep this boost moderate, otherwise the planner will suggest legumes everywhere.
      score += 10;
      reasons.push("Leguminosa azotofissatrice dopo coltura esigente: recupero suolo.");
    }
    if (ctx.strategy === "soilRecovery" && candDemand === "fixer") {
      score += 4;
      reasons.push("Strategia recupero suolo: priorità alle azotofissatrici.");
    }
    if (ctx.strategy === "production" && (candDemand === "high" || cand.category === "frutto")) {
      score += 6;
      reasons.push("Strategia produttiva: preferenza per colture ad alta resa.");
    }

    // Succession planting: for leafy crops, it's often useful to rotate into another "da taglio".
    if (currentPlant.category === "foglia" && cand.category === "foglia") {
      score += 6;
      reasons.push("Successione: coltura da foglia/da taglio dopo foglia (gestione scalare).");
    }

    // Companions/antagonists: usa solo neighbor set (se disponibile).
    if (neighborSet.size > 0) {
      const bad =
        cand.antagonists?.filter((x) => neighborSet.has(x.plantId)) ?? [];
      const good =
        cand.companions?.filter((x) => neighborSet.has(x.plantId)) ?? [];
      if (bad.length > 0) {
        score -= 12;
        tradeoffs.push("Conflitti di consociazione con piante vicine.");
      }
      if (good.length > 0) {
        score += 8;
        reasons.push("Buona consociazione con piante vicine.");
      }
    }

    // Se la pianta non ha metadati di rotazione, penalizza leggermente (incertezza).
    if (!cand.cropFamily && !cand.rotationGroup) {
      score -= 5;
      tradeoffs.push("Metadati di rotazione incompleti: raccomandazione meno robusta.");
    }

    score = clamp(Math.round(score), 0, 100);
    if (score < 35) continue;

    out.push({ plantId: pid, score, reasons, tradeoffs });
  }

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 12);
}

