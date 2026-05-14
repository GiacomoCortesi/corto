"use client";

import * as React from "react";
import { useGardenStore } from "@/lib/store";
import { plantById } from "@/lib/data/plants";
import { localDayKey } from "@/lib/calendar/day-key";
import type {
  TipOfTheDay,
  TipOfTheDayResponse,
  TipSignal,
} from "@/lib/suggestions/tip-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CloudSun,
  Leaf,
  Loader2,
  Moon,
  RefreshCcw,
  Sparkles,
  Sprout,
} from "lucide-react";

const SIGNAL_LABEL: Record<TipSignal, string> = {
  stagione: "stagione",
  meteo: "tempo",
  luna: "luna",
};

const SIGNAL_ICON: Record<TipSignal, React.ReactNode> = {
  stagione: <Leaf className="size-3" />,
  meteo: <CloudSun className="size-3" />,
  luna: <Moon className="size-3" />,
};

function gardenFingerprint(
  beds: ReturnType<typeof useGardenStore.getState>["beds"],
  events: ReturnType<typeof useGardenStore.getState>["events"],
): string {
  const bedPart = beds
    .map(
      (b) =>
        `${b.id}:${b.widthCm}x${b.heightCm}:${b.patches.map((p) => p.plantId).join(",")}`,
    )
    .join("|");
  return `${bedPart}#${events.length}`;
}

export function TipOfTheDayCard() {
  const meta = useGardenStore((s) => s.meta);
  const beds = useGardenStore((s) => s.beds);
  const events = useGardenStore((s) => s.events);
  const cached = useGardenStore((s) => s.cachedTipOfTheDay);
  const setCached = useGardenStore((s) => s.setCachedTipOfTheDay);

  const dayKey = React.useMemo(() => localDayKey(Date.now()), []);
  const fingerprint = React.useMemo(
    () => gardenFingerprint(beds, events),
    [beds, events],
  );

  const [tip, setTip] = React.useState<TipOfTheDay | null>(() => {
    if (
      cached?.dayKey === dayKey &&
      cached.gardenFingerprint === fingerprint
    ) {
      return cached.tip;
    }
    return null;
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [asked, setAsked] = React.useState(() => Boolean(tip));

  const fetchTip = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setAsked(true);
    try {
      const res = await fetch("/api/tip-of-the-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshot: {
            meta: {
              name: meta.name,
              sunOrientation: meta.sunOrientation,
              location: meta.location,
            },
            beds,
            events,
          },
          nowIso: new Date().toISOString(),
        }),
      });
      const data = (await res.json()) as TipOfTheDayResponse;
      if (data.tip) {
        setTip(data.tip);
        setCached({
          dayKey,
          gardenFingerprint: fingerprint,
          tip: data.tip,
          savedAt: Date.now(),
        });
      } else {
        setTip(null);
        setError(data.error ?? "Consiglio non disponibile.");
      }
    } catch (e) {
      setError((e as Error).message || "Errore inatteso");
    } finally {
      setLoading(false);
    }
  }, [
    beds,
    dayKey,
    events,
    fingerprint,
    meta.location,
    meta.name,
    meta.sunOrientation,
    setCached,
  ]);

  const plant = tip?.plantId ? plantById(tip.plantId) : null;

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Sparkles className="size-3.5 text-primary shrink-0" />
          <span className="text-xs font-medium truncate">Consiglio del giorno</span>
        </div>
        {tip ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => void fetchTip()}
            disabled={loading}
            aria-label="Aggiorna consiglio"
            className="shrink-0 text-muted-foreground"
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="size-3.5" />
            )}
          </Button>
        ) : null}
      </div>

      {loading && !tip ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 rounded bg-muted/60 w-4/5" />
          <TipSkeletonRest />
        </div>
      ) : tip ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold tracking-tight leading-snug text-foreground">
            {plant?.emoji ? (
              <span className="mr-1" aria-hidden>
                {plant.emoji}
              </span>
            ) : null}
            {tip.headline}
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug">{tip.reason}</p>
          <TipSignals signals={tip.signals} />
        </div>
      ) : asked ? (
        <div className="text-center py-2 space-y-2">
          <div className="size-8 rounded-full bg-muted/70 grid place-items-center mx-auto">
            <Sprout className="size-3.5 text-muted-foreground" />
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug px-1">
            {error ?? "Consiglio non disponibile."}
          </p>
          <Button variant="outline" size="xs" onClick={() => void fetchTip()} disabled={loading}>
            Riprova
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground leading-snug">
            Un suggerimento su cosa fare oggi, basato su stagione, meteo, luna e
            il tuo orto.
          </p>
          <Button size="sm" className="w-full" onClick={() => void fetchTip()} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Chiedi consiglio
          </Button>
        </div>
      )}
    </div>
  );
}

function TipSignals({ signals }: { signals: TipSignal[] }) {
  return (
    <div className="flex flex-wrap gap-1 pt-0.5">
      {signals.map((s) => (
        <Badge
          key={s}
          variant="secondary"
          className="text-[9px] uppercase tracking-wide font-mono gap-1 px-1.5 py-0"
        >
          {SIGNAL_ICON[s]}
          {SIGNAL_LABEL[s]}
        </Badge>
      ))}
    </div>
  );
}

function TipSkeletonRest() {
  return (
    <>
      <div className="h-3 rounded bg-muted/60 w-full" />
      <div className="h-3 rounded bg-muted/60 w-11/12" />
    </>
  );
}
