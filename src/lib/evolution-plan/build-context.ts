import type { Plant } from "@/lib/types";
import { plantById, PLANTS } from "@/lib/data/plants";
import type { EvolutionGardenSnapshot } from "@/lib/evolution-plan/types";
import type { RotationCandidate, RotationStrategy } from "@/lib/evolution-plan/scoring";
import { scoreCandidatesForPatch } from "@/lib/evolution-plan/scoring";
import { bedCellSizeCm } from "@/lib/utils/spacing";

function isoDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function plantSummary(p: Plant): string {
  const fam = p.cropFamily ? `fam=${p.cropFamily}` : "fam=?";
  const grp = p.rotationGroup ? `grp=${p.rotationGroup}` : "grp=?";
  const demand = p.fertilizer?.demand ? `demand=${p.fertilizer.demand}` : "demand=?";
  const sowing = p.sowing.length ? `sem ${p.sowing.join(",")}` : "";
  const transplanting = (p.transplanting ?? []).length ? `trap ${(p.transplanting ?? []).join(",")}` : "";
  const harvest = p.harvest.length ? `racc ${p.harvest.join(",")}` : "";
  const season = [sowing, transplanting, harvest].filter(Boolean).join(" | ");
  return `${p.name} [${p.id}] (${p.category}, ${fam}, ${grp}, ${demand}, sole=${p.sun}, acqua=${p.water}, ${season})`;
}

export type BuiltEvolutionContext = {
  text: string;
  patchIndex: Map<string, { bedId: string; plantId: string }>;
  candidatesByPatchId: Map<string, RotationCandidate[]>;
};

export function buildEvolutionContext(args: {
  snapshot: EvolutionGardenSnapshot;
  weatherSummary: string | null;
  nowMs: number;
  horizonMonths: number;
  strategy: RotationStrategy;
}): BuiltEvolutionContext {
  const { snapshot, weatherSummary, nowMs, horizonMonths, strategy } = args;

  const lines: string[] = [];
  const patchIndex = new Map<string, { bedId: string; plantId: string }>();
  const candidatesByPatchId = new Map<string, RotationCandidate[]>();

  lines.push(`# Orto: ${snapshot.meta.name}`);
  lines.push(`Esposizione prevalente: ${snapshot.meta.sunOrientation}`);
  lines.push(`Data corrente: ${isoDate(nowMs)} (timestamp ${nowMs}).`);
  lines.push(`Orizzonte: ${horizonMonths} mesi. Strategia: ${strategy}.`);

  if (snapshot.meta.location) {
    const l = snapshot.meta.location;
    lines.push(
      `Posizione: ${l.label ?? `${l.lat},${l.lon}`} (lat ${l.lat}, lon ${l.lon})${l.timezone ? `, tz ${l.timezone}` : ""}`,
    );
  } else {
    lines.push(`Posizione: non impostata.`);
  }

  if (weatherSummary) {
    lines.push("", "## Meteo previsto", weatherSummary);
  } else {
    lines.push("", "## Meteo: non disponibile", "Nessun forecast: ragiona su stagione e rotazioni.");
  }

  lines.push("", "## Aiuole e patch");
  const allPlantIds = PLANTS.map((p) => p.id);

  for (const bed of snapshot.beds) {
    const cell = bedCellSizeCm(bed as any);
    const w = (bed.cols * cell) / 100;
    const h = (bed.rows * cell) / 100;
    lines.push(`### Aiuola "${bed.name}" [${bed.id}] — ${w.toFixed(2)}x${h.toFixed(2)} m, cella ${cell} cm`);

    if (bed.patches.length === 0) {
      lines.push("  (nessun patch piantato)");
      continue;
    }

    for (const patch of bed.patches) {
      const plant = plantById(patch.plantId);
      if (!plant) continue;
      patchIndex.set(patch.id, { bedId: bed.id, plantId: patch.plantId });

      lines.push(`- patch [${patch.id}] (${patch.plantCols}x${patch.plantRows}) ${plantSummary(plant)}`);

      const candidates = scoreCandidatesForPatch({
        bed: bed as any,
        patch: patch as any,
        events: snapshot.events as any,
        allPlantIds,
        ctx: { nowMs, horizonMonths, strategy },
      });
      candidatesByPatchId.set(patch.id, candidates);
    }
  }

  lines.push("", "## Candidati per patch (ID e score vincolanti)");
  for (const [patchId, cands] of candidatesByPatchId.entries()) {
    const head = cands.slice(0, 10).map((c) => `${c.plantId}:${c.score}`).join(", ");
    lines.push(`- patch ${patchId}: ${head}${cands.length > 10 ? ", ..." : ""}`);
  }
  lines.push(
    "",
    "Regola: per action=replace devi scegliere preferredPlantId tra i candidati del patch corrispondente.",
    "Puoi citare le ragioni/tradeoff dei candidati, ma non modificare i punteggi.",
  );

  return { text: lines.join("\n"), patchIndex, candidatesByPatchId };
}

