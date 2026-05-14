import type { Forecast, ForecastDay } from "@/lib/weather/openmeteo";
import type { TipOfTheDay } from "@/lib/suggestions/tip-types";

/** Sum of forecast precipitation (mm) for the first `count` days. */
export function rainInNextDays(days: ForecastDay[], count: number): number {
  return days
    .slice(0, count)
    .reduce((acc, d) => acc + Math.max(0, d.precipMm ?? 0), 0);
}

/**
 * When true, a tip that recommends watering today would contradict the forecast.
 * Thresholds aligned with the main suggestions engine (≥5–10 mm soon).
 */
export function shouldSkipWateringTip(days: ForecastDay[]): boolean {
  if (days.length === 0) return false;
  const next3Mm = rainInNextDays(days, 3);
  const peakNext2Mm = Math.max(
    ...days.slice(0, 2).map((d) => Math.max(0, d.precipMm ?? 0)),
  );
  return next3Mm >= 5 || peakNext2Mm >= 3;
}

export function tipSuggestsWatering(tip: Pick<TipOfTheDay, "headline" | "reason" | "kind" | "category">): boolean {
  if (tip.kind === "watering") return true;
  const text = `${tip.headline} ${tip.reason}`.toLowerCase();
  return /annaff|innaff|irrig/.test(text);
}

/** Extra context block with non-negotiable watering rules for the LLM. */
export function buildTipWeatherRulesBlock(forecast: Forecast | null): string {
  if (!forecast || forecast.days.length === 0) {
    return [
      "## Vincoli meteo per il consiglio",
      "- Meteo non disponibile: non basare un consiglio di annaffiatura solo su supposizioni.",
      "- Se non hai dati meteo, evita category `weather` con annaffiatura.",
    ].join("\n");
  }

  const next3Mm = rainInNextDays(forecast.days, 3);
  const rainyDays = forecast.days
    .slice(0, 3)
    .filter((d) => (d.precipMm ?? 0) >= 1);

  if (shouldSkipWateringTip(forecast.days)) {
    const detail =
      rainyDays.length > 0
        ? `~${next3Mm.toFixed(1)} mm nei prossimi 3 giorni (${rainyDays.length} gg con pioggia).`
        : `precipitazioni previste nei prossimi giorni.`;
    return [
      "## Vincoli meteo per il consiglio (OBBLIGATORI)",
      `- È prevista pioggia: ${detail}`,
      "- NON suggerire annaffiatura o irrigazione oggi (`kind` ≠ `watering`; niente testo che inviti ad annaffiare).",
      "- NON usare la pioggia imminente come motivo per annaffiare oggi: sarebbe contraddittorio.",
      "- Se l'annaffiatura sembrava l'unica idea, scegli un altro consiglio (cura, semina, raccolta, sarchiatura, preparazione letto).",
    ].join("\n");
  }

  return [
    "## Vincoli meteo per il consiglio",
    "- Nei prossimi 3 giorni non è prevista pioggia significativa.",
    "- L'annaffiatura può essere pertinente solo se le piante nell'orto ne hanno bisogno e il suolo è asciutto.",
  ].join("\n");
}
