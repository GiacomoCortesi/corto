import test from "node:test";
import assert from "node:assert/strict";

import { buildContext } from "@/lib/suggestions/build-context";
import { summarizeLunarWindow } from "@/lib/suggestions/lunar-window";
import { validateSuggestions } from "@/lib/suggestions/validate";
import type { GardenSnapshot } from "@/lib/suggestions/types";

const NOW = Date.UTC(2026, 4, 14, 10, 0, 0);

test("summarizeLunarWindow: includes trend and tradition note", () => {
  const text = summarizeLunarWindow(NOW, 14);
  assert.match(text, /fase (crescente|calante)/);
  assert.match(text, /tradizione orticola italiana/);
});

test("buildContext: includes lunar calendar and event summary sections", () => {
  const snapshot: GardenSnapshot = {
    meta: {
      name: "Orto test",
      sunOrientation: "S",
    },
    beds: [
      {
        id: "bed1",
        name: "Aiuola 1",
        x: 0,
        y: 0,
        widthCm: 200,
        heightCm: 100,
        patches: [
          {
            id: "patch1",
            plantId: "pomodoro",
            x: 0,
            y: 0,
            sizeCm: { width: 40, height: 40 },
          },
        ],
      },
    ],
    events: [
      {
        id: "e1",
        at: NOW - 6 * 86_400_000,
        kind: "watering",
        patchId: "patch1",
        plantId: "pomodoro",
      },
    ],
  };

  const { text } = buildContext(snapshot, "Pioggia: 0 mm.", NOW);
  assert.match(text, /## Calendario lunare/);
  assert.match(text, /## Sintesi eventi per patch/);
  assert.match(text, /patch \[patch1\]/);
  assert.match(text, /## Meteo previsto/);
});

test("validateSuggestions: passes through moonNote", () => {
  const raw = {
    suggestions: [
      {
        kind: "weeding",
        title: "Sarchiatura",
        rationale: "Sintesi.",
        suggestedFor: "2026-05-16",
        windowDays: 3,
        weatherNote: "Terreno asciutto.",
        moonNote: "Luna calante, adatta alle radici.",
        confidence: "medium",
        items: [
          {
            bedId: "bed1",
            patchId: "patch1",
            plantId: "pomodoro",
            plantName: "Pomodoro",
            needsAction: true,
            rationale: "In ritardo.",
          },
        ],
      },
    ],
  };

  const out = validateSuggestions(raw, NOW, {
    patchIndex: new Map([["patch1", { bedId: "bed1", plantId: "pomodoro" }]]),
  });

  assert.equal(out.length, 1);
  assert.equal(out[0]!.moonNote, "Luna calante, adatta alle radici.");
});
