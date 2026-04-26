/**
 * POST /api/evolution-plan
 *
 * Generates an evolution/rotation plan for the next N months.
 * Reuses Open-Meteo (best effort) and OpenAI Chat Completions with strict
 * JSON-schema response_format.
 */

import type { NextRequest } from "next/server";
import { fetchForecast, summarizeForecast } from "@/lib/weather/openmeteo";
import type {
  EvolutionPlanRequest,
  EvolutionPlanResponse,
} from "@/lib/evolution-plan/types";
import { buildEvolutionContext } from "@/lib/evolution-plan/build-context";
import {
  EVOLUTION_PLAN_JSON_SCHEMA,
  EVOLUTION_SYSTEM_PROMPT,
  buildEvolutionUserMessage,
} from "@/lib/evolution-plan/prompt";
import { validateEvolutionPlans } from "@/lib/evolution-plan/validate";
import type { EvolutionPlan } from "@/lib/evolution-plan/types";
import { plantById } from "@/lib/data/plants";

export const runtime = "nodejs";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";

type OpenAIChoice = { message?: { content?: string } };
type OpenAIResponse = { choices?: OpenAIChoice[]; error?: { message?: string } };

function jsonResponse(body: EvolutionPlanResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isoDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pickEnd(nowMs: number, horizonMonths: number): string {
  // Roughly: horizonMonths months ahead. Keep it simple and stable.
  return isoDate(nowMs + Math.max(1, horizonMonths) * 30 * 86_400_000);
}

function addDays(nowMs: number, days: number): string {
  return isoDate(nowMs + days * 86_400_000);
}

export async function POST(req: NextRequest): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      {
        plans: [],
        error:
          "Variabile OPENAI_API_KEY non impostata sul server. Configura .env.local e riavvia.",
      },
      503,
    );
  }

  let body: EvolutionPlanRequest;
  try {
    body = (await req.json()) as EvolutionPlanRequest;
  } catch {
    return jsonResponse({ plans: [], error: "Body non valido (JSON atteso)." }, 400);
  }

  if (!body?.snapshot || !Array.isArray(body.snapshot.beds)) {
    return jsonResponse({ plans: [], error: "Snapshot mancante o malformato." }, 400);
  }

  const now = body.nowIso ? Date.parse(body.nowIso) : Date.now();
  const nowMs = Number.isFinite(now) ? (now as number) : Date.now();

  const horizonMonths =
    typeof body.horizonMonths === "number"
      ? Math.max(1, Math.min(6, Math.round(body.horizonMonths)))
      : 3;
  const strategy =
    body.strategy === "soilRecovery" || body.strategy === "production" ? body.strategy : "balanced";

  // 1) Weather (best effort)
  let weatherSummary: string | null = null;
  const loc = body.snapshot.meta.location;
  if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lon)) {
    const f = await fetchForecast(loc.lat, loc.lon, loc.timezone ?? "auto", 14);
    if (f && f.days.length > 0) weatherSummary = summarizeForecast(f);
  }

  // 2) Context (includes deterministic candidates + scores)
  const built = buildEvolutionContext({
    snapshot: body.snapshot,
    weatherSummary,
    nowMs,
    horizonMonths,
    strategy,
  });

  // 3) OpenAI call
  const baseUrl = (process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;

  let llmRes: Response;
  try {
    llmRes = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          { role: "system", content: EVOLUTION_SYSTEM_PROMPT },
          {
            role: "user",
            content: buildEvolutionUserMessage(built.text, body.dismissedIds ?? []),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: EVOLUTION_PLAN_JSON_SCHEMA,
        },
      }),
    });
  } catch (e) {
    return jsonResponse(
      {
        plans: [],
        weatherSummary: weatherSummary ?? undefined,
        error: `Errore di rete verso il provider LLM: ${(e as Error).message}`,
      },
      502,
    );
  }

  if (!llmRes.ok) {
    let detail = `${llmRes.status} ${llmRes.statusText}`;
    try {
      const errJson = (await llmRes.json()) as OpenAIResponse;
      if (errJson?.error?.message) detail = errJson.error.message;
    } catch {
      // ignore
    }
    return jsonResponse(
      {
        plans: [],
        weatherSummary: weatherSummary ?? undefined,
        error: `Errore dal provider LLM: ${detail}`,
      },
      502,
    );
  }

  let parsed: OpenAIResponse;
  try {
    parsed = (await llmRes.json()) as OpenAIResponse;
  } catch {
    return jsonResponse(
      { plans: [], weatherSummary: weatherSummary ?? undefined, error: "Risposta LLM non in JSON." },
      502,
    );
  }

  const content = parsed.choices?.[0]?.message?.content;
  if (!content) {
    return jsonResponse(
      { plans: [], weatherSummary: weatherSummary ?? undefined, error: "Risposta LLM vuota." },
      502,
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(content);
  } catch {
    return jsonResponse(
      { plans: [], weatherSummary: weatherSummary ?? undefined, error: "L'LLM non ha restituito JSON valido." },
      502,
    );
  }

  const dismissedSet = new Set(body.dismissedIds ?? []);
  let plans = validateEvolutionPlans(payload, nowMs, {
    patchIndex: built.patchIndex,
    candidatesByPatchId: built.candidatesByPatchId,
    dismissedIds: dismissedSet,
  });

  // Ensure we always return at least a few patch-level plans.
  // If the model returns too few (or zero), we fill the gap deterministically using the already-scored candidates.
  const patchEntries = Array.from(built.patchIndex.entries());
  if (patchEntries.length > 0) {
    const desired = Math.min(6, patchEntries.length);
    const covered = new Set(plans.map((p) => p.patchId).filter(Boolean) as string[]);
    const usedPreferred = new Set(
      plans
        .map((p) => p.recommendation.preferredPlantId)
        .filter((x): x is string => typeof x === "string" && x.length > 0),
    );
    const usedCategory = new Map<string, number>();
    for (const p of plans) {
      const pid = p.recommendation.preferredPlantId;
      const pl = pid ? plantById(pid) : null;
      if (!pl) continue;
      usedCategory.set(pl.category, (usedCategory.get(pl.category) ?? 0) + 1);
    }

    const start = isoDate(nowMs);
    const end = pickEnd(nowMs, horizonMonths);

    const extras: EvolutionPlan[] = [];
    for (const [patchId, idx] of patchEntries) {
      if (covered.has(patchId)) continue;
      if (extras.length + plans.length >= desired) break;

      const current = plantById(idx.plantId);
      const cands = built.candidatesByPatchId.get(patchId) ?? [];

      // If we have candidates, propose a concrete replace; otherwise keep.
      if (cands.length > 0) {
        // Diversify across patches: avoid repeating the same preferred plant everywhere,
        // and avoid over-recommending legumes (e.g. "fava") for every patch.
        const preferred = (() => {
          const preferNonLegume =
            (usedCategory.get("leguminosa") ?? 0) >= 1 ||
            usedPreferred.has("fava");
          const firstPass = cands.find((c) => {
            if (usedPreferred.has(c.plantId)) return false;
            const pl = plantById(c.plantId);
            if (!pl) return true;
            if (preferNonLegume && pl.category === "leguminosa") return false;
            return true;
          });
          return firstPass ?? cands.find((c) => !usedPreferred.has(c.plantId)) ?? cands[0];
        })();
        usedPreferred.add(preferred.plantId);
        const preferredPlant = plantById(preferred.plantId);
        if (preferredPlant) {
          usedCategory.set(
            preferredPlant.category,
            (usedCategory.get(preferredPlant.category) ?? 0) + 1,
          );
        }
        const alt = cands
          .filter((c) => c.plantId !== preferred.plantId)
          .slice(0, 3)
          .map((c) => {
            const pl = plantById(c.plantId);
            return {
              plantId: c.plantId,
              score: c.score,
              rotationReason: c.reasons?.[0] ?? "Alternativa coerente con rotazione e stagione.",
              tradeoffs: (c.tradeoffs ?? []).slice(0, 3),
            };
          });

        // If current crop is leafy, suggest a succession: keep a bit, then rotate into another leafy/fast crop.
        const isLeafy = current?.category === "foglia";
        if (isLeafy) {
          extras.push({
            id: `auto_${patchId.slice(-6)}`,
            bedId: idx.bedId,
            patchId,
            currentPlantId: idx.plantId,
            transitionWindow: { start, end: addDays(nowMs, 75) }, // ~2-3 months
            recommendation: {
              action: "keep",
              preferredPlantId: undefined,
              alternatives: [
                {
                  plantId: preferred.plantId,
                  score: preferred.score,
                  rotationReason:
                    preferred.reasons?.[0] ??
                    "Successione consigliata dopo coltura da foglia.",
                  tradeoffs: (preferred.tradeoffs ?? []).slice(0, 3),
                },
                ...alt,
              ].slice(0, 5),
            },
            rationale: `Successione: tieni ${current?.name ?? "la coltura"} per 2–3 mesi, poi valuta una nuova semina/trapianto tra le alternative (es. ${preferredPlant?.name ?? preferred.plantId}).`,
            confidence: "low",
          });
        } else {
          extras.push({
            id: `auto_${patchId.slice(-6)}`,
            bedId: idx.bedId,
            patchId,
            currentPlantId: idx.plantId,
            transitionWindow: { start, end },
            recommendation: {
              action: "replace",
              preferredPlantId: preferred.plantId,
              alternatives: alt,
            },
            rationale: `Suggerimento automatico: ${current ? current.name : "coltura"} → sostituisci con ${preferredPlant?.name ?? preferred.plantId} (tra i migliori candidati calcolati).`,
            confidence: "low",
          });
        }
      } else {
        extras.push({
          id: `auto_${patchId.slice(-6)}`,
          bedId: idx.bedId,
          patchId,
          currentPlantId: idx.plantId,
          transitionWindow: { start, end },
          recommendation: { action: "keep", preferredPlantId: undefined, alternatives: [] },
          rationale:
            "Suggerimento automatico: pochi candidati stagionali/compatibili per questo patch. Mantieni la coltura attuale e riprova cambiando orizzonte o strategia.",
          confidence: "low",
        });
      }
    }

    // If still empty (e.g. model output invalid AND no candidates), at least return one minimal keep.
    if (plans.length === 0 && extras.length === 0) {
      const [patchId, idx] = patchEntries[0];
      extras.push({
        id: `fallback_${patchId.slice(-6)}`,
        bedId: idx.bedId,
        patchId,
        currentPlantId: idx.plantId,
        transitionWindow: { start, end },
        recommendation: { action: "keep", preferredPlantId: undefined, alternatives: [] },
        rationale:
          "Piano minimo (fallback): mantieni la coltura attuale. Aggiungi eventi (semina/trapianto/raccolta) per migliorare la rotazione.",
        confidence: "low",
      });
    }

    plans = plans.concat(extras).slice(0, 40);
  }

  return jsonResponse({ plans, weatherSummary: weatherSummary ?? undefined });
}

