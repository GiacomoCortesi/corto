import test from "node:test";
import assert from "node:assert/strict";

import { buildTipContext } from "@/lib/suggestions/build-tip-context";
import { validateTip } from "@/lib/suggestions/validate-tip";
import { bedHasSpaceForPlant } from "@/lib/utils/bed-space";
import type { GardenSnapshot } from "@/lib/suggestions/types";

const NOW = Date.UTC(2026, 4, 14, 10, 0, 0);

const emptyBedSnapshot: GardenSnapshot = {
  meta: { name: "Orto", sunOrientation: "S" },
  beds: [
    {
      id: "bed1",
      name: "Aiuola 1",
      position: { x: 0, y: 0 },
      widthCm: 200,
      heightCm: 200,
      patches: [],
    },
  ],
  events: [],
};

test("bedHasSpaceForPlant: empty bed fits carrot patch", () => {
  const bed = emptyBedSnapshot.beds[0]!;
  assert.equal(bedHasSpaceForPlant(bed, "carota"), true);
});

test("buildTipContext: lists in-season plants with available space", () => {
  const { text } = buildTipContext(emptyBedSnapshot, null, NOW);
  assert.match(text, /## Spazio libero e catalogo/);
  assert.match(text, /carota \[carota\]/i);
});

test("validateTip: rejects planting tip without verified bed space", () => {
  const fullBed: GardenSnapshot = {
    ...emptyBedSnapshot,
    beds: [
      {
        ...emptyBedSnapshot.beds[0]!,
        patches: [
          {
            id: "p1",
            plantId: "pomodoro",
            positionCm: { x: 0, y: 0 },
            sizeCm: { width: 200, height: 200 },
          },
        ],
      },
    ],
  };

  const raw = {
    tip: {
      headline: "Oggi semina le carote",
      reason: "Luna calante e maggio ideale.",
      signals: ["stagione", "luna"],
      category: "planting",
      plantId: "carota",
      bedId: "bed1",
      kind: "sowing",
    },
  };

  assert.equal(validateTip(raw, fullBed), null);
});

test("validateTip: accepts planting tip when space exists", () => {
  const raw = {
    tip: {
      headline: "Oggi è un giorno perfetto per piantare le carote",
      reason: "Maggio è il mese ideale e la luna calante favorisce le radici.",
      signals: ["stagione", "luna"],
      category: "planting",
      plantId: "carota",
      bedId: "bed1",
      kind: "sowing",
    },
  };

  const tip = validateTip(raw, emptyBedSnapshot);
  assert.ok(tip);
  assert.equal(tip!.plantId, "carota");
});

test("validateTip: rejects watering tip when rain is forecast", () => {
  const raw = {
    tip: {
      headline: "Oggi è il giorno ideale per annaffiare il tuo orto!",
      reason: "Con la pioggia prevista nei prossimi giorni, annaffia oggi.",
      signals: ["meteo"],
      category: "weather",
      plantId: null,
      bedId: null,
      kind: "watering",
    },
  };

  const forecast = {
    lat: 45,
    lon: 9,
    timezone: "Europe/Rome",
    days: [
      { date: "2026-05-14", tMax: 22, tMin: 12, precipMm: 0, precipProb: 10, et0: 4, weatherCode: 1 },
      { date: "2026-05-15", tMax: 20, tMin: 11, precipMm: 8, precipProb: 80, et0: 3, weatherCode: 61 },
      { date: "2026-05-16", tMax: 18, tMin: 10, precipMm: 5, precipProb: 70, et0: 2, weatherCode: 63 },
    ],
  };

  assert.equal(
    validateTip(raw, emptyBedSnapshot, { forecast }),
    null,
  );
});

test("validateTip: accepts care tip for planted species", () => {
  const withTomato: GardenSnapshot = {
    ...emptyBedSnapshot,
    beds: [
      {
        ...emptyBedSnapshot.beds[0]!,
        patches: [
          {
            id: "p1",
            plantId: "pomodoro",
            positionCm: { x: 0, y: 0 },
            sizeCm: { width: 40, height: 40 },
          },
        ],
      },
    ],
  };

  const raw = {
    tip: {
      headline: "Rimuovi le femminelle dai pomodori",
      reason: "Evita che crescano senza controllo in questo periodo caldo.",
      signals: ["stagione"],
      category: "care",
      plantId: "pomodoro",
      kind: "other",
    },
  };

  const tip = validateTip(raw, withTomato);
  assert.ok(tip);
  assert.equal(tip!.category, "care");
});
