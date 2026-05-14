/**
 * Turns a client-side `GardenSnapshot` plus optional weather into a textual
 * "context" block for the LLM prompt. We intentionally keep it compact
 * (tokens!) and readable.
 */

import type {
  GardenActivity,
  GardenActivityKind,
  Plant,
  PlantPatch,
} from "@/lib/types";
import { plantById } from "@/lib/data/plants";
import type { GardenSnapshot } from "@/lib/suggestions/types";

const KIND_LABEL_IT: Record<GardenActivityKind, string> = {
  sowing: "semina",
  weeding: "sarchiatura",
  watering: "annaffiatura",
  transplanting: "trapianto",
  treatment: "trattamento",
  harvest: "raccolta",
  note: "nota",
  other: "altro",
};

function isoDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysAgo(ts: number, now: number): number {
  return Math.floor((now - ts) / 86_400_000);
}

function plantSummary(p: Plant): string {
  // One compact line with what’s needed for reasoning:
  // category, water, sun, sowing/harvest months, short fert/treatments.
  const sowing = p.sowing.length ? `sem ${p.sowing.join(",")}` : "";
  const transplanting = (p.transplanting ?? []).length
    ? `trap ${(p.transplanting ?? []).join(",")}`
    : "";
  const harvest = p.harvest.length ? `racc ${p.harvest.join(",")}` : "";
  const fert = p.fertilizer
    ? `, fert: ${p.fertilizer.demand} (${p.fertilizer.schedule})`
    : "";
  const pests = p.treatments?.pests?.length
    ? `, avversita': ${p.treatments.pests.slice(0, 3).join(" / ")}`
    : "";
  const season = [sowing, transplanting, harvest].filter(Boolean).join(" | ");
  return `${p.name} [${p.id}] (${p.category}, sole=${p.sun}, acqua=${p.water}, ${season}${fert}${pests})`;
}

/**
 * For each patch, finds the "starting" event (oldest sowing or transplanting
 * for that patch). Used to estimate patch age.
 */
function patchStartTs(
  patch: PlantPatch,
  events: GardenActivity[],
): number | null {
  const matches = events.filter(
    (e) =>
      e.patchId === patch.id &&
      (e.kind === "sowing" || e.kind === "transplanting"),
  );
  if (matches.length === 0) return null;
  return Math.min(...matches.map((m) => m.at));
}

/**
 * For each (patchId, kind), finds the timestamp of the most recent event.
 * This lets the model reason like "weeding on patch X: 8 days ago".
 */
function lastEventByPatchAndKind(
  events: GardenActivity[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of events) {
    if (!e.patchId) continue;
    const key = `${e.patchId}:${e.kind}`;
    const prev = m.get(key);
    if (prev === undefined || e.at > prev) m.set(key, e.at);
  }
  return m;
}

const RELEVANT_KINDS: GardenActivityKind[] = [
  "sowing",
  "transplanting",
  "weeding",
  "watering",
  "treatment",
  "harvest",
];

export type BuiltContext = {
  /** Markdown-ish text to inject as the user message in the prompt */
  text: string;
  /** Server-side lookup to enrich the response (e.g. plantId from patchId) */
  patchIndex: Map<string, { bedId: string; plantId: string }>;
};

