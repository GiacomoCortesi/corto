import type { WeatherDaySource } from "@/lib/weather/openmeteo";

export type WmoDayVisual = {
  emoji: string;
  label: string;
};

/** Open-Meteo WMO weather code → compact Italian label */
export function wmoDayVisual(code: number | null | undefined): WmoDayVisual {
  if (code == null) return { emoji: "·", label: "N/D" };
  if (code === 0) return { emoji: "☀️", label: "Sereno" };
  if (code === 1) return { emoji: "🌤️", label: "Prevalentemente sereno" };
  if (code === 2) return { emoji: "⛅", label: "Parzialmente nuvoloso" };
  if (code === 3) return { emoji: "☁️", label: "Nuvoloso" };
  if (code === 45 || code === 48) return { emoji: "🌫️", label: "Nebbia" };
  if (code >= 51 && code <= 57) return { emoji: "🌦️", label: "Pioggerella" };
  if (code >= 61 && code <= 67) return { emoji: "🌧️", label: "Pioggia" };
  if (code >= 71 && code <= 77) return { emoji: "❄️", label: "Neve" };
  if (code >= 80 && code <= 82) return { emoji: "🌧️", label: "Rovesci" };
  if (code >= 85 && code <= 86) return { emoji: "🌨️", label: "Neve a rovesci" };
  if (code >= 95 && code <= 99) return { emoji: "⛈️", label: "Temporale" };
  return { emoji: "🌡️", label: "Variabile" };
}

export function formatTempRange(tMin: number | null, tMax: number | null): string | null {
  if (tMin == null && tMax == null) return null;
  if (tMin != null && tMax != null) return `${Math.round(tMin)}° / ${Math.round(tMax)}°`;
  if (tMax != null) return `${Math.round(tMax)}°`;
  return `${Math.round(tMin!)}°`;
}

export function weatherSourceLabel(source?: WeatherDaySource): string | null {
  switch (source) {
    case "forecast":
      return "Previsione";
    case "archive":
      return "Dati osservati";
    case "climatology":
      return "Media storica";
    default:
      return null;
  }
}
