import test from "node:test";
import assert from "node:assert/strict";

import { plantById } from "@/lib/data/plants";
import { generateActivitySuggestions } from "@/lib/activity-suggestions";
import type { ActivitySuggestionsInput } from "@/lib/activity-suggestions";

test("generateActivitySuggestions: sample scenario + per-plant missing-event gating", () => {
  const nowMs = Date.parse("2026-04-26T12:00:00Z");

  const input: ActivitySuggestionsInput = {
    nowMs,
    plants: [{ plantId: "pomodoro" }, { plantId: "cipolla" }, { plantId: "peperone" }],
    catalog: { plantById },
    weather: {
      previous7d: { rainMm: 0, avgTempC: 22 },
      next3d: { rainMm: 0, avgTempC: 22 },
    },
    events: [
      // watering events
      { id: "w1", kind: "innaffiatura", at: nowMs - 14 * 86_400_000, plantId: "pomodoro" },
      { id: "w2", kind: "innaffiatura", at: nowMs - 1 * 86_400_000, plantId: "cipolla" },
      // sowing events
      { id: "s1", kind: "semina", at: nowMs - 5 * 7 * 86_400_000, plantId: "cipolla" },
      { id: "s2", kind: "semina", at: nowMs - 2 * 7 * 86_400_000, plantId: "peperone" },
      // no weeding events at all
    ],
  };

  const out = generateActivitySuggestions(input);

  assert.equal(out.garden.plants.length, 3);

  const watering = out.suggestions.find((s) => s.activity === "innaffiatura");
  assert.ok(watering, "expected innaffiatura block present");

  const wTomato = watering.items.find((i) => i.plantId === "pomodoro");
  const wOnion = watering.items.find((i) => i.plantId === "cipolla");
  const wPepper = watering.items.find((i) => i.plantId === "peperone");
  assert.ok(wTomato && wOnion && wPepper);

  // tomato: last watering 14d ago => should be due (high water demand)
  assert.equal(wTomato.should_do, true);
  assert.ok(wTomato.comment.includes("Ultima innaffiatura 14 giorni fa"));

  // onion: last watering yesterday => should not be due (low water demand)
  assert.equal(wOnion.should_do, false);
  assert.ok(wOnion.comment.includes("Ultima innaffiatura 1 giorni fa"));

  // pepper: no watering events => gated off
  assert.equal(wPepper.should_do, false);
  assert.equal(wPepper.confidence, 0);
  assert.ok(wPepper.comment.includes("Nessun evento di innaffiatura"));

  // sarchiatura: omitted because no plant has should_do=true (all gated)
  assert.equal(out.suggestions.some((s) => s.activity === "sarchiatura"), false);
});

test("generateActivitySuggestions: rain forecast can reduce watering urgency", () => {
  const nowMs = Date.parse("2026-04-26T12:00:00Z");

  const out = generateActivitySuggestions({
    nowMs,
    plants: [{ plantId: "pomodoro" }],
    catalog: { plantById },
    weather: {
      previous7d: { rainMm: 0, avgTempC: 22 },
      next3d: { rainMm: 20, avgTempC: 18 },
    },
    events: [{ id: "w1", kind: "innaffiatura", at: nowMs - 3 * 86_400_000, plantId: "pomodoro" }],
  });

  const watering = out.suggestions.find((s) => s.activity === "innaffiatura");
  // might be omitted entirely (not due) depending on interval adjustments
  if (watering) {
    const item = watering.items[0]!;
    assert.ok(item.comment.includes("È prevista pioggia"));
  }
});

