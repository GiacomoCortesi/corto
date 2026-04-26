import type { Plant } from "@/lib/types";

export type ActivityKind = "innaffiatura" | "sarchiatura" | "fertilizzante";

export type PlantRef = {
  /** Catalog plant id, e.g. "pomodoro" */
  plantId: string;
};

export type ActivityEventKind =
  | ActivityKind
  | "semina"
  | "trapianto"
  | "altro";

export type ActivityEvent = {
  id: string;
  at: number; // epoch ms
  kind: ActivityEventKind;
  plantId?: string;
};

export type WeatherHistory7d = {
  /** Total rain over the previous 7 days (mm). */
  rainMm: number;
  /** Average temperature over the previous 7 days (°C). Optional. */
  avgTempC?: number;
};

export type WeatherForecast3d = {
  /** Total expected rain over the next 3 days (mm). */
  rainMm: number;
  /** Expected average temperature over the next 3 days (°C). Optional. */
  avgTempC?: number;
};

export type GardenSetup = {
  /** If true, soil stays moist longer (mulch, shade, drip) */
  retainsMoisture?: boolean;
  /** If true, soil drains quickly (sandy, raised bed) */
  drainsFast?: boolean;
};

export type Catalog = {
  plantById: (plantId: string) => (Plant | undefined) | null;
};

export type ActivitySuggestionsInput = {
  nowMs: number;
  plants: PlantRef[];
  events: ActivityEvent[];
  catalog: Catalog;
  setup?: GardenSetup;
  weather?: {
    previous7d?: WeatherHistory7d;
    next3d?: WeatherForecast3d;
  };
};

export type ActivitySuggestionItem = {
  plantId: string;
  plantName?: string;
  should_do: boolean;
  /** 0..1 heuristic confidence */
  confidence: number;
  comment: string;
};

export type ActivitySuggestion = {
  activity: ActivityKind;
  summary?: string;
  items: ActivitySuggestionItem[];
};

export type ActivitySuggestionsResponse = {
  generated_at: string;
  garden: { plants: string[] };
  suggestions: ActivitySuggestion[];
};

