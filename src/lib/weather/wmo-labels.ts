import type {
  ForecastDay,
  ForecastHour,
  WeatherDaySource,
} from "@/lib/weather/openmeteo";

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

export type WeatherDayDetailLine = {
  label: string;
  value: string;
};

/** Structured lines for weather tooltips and compact summaries. */
export function weatherDayDetailLines(
  weather: ForecastDay,
): WeatherDayDetailLine[] {
  const wmo = wmoDayVisual(weather.weatherCode);
  const lines: WeatherDayDetailLine[] = [
    { label: "Condizioni", value: `${wmo.emoji} ${wmo.label}`.trim() },
  ];

  const temps = formatTempRange(weather.tMin, weather.tMax);
  if (temps) lines.push({ label: "Temperature", value: temps });

  if (weather.precipMm != null && weather.precipMm >= 0.1) {
    lines.push({
      label: "Pioggia",
      value: `${weather.precipMm.toFixed(1)} mm`,
    });
  } else if (weather.precipProb != null && weather.precipProb >= 10) {
    lines.push({
      label: "Prob. pioggia",
      value: `${Math.round(weather.precipProb)}%`,
    });
  }

  const source = weatherSourceLabel(weather.source);
  if (source) lines.push({ label: "Fonte", value: source });

  return lines;
}

/** Compact one-line label for an hourly row. */
export function formatHourlyRow(hour: ForecastHour): string {
  const wmo = wmoDayVisual(hour.weatherCode);
  const temp =
    hour.temperature != null ? `${Math.round(hour.temperature)}°` : "—";
  const rain =
    hour.precipMm != null && hour.precipMm >= 0.1
      ? ` · ${hour.precipMm.toFixed(1)} mm`
      : hour.precipProb != null && hour.precipProb >= 15
        ? ` · ${Math.round(hour.precipProb)}%`
        : "";
  return `${hour.time}  ${wmo.emoji}  ${temp}${rain}`;
}
