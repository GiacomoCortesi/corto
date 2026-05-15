import test from "node:test";
import assert from "node:assert/strict";

import { normalizeGardenLocation } from "@/lib/weather/location";
import { formatHourlyRow, weatherDayDetailLines } from "@/lib/weather/wmo-labels";
import {
  clearMonthWeatherCache,
  getCachedMonthWeather,
  monthWeatherCacheKey,
  setCachedMonthWeather,
} from "@/lib/weather/month-weather-cache";

test("normalizeGardenLocation: coerces string coordinates", () => {
  const loc = normalizeGardenLocation({
    lat: "44.4949",
    lon: "11.3426",
    label: " Bologna ",
    timezone: "Europe/Rome",
  });
  assert.ok(loc);
  assert.equal(loc!.lat, 44.4949);
  assert.equal(loc!.lon, 11.3426);
  assert.equal(loc!.label, "Bologna");
  assert.equal(loc!.timezone, "Europe/Rome");
});

test("normalizeGardenLocation: rejects invalid coordinates", () => {
  assert.equal(normalizeGardenLocation(null), undefined);
  assert.equal(normalizeGardenLocation({ lat: 91, lon: 0 }), undefined);
  assert.equal(normalizeGardenLocation({ lat: "x", lon: 1 }), undefined);
});

test("formatHourlyRow: compact hour label", () => {
  const row = formatHourlyRow({
    time: "14:00",
    temperature: 21.4,
    precipMm: 0.5,
    precipProb: 40,
    weatherCode: 61,
  });
  assert.ok(row.includes("14:00"));
  assert.ok(row.includes("21°"));
  assert.ok(row.includes("0.5 mm"));
});

test("weatherDayDetailLines: builds tooltip rows", () => {
  const lines = weatherDayDetailLines({
    date: "2026-05-15",
    tMax: 22,
    tMin: 12,
    precipMm: 3.2,
    precipProb: 80,
    et0: 4,
    weatherCode: 61,
    source: "forecast",
  });
  assert.equal(lines[0].value.includes("Pioggia"), true);
  assert.ok(lines.some((l) => l.label === "Temperature" && l.value === "12° / 22°"));
  assert.ok(lines.some((l) => l.label === "Fonte" && l.value === "Previsione"));
});

test("month weather cache: skips empty entries and clears", () => {
  clearMonthWeatherCache();
  const key = monthWeatherCacheKey(
    { lat: 44.5, lon: 11.3, timezone: "Europe/Rome" },
    2026,
    5,
  );
  setCachedMonthWeather(key, { days: {}, partial: true, timezone: "Europe/Rome" });
  assert.equal(getCachedMonthWeather(key), undefined);

  setCachedMonthWeather(key, {
    days: {
      "2026-05-15": {
        date: "2026-05-15",
        tMax: 20,
        tMin: 10,
        precipMm: 0,
        precipProb: null,
        et0: null,
        weatherCode: 0,
      },
    },
    partial: false,
    timezone: "Europe/Rome",
  });
  assert.ok(getCachedMonthWeather(key));

  clearMonthWeatherCache();
  assert.equal(getCachedMonthWeather(key), undefined);
});
