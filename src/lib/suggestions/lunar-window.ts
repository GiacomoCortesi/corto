/**
 * Compact lunar calendar summary for the LLM suggestion window.
 */

import { getMoonPhaseForDate } from "@/lib/lunar/phase";

const DAY_MS = 86_400_000;

function isoFromMs(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Groups consecutive days with the same waxing/waning trend to save tokens. */
export function summarizeLunarWindow(nowMs: number, days = 14): string {
  const lines: string[] = [];
  let prevTrend: "crescente" | "calante" | null = null;

  for (let i = 0; i < days; i++) {
    const ts = nowMs + i * DAY_MS;
    const d = new Date(ts);
    const moon = getMoonPhaseForDate(
      d.getFullYear(),
      d.getMonth() + 1,
      d.getDate(),
    );
    const trend = moon.waxing ? "crescente" : "calante";
    const iso = isoFromMs(ts);

    if (trend !== prevTrend) {
      lines.push(
        `- da ${iso}: ${moon.emoji} ${moon.labelIt} (fase ${trend})`,
      );
      prevTrend = trend;
    }

    if (moon.phase === "full") {
      lines.push(`  ⚠ ${iso}: luna piena — evita potature forti, trapianti delicati, raccolte da conserva`);
    }
    if (moon.phase === "new") {
      lines.push(
        `  ⚠ ${iso}: luna nuova — periodo poco attivo; evita semine lente e lavori importanti sulle radici`,
      );
    }
  }

  if (lines.length === 0) {
    return "(nessun dato lunare)";
  }

  return [
    ...lines,
    "Nota: tradizione orticola italiana; usare come criterio secondario rispetto a meteo ed eventi.",
  ].join("\n");
}
