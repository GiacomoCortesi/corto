/**
 * Wrapper around the Open-Meteo Geocoding API (https://open-meteo.com/en/docs/geocoding-api).
 * No API key required. Used by the Setup Wizard / location editor to find
 * lat/lon from a city/place name.
 */

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

export type GeocodeResult = {
  name: string;
  countryCode?: string;
  country?: string;
  admin1?: string; // e.g. "Emilia-Romagna"
  lat: number;
  lon: number;
  timezone?: string;
};

type RawGeocodeResponse = {
  results?: Array<{
    name?: string;
    country_code?: string;
    country?: string;
    admin1?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
  }>;
};

/**
 * Searches up to `count` locations matching `query`. Returns an empty array
 * if the query is too short or the network fails — the caller must handle the
 * empty state gracefully.
 */
export async function geocode(
  query: string,
  count = 5,
  language = "it",
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = new URL(GEOCODING_URL);
  url.searchParams.set("name", trimmed);
  url.searchParams.set("count", String(Math.min(20, Math.max(1, count))));
  url.searchParams.set("language", language);
  url.searchParams.set("format", "json");

  let res: Response;
  try {
    res = await fetch(url.toString(), { cache: "no-store" });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  let data: RawGeocodeResponse;
  try {
    data = (await res.json()) as RawGeocodeResponse;
  } catch {
    return [];
  }

  return (data.results ?? [])
    .filter(
      (r): r is Required<Pick<NonNullable<RawGeocodeResponse["results"]>[number], "latitude" | "longitude">> &
        NonNullable<RawGeocodeResponse["results"]>[number] =>
        typeof r.latitude === "number" && typeof r.longitude === "number",
    )
    .map((r) => ({
      name: r.name ?? trimmed,
      countryCode: r.country_code,
      country: r.country,
      admin1: r.admin1,
      lat: r.latitude,
      lon: r.longitude,
      timezone: r.timezone,
    }));
}

/** Human-readable label to display in the UI. */
export function geocodeLabel(r: GeocodeResult): string {
  const parts = [r.name];
  if (r.admin1 && r.admin1 !== r.name) parts.push(r.admin1);
  if (r.countryCode) parts.push(r.countryCode);
  else if (r.country) parts.push(r.country);
  return parts.join(", ");
}
