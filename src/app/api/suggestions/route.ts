/**
 * POST /api/suggestions
 *
 * Receives a garden snapshot from the client, fetches (when possible) weather
 * forecasts from Open-Meteo, builds the LLM prompt, calls OpenAI Chat
 * Completions with JSON-schema response_format, and returns a validated array
 * of Suggestions.
 *
 * Credentials live only here (server-side environment variables):
 *   - OPENAI_API_KEY  (required)
 *   - OPENAI_MODEL    (default "gpt-4o-mini")
 *   - OPENAI_BASE_URL (default "https://api.openai.com/v1")
 */

import type { NextRequest } from "next/server";
import { fetchForecast, summarizeForecast } from "@/lib/weather/openmeteo";
import { buildContext } from "@/lib/suggestions/build-context";
import {
  SUGGESTIONS_JSON_SCHEMA,
  SYSTEM_PROMPT,
  buildUserMessage,
} from "@/lib/suggestions/prompt";
import { validateSuggestions } from "@/lib/suggestions/validate";
import type {
  SuggestionsRequest,
  SuggestionsResponse,
} from "@/lib/suggestions/types";

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

function jsonResponse(body: SuggestionsResponse, status = 200): Response {
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
        suggestions: [],
        error:
          "Variabile OPENAI_API_KEY non impostata sul server. Configura .env.local e riavvia.",
      },
      503,
    );
  }

  let body: SuggestionsRequest;
  try {
    body = (await req.json()) as SuggestionsRequest;
  } catch {
    return jsonResponse(
      { suggestions: [], error: "Body non valido (JSON atteso)." },
      400,
    );
  }

  if (!body?.snapshot || !Array.isArray(body.snapshot.beds)) {
    return jsonResponse(
      { suggestions: [], error: "Snapshot del giardino mancante o malformato." },
      400,
    );
  }

  const now = body.nowIso ? Date.parse(body.nowIso) : Date.now();
  const nowMs = Number.isFinite(now) ? (now as number) : Date.now();

  // 1. Weather (best effort)
  let weatherSummary: string | null = null;
  const loc = body.snapshot.meta.location;
  if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lon)) {
    const f = await fetchForecast(loc.lat, loc.lon, loc.timezone ?? "auto", 14);
    if (f && f.days.length > 0) {
      weatherSummary = summarizeForecast(f);
    }
  }

  // 2. Contesto per il prompt
  const built = buildContext(body.snapshot, weatherSummary, nowMs);

  // 3. Chiamata OpenAI Chat Completions
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
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: buildUserMessage(built.text, body.dismissedIds ?? []),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: SUGGESTIONS_JSON_SCHEMA,
        },
      }),
    });
  } catch (e) {
    return jsonResponse(
      {
        suggestions: [],
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
        suggestions: [],
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
      {
        suggestions: [],
        weatherSummary: weatherSummary ?? undefined,
        error: "Risposta LLM non in JSON.",
      },
      502,
    );
  }

  const content = parsed.choices?.[0]?.message?.content;
  if (!content) {
    return jsonResponse(
      {
        suggestions: [],
        weatherSummary: weatherSummary ?? undefined,
        error: "Risposta LLM vuota.",
      },
      502,
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(content);
  } catch {
    return jsonResponse(
      {
        suggestions: [],
        weatherSummary: weatherSummary ?? undefined,
        error: "L'LLM non ha restituito JSON valido.",
      },
      502,
    );
  }

  const dismissedSet = new Set(body.dismissedIds ?? []);
  const suggestions = validateSuggestions(payload, nowMs, {
    patchIndex: built.patchIndex,
    dismissedIds: dismissedSet,
  });

  return jsonResponse({
    suggestions,
    weatherSummary: weatherSummary ?? undefined,
  });
}
