/**
 * POST /api/tip-of-the-day
 *
 * Returns a single AI-generated daily tip based on garden state, weather,
 * lunar calendar, and available bed space.
 */

import type { NextRequest } from "next/server";
import { fetchForecast, summarizeForecast } from "@/lib/weather/openmeteo";
import { buildTipContext } from "@/lib/suggestions/build-tip-context";
import {
  TIP_JSON_SCHEMA,
  TIP_SYSTEM_PROMPT,
  buildTipUserMessage,
} from "@/lib/suggestions/tip-prompt";
import { validateTip } from "@/lib/suggestions/validate-tip";
import {
  buildTipWeatherRulesBlock,
} from "@/lib/suggestions/tip-weather";
import type { Forecast } from "@/lib/weather/openmeteo";
import type {
  TipOfTheDayRequest,
  TipOfTheDayResponse,
} from "@/lib/suggestions/tip-types";

export const runtime = "nodejs";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";

type OpenAIChoice = {
  message?: { content?: string };
};

type OpenAIResponse = {
  choices?: OpenAIChoice[];
  error?: { message?: string };
};

function jsonResponse(body: TipOfTheDayResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      {
        tip: null,
        error:
          "Variabile OPENAI_API_KEY non impostata sul server. Configura .env.local e riavvia.",
      },
      503,
    );
  }

  let body: TipOfTheDayRequest;
  try {
    body = (await req.json()) as TipOfTheDayRequest;
  } catch {
    return jsonResponse({ tip: null, error: "Body non valido (JSON atteso)." }, 400);
  }

  if (!body?.snapshot || !Array.isArray(body.snapshot.beds)) {
    return jsonResponse(
      { tip: null, error: "Snapshot del giardino mancante o malformato." },
      400,
    );
  }

  const now = body.nowIso ? Date.parse(body.nowIso) : Date.now();
  const nowMs = Number.isFinite(now) ? (now as number) : Date.now();

  let weatherSummary: string | null = null;
  let forecast: Forecast | null = null;
  const loc = body.snapshot.meta.location;
  if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lon)) {
    forecast = await fetchForecast(loc.lat, loc.lon, loc.timezone ?? "auto", 3);
    if (forecast && forecast.days.length > 0) {
      weatherSummary = summarizeForecast(forecast);
    }
  }

  const built = buildTipContext(body.snapshot, weatherSummary, nowMs);
  const weatherRules = buildTipWeatherRulesBlock(forecast);
  const contextText = `${built.text}\n\n${weatherRules}`;
  const baseUrl = (process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL).replace(
    /\/+$/,
    "",
  );
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
        temperature: 0.5,
        messages: [
          { role: "system", content: TIP_SYSTEM_PROMPT },
          { role: "user", content: buildTipUserMessage(contextText) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: TIP_JSON_SCHEMA,
        },
      }),
    });
  } catch (e) {
    return jsonResponse(
      {
        tip: null,
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
      { tip: null, error: `Errore dal provider LLM: ${detail}` },
      502,
    );
  }

  let parsed: OpenAIResponse;
  try {
    parsed = (await llmRes.json()) as OpenAIResponse;
  } catch {
    return jsonResponse({ tip: null, error: "Risposta LLM non in JSON." }, 502);
  }

  const content = parsed.choices?.[0]?.message?.content;
  if (!content) {
    return jsonResponse({ tip: null, error: "Risposta LLM vuota." }, 502);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(content);
  } catch {
    return jsonResponse(
      { tip: null, error: "L'LLM non ha restituito JSON valido." },
      502,
    );
  }

  const tip = validateTip(payload, body.snapshot, { forecast });
  if (!tip) {
    return jsonResponse(
      {
        tip: null,
        error:
          "Il consiglio generato non ha superato la validazione (es. annaffiatura con pioggia in arrivo). Riprova.",
      },
      502,
    );
  }

  return jsonResponse({ tip });
}