export function buildContext(
  snapshot: GardenSnapshot,
  weatherSummary: string | null,
  now: number,
): BuiltContext {
  const lines: string[] = [];
  const patchIndex = new Map<string, { bedId: string; plantId: string }>();
  const lastByKind = lastEventByPatchAndKind(snapshot.events);

  lines.push(`# Orto: ${snapshot.meta.name}`);
  lines.push(`Esposizione prevalente: ${snapshot.meta.sunOrientation}`);
  if (snapshot.meta.location) {
    const l = snapshot.meta.location;
    lines.push(
      `Posizione: ${l.label ?? `${l.lat},${l.lon}`} (lat ${l.lat}, lon ${l.lon})${l.timezone ? `, tz ${l.timezone}` : ""}`,
    );
  } else {
    lines.push(`Posizione: non impostata.`);
  }
  lines.push(`Data corrente: ${isoDate(now)} (timestamp ${now}).`);

  if (weatherSummary) {
    lines.push("", "## Meteo previsto", weatherSummary);
  } else {
    lines.push(
      "",
      "## Meteo: non disponibile",
      "Nessun forecast: ragiona solo su stagione corrente e cadenze di specie.",
    );
  }

  lines.push("", "## Aiuole e patch piantati");
  if (snapshot.beds.length === 0) {
    lines.push("(nessuna aiuola)");
  }
  for (const bed of snapshot.beds) {
    const w = bed.widthCm / 100;
    const h = bed.heightCm / 100;
    lines.push(
      `### Aiuola "${bed.name}" [${bed.id}] — ${w.toFixed(2)}x${h.toFixed(2)} m`,
    );
    if (bed.patches.length === 0) {
      lines.push("  (nessun patch piantato)");
      continue;
    }
    for (const patch of bed.patches) {
      const plant = plantById(patch.plantId);
      if (!plant) continue;
      patchIndex.set(patch.id, { bedId: bed.id, plantId: patch.plantId });

      const startTs = patchStartTs(patch, snapshot.events);
      const ageStr =
        startTs !== null
          ? `, piantato ${daysAgo(startTs, now)}gg fa (${isoDate(startTs)})`
          : ", piantato: data sconosciuta";

      const cadenceLines: string[] = [];
      for (const k of ["weeding", "watering", "treatment"] as const) {
        const last = lastByKind.get(`${patch.id}:${k}`);
        if (last) {
          cadenceLines.push(
            `${KIND_LABEL_IT[k]}: ultima ${daysAgo(last, now)}gg fa (${isoDate(last)})`,
          );
        }
      }
      const cadenceStr = cadenceLines.length
        ? ` | ultime: ${cadenceLines.join("; ")}`
        : " | nessuna attivita' registrata su questo patch";

      lines.push(
        `- patch [${patch.id}] (${Math.round(patch.sizeCm.width)}×${Math.round(patch.sizeCm.height)} cm) ${plantSummary(plant)}${ageStr}${cadenceStr}`,
      );
    }
  }

  lines.push("", "## Eventi recenti (ultimi 60 gg, max 80 voci)");
  const cutoff = now - 60 * 86_400_000;
  const recent = snapshot.events
    .filter((e) => e.at >= cutoff && RELEVANT_KINDS.includes(e.kind))
    .sort((a, b) => b.at - a.at)
    .slice(0, 80);
  if (recent.length === 0) {
    lines.push("(nessun evento recente)");
  } else {
    for (const e of recent) {
      const target = e.patchId
        ? `patch=${e.patchId}`
        : e.bedId
          ? `aiuola=${e.bedId}`
          : "tutto l'orto";
      const plant = e.plantId ? plantById(e.plantId) : null;
      const plantStr = plant ? ` (${plant.name})` : "";
      const note = e.notes ? ` — ${e.notes.slice(0, 120)}` : "";
      lines.push(
        `- ${isoDate(e.at)} [${KIND_LABEL_IT[e.kind]}] ${target}${plantStr}${note}`,
      );
    }
  }

  const allPatchIds = [...patchIndex.keys()];
  if (allPatchIds.length > 0) {
    lines.push(
      "",
      "## Elenco patch (ID obbligatori negli `items`)",
      `ID validi, tutti da valutare per attività come annaffiatura, sarchiatura, trattamento: ${allPatchIds.join(", ")}.`,
      "Per ciascun `kind` che includi tra queste attività, l'array `items` deve contenere **esattamente una riga per ogni** di questi `patchId` (nessuno escluso, nessun duplicato).",
    );
  }

  return { text: lines.join("\n"), patchIndex };
}
