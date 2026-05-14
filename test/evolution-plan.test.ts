import test from "node:test";
import assert from "node:assert/strict";

import { scoreCandidatesForPatch } from "@/lib/evolution-plan/scoring";
import { validateEvolutionPlans } from "@/lib/evolution-plan/validate";

test("scoreCandidatesForPatch: prefers legumes after high-demand crop", () => {
  const nowMs = Date.parse("2026-04-25T12:00:00Z");

  const bed = {
    id: "bed1",
    name: "Aiuola 1",
    position: { x: 0, y: 0 },
    cols: 4,
    rows: 4,
    patches: [],
  };

  const patch = {
    id: "patch1",
    plantId: "pomodoro", // high demand
    positionCm: { x: 0, y: 0 },
    sizeCm: { width: 30, height: 30 },
  };

  const candidates = scoreCandidatesForPatch({
    bed: bed as any,
    patch: patch as any,
    events: [
      {
        id: "e1",
        at: nowMs - 10 * 86_400_000,
        kind: "transplanting",
        bedId: bed.id,
        patchId: patch.id,
        plantId: "pomodoro",
      },
    ] as any,
    allPlantIds: ["fagiolo", "zucchina", "pomodoro", "carota", "cavolo"],
    ctx: { nowMs, horizonMonths: 3, strategy: "soilRecovery" },
  });

  const bean = candidates.find((c) => c.plantId === "fagiolo");
  assert.ok(bean, "expected fagiolo candidate");
  assert.ok(bean.score >= 60, "expected fagiolo score not too low");

  const zucchini = candidates.find((c) => c.plantId === "zucchina");
  assert.ok(zucchini, "expected zucchina candidate");
  assert.ok(bean.score >= zucchini.score, "expected legumes to be preferred in soilRecovery");
});

test("validateEvolutionPlans: rejects replace plan with invalid preferredPlantId", () => {
  const nowMs = Date.parse("2026-04-25T12:00:00Z");
  const patchIndex = new Map([["patch1", { bedId: "bed1", plantId: "pomodoro" }]]);
  const candidatesByPatchId = new Map([
    [
      "patch1",
      [
        { plantId: "fagiolo", score: 80, reasons: ["ok"], tradeoffs: [] },
        { plantId: "carota", score: 70, reasons: ["ok"], tradeoffs: [] },
      ],
    ],
  ]);

  const raw = {
    plans: [
      {
        bedId: "bed1",
        patchId: "patch1",
        currentPlantId: "pomodoro",
        transitionWindow: { start: "2026-05-10", end: "2026-05-25" },
        recommendation: {
          action: "replace",
          preferredPlantId: "pomodoro", // not allowed: not in candidates
          alternatives: [],
        },
        rationale: "Test",
        confidence: "medium",
      },
    ],
  };

  const out = validateEvolutionPlans(raw, nowMs, {
    patchIndex,
    candidatesByPatchId,
    dismissedIds: new Set(),
  });

  assert.equal(out.length, 0);
});

test("validateEvolutionPlans: accepts replace plan with allowed preferredPlantId", () => {
  const nowMs = Date.parse("2026-04-25T12:00:00Z");
  const patchIndex = new Map([["patch1", { bedId: "bed1", plantId: "pomodoro" }]]);
  const candidatesByPatchId = new Map([
    [
      "patch1",
      [
        { plantId: "fagiolo", score: 80, reasons: ["ok"], tradeoffs: [] },
        { plantId: "carota", score: 70, reasons: ["ok"], tradeoffs: [] },
      ],
    ],
  ]);

  const raw = {
    plans: [
      {
        bedId: "bed1",
        patchId: "patch1",
        currentPlantId: "pomodoro",
        transitionWindow: { start: "2026-05-10", end: "2026-05-25" },
        recommendation: {
          action: "replace",
          preferredPlantId: "fagiolo",
          alternatives: [
            {
              plantId: "carota",
              score: 70,
              rotationReason: "Diversifica",
              tradeoffs: [],
            },
          ],
        },
        rationale: "Ok",
        confidence: "high",
      },
    ],
  };

  const out = validateEvolutionPlans(raw, nowMs, {
    patchIndex,
    candidatesByPatchId,
    dismissedIds: new Set(),
  });

  assert.equal(out.length, 1);
  assert.equal(out[0].recommendation.preferredPlantId, "fagiolo");
  assert.equal(out[0].recommendation.alternatives[0]?.plantId, "carota");
});

