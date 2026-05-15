import type { GardenLocation } from "@/lib/types";

function finiteCoord(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Coerces persisted or API-shaped location data into a valid GardenLocation.
 * Returns undefined when lat/lon are missing or out of range.
 */
export function normalizeGardenLocation(
  raw: unknown,
): GardenLocation | undefined {
  if (!raw || typeof raw !== "object") return undefined;

  const o = raw as Record<string, unknown>;
  const lat = finiteCoord(o.lat);
  const lon = finiteCoord(o.lon);
  if (lat == null || lon == null) return undefined;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return undefined;

  const loc: GardenLocation = {
    lat,
    lon,
  };

  if (typeof o.label === "string" && o.label.trim()) {
    loc.label = o.label.trim();
  }
  if (typeof o.timezone === "string" && o.timezone.trim()) {
    loc.timezone = o.timezone.trim();
  }

  return loc;
}
