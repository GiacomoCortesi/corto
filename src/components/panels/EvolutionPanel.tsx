"use client";

import * as React from "react";
import { useGardenStore } from "@/lib/store";
import { plantById } from "@/lib/data/plants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  CloudSun,
  Loader2,
  MapPin,
  RefreshCcw,
  Shuffle,
  Sprout,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  EvolutionPlan,
  EvolutionPlanAction,
  EvolutionPlanRequest,
  EvolutionPlanResponse,
  EvolutionPlanStrategy,
} from "@/lib/evolution-plan/types";

const ACTION_LABEL: Record<EvolutionPlanAction, string> = {
  replace: "Sostituisci",
  keep: "Mantieni",
  rest: "Riposo suolo",
  green_manure: "Sovescio",
};

const STRATEGY_LABEL: Record<EvolutionPlanStrategy, string> = {
  balanced: "Bilanciata",
  soilRecovery: "Recupero suolo",
  production: "Produzione",
};

const CONF_LABEL: Record<EvolutionPlan["confidence"], string> = {
  low: "bassa",
  medium: "media",
  high: "alta",
};

const CONF_VARIANT: Record<
  EvolutionPlan["confidence"],
  "outline" | "secondary" | "default"
> = {
  low: "outline",
  medium: "secondary",
  high: "default",
};

function formatDateRange(start: string, end: string): string {
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
    });
  return `${fmt(start)} → ${fmt(end)}`;
}

function absoluteDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function EvolutionPanel() {
  const meta = useGardenStore((s) => s.meta);
  const beds = useGardenStore((s) => s.beds);
  const events = useGardenStore((s) => s.events);
  const dismissedIds = useGardenStore((s) => s.dismissedEvolutionPlanIds);
  const cached = useGardenStore((s) => s.cachedEvolutionPlans);
  const setCached = useGardenStore((s) => s.setCachedEvolutionPlans);
  const acceptPlan = useGardenStore((s) => s.acceptEvolutionPlan);
  const dismissPlan = useGardenStore((s) => s.dismissEvolutionPlan);
  const setSelection = useGardenStore((s) => s.setSelection);

  const [items, setItems] = React.useState<EvolutionPlan[]>(
    () => cached?.plans ?? [],
  );
  const [weatherSummary, setWeatherSummary] = React.useState<string | null>(
    () => cached?.weatherSummary ?? null,
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = React.useState<number | null>(
    () => cached?.savedAt ?? null,
  );
  const [strategy, setStrategy] =
    React.useState<EvolutionPlanStrategy>("balanced");
  const [horizonMonths, setHorizonMonths] = React.useState(3);

  const plantedPatches = React.useMemo(
    () => beds.reduce((n, b) => n + b.patches.length, 0),
    [beds],
  );

  const visible = React.useMemo(() => {
    const dismissed = new Set(dismissedIds);
    return items.filter((p) => !dismissed.has(p.id));
  }, [items, dismissedIds]);

  const ask = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: EvolutionPlanRequest = {
        snapshot: {
          meta: {
            name: meta.name,
            sunOrientation: meta.sunOrientation,
            location: meta.location,
          },
          beds,
          events,
        },
        dismissedIds,
        nowIso: new Date().toISOString(),
        horizonMonths,
        strategy,
      };
      const res = await fetch("/api/evolution-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as EvolutionPlanResponse;
      setWeatherSummary(data.weatherSummary ?? null);
      setItems(data.plans ?? []);
      const savedAt = Date.now();
      setLastRefresh(savedAt);
      setCached({
        plans: data.plans ?? [],
        weatherSummary: data.weatherSummary ?? undefined,
        savedAt,
      });

      if (data.error) {
        setError(data.error);
        toast.error("Piano di rotazione non disponibile", {
          description: data.error,
        });
      } else if ((data.plans ?? []).length === 0) {
        toast.message("Nessun piano generato", {
          description:
            "Aggiungi piante alle aiuole e riprova, oppure cambia strategia o orizzonte.",
        });
      }
    } catch (e) {
      const msg = (e as Error).message || "Errore inatteso";
      setError(msg);
      toast.error("Errore richiesta piano rotazione", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [
    meta.name,
    meta.sunOrientation,
    meta.location,
    beds,
    events,
    dismissedIds,
    horizonMonths,
    strategy,
    setCached,
  ]);

  const handleAccept = (plan: EvolutionPlan, preferredPlantId?: string) => {
    acceptPlan(plan, preferredPlantId);
    setItems((prev) => prev.filter((x) => x.id !== plan.id));
    const when = absoluteDate(plan.transitionWindow.start);
    if (plan.recommendation.action === "replace" && preferredPlantId) {
      const plant = plantById(preferredPlantId);
      toast.success("Aggiunto al diario", {
        description: plant
          ? `Trapianto pianificato · ${plant.emoji} ${plant.name} · ${when}`
          : `Trapianto pianificato · ${when}`,
        duration: 2400,
      });
    } else {
      toast.success("Aggiunto al diario", {
        description: `${ACTION_LABEL[plan.recommendation.action]} · ${when}`,
        duration: 2400,
      });
    }
  };

  const handleDismiss = (plan: EvolutionPlan) => {
    dismissPlan(plan.id);
    setItems((prev) => prev.filter((x) => x.id !== plan.id));
  };

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-lg border border-border bg-card/40 p-3 space-y-3">
        <div className="flex items-start gap-2">
          <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
            <Shuffle className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold tracking-tight">
              Piano di rotazione
            </h3>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Suggerimenti AI per le prossime colture: rotazione per famiglia,
              stagione e recupero del suolo, patch per patch.
            </p>
          </div>
        </div>

        {plantedPatches === 0 ? (
          <div className="flex items-start gap-2 rounded-md border border-dashed border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">
            <Sprout className="size-3.5 mt-0.5 shrink-0" />
            <span>
              Pianta almeno una coltura su un&apos;aiuola per generare un piano
              di rotazione.
            </span>
          </div>
        ) : null}

        {!meta.location ? (
          <div className="flex items-start gap-2 rounded-md border border-dashed border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">
            <MapPin className="size-3.5 mt-0.5 shrink-0" />
            <span>
              Imposta la posizione dell&apos;orto dalle{" "}
              <strong>Proprietà</strong> per integrare il meteo locale.
            </span>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Strategia</Label>
            <Select
              value={strategy}
              onValueChange={(v) => setStrategy(v as EvolutionPlanStrategy)}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STRATEGY_LABEL) as EvolutionPlanStrategy[]).map(
                  (key) => (
                    <SelectItem key={key} value={key}>
                      {STRATEGY_LABEL[key]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Orizzonte</Label>
            <Select
              value={String(horizonMonths)}
              onValueChange={(v) => setHorizonMonths(Number(v))}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6].map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m} {m === 1 ? "mese" : "mesi"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={ask}
            disabled={loading || plantedPatches === 0}
            size="sm"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RefreshCcw />
            )}
            {loading
              ? "Sto pensando…"
              : items.length > 0
                ? "Aggiorna"
                : "Genera piano"}
          </Button>
          {lastRefresh ? (
            <span className="text-[10px] text-muted-foreground font-mono">
              ultimo:{" "}
              {new Date(lastRefresh).toLocaleTimeString("it-IT", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          ) : null}
        </div>

        {weatherSummary ? (
          <div className="flex items-start gap-2 rounded-md bg-muted/40 p-2 text-[11px]">
            <CloudSun className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
            <pre className="whitespace-pre-wrap font-mono text-[10px] leading-snug text-muted-foreground">
              {weatherSummary}
            </pre>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">
            {error}
          </div>
        ) : null}
      </div>

      {loading && visible.length === 0 ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 rounded-lg border border-border bg-muted/30 animate-pulse"
            />
          ))}
        </div>
      ) : visible.length === 0 && !loading ? (
        <EmptyState hasPatches={plantedPatches > 0} />
      ) : (
        <ul className="space-y-2">
          {visible.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onAccept={(plantId) => handleAccept(plan, plantId)}
              onDismiss={() => handleDismiss(plan)}
              onSelectPatch={(bedId, patchId) => {
                setSelection({ kind: "plant", bedId, patchId });
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  onAccept,
  onDismiss,
  onSelectPatch,
}: {
  plan: EvolutionPlan;
  onAccept: (preferredPlantId?: string) => void;
  onDismiss: () => void;
  onSelectPatch: (bedId: string, patchId: string) => void;
}) {
  const beds = useGardenStore((s) => s.beds);
  const bed = beds.find((b) => b.id === plan.bedId);
  const patch =
    bed && plan.patchId
      ? bed.patches.find((p) => p.id === plan.patchId)
      : undefined;
  const currentPlant = plan.currentPlantId
    ? plantById(plan.currentPlantId)
    : patch
      ? plantById(patch.plantId)
      : null;

  const defaultPlantId =
    plan.recommendation.preferredPlantId ??
    plan.recommendation.alternatives[0]?.plantId;
  const [selectedPlantId, setSelectedPlantId] = React.useState<
    string | undefined
  >(defaultPlantId);

  const action = plan.recommendation.action;
  const canSelectPatch = Boolean(plan.patchId && plan.bedId);

  const candidates = React.useMemo(() => {
    const ids = new Set<string>();
    const out: Array<{
      plantId: string;
      score: number;
      rotationReason: string;
    }> = [];
    const push = (plantId: string, score: number, rotationReason: string) => {
      if (ids.has(plantId)) return;
      ids.add(plantId);
      out.push({ plantId, score, rotationReason });
    };
    if (plan.recommendation.preferredPlantId) {
      const pref = plan.recommendation.preferredPlantId;
      const alt = plan.recommendation.alternatives.find(
        (a) => a.plantId === pref,
      );
      push(
        pref,
        alt?.score ?? 100,
        alt?.rotationReason ?? plan.rationale.slice(0, 120),
      );
    }
    for (const alt of plan.recommendation.alternatives) {
      push(alt.plantId, alt.score, alt.rotationReason);
    }
    return out;
  }, [plan]);

  const selectedPlant = selectedPlantId ? plantById(selectedPlantId) : null;

  return (
    <li className="rounded-lg border border-border bg-card/30 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <span className="text-lg leading-none mt-0.5" aria-hidden>
          {currentPlant?.emoji ?? "🌿"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-sm font-semibold tracking-tight leading-tight">
              {ACTION_LABEL[action]}
              {action === "replace" && selectedPlant
                ? ` → ${selectedPlant.emoji} ${selectedPlant.name}`
                : ""}
            </h4>
            <Badge
              variant={CONF_VARIANT[plan.confidence]}
              className="text-[9px] uppercase tracking-wide"
            >
              {CONF_LABEL[plan.confidence]}
            </Badge>
          </div>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[11px] font-mono tabular-nums text-foreground/80">
              {formatDateRange(
                plan.transitionWindow.start,
                plan.transitionWindow.end,
              )}
            </span>
            {bed ? (
              <>
                <span className="text-[11px] text-muted-foreground">·</span>
                <button
                  type="button"
                  disabled={!canSelectPatch}
                  onClick={() => {
                    if (plan.bedId && plan.patchId) {
                      onSelectPatch(plan.bedId, plan.patchId);
                    }
                  }}
                  className={cn(
                    "text-[11px] text-left truncate",
                    canSelectPatch
                      ? "text-foreground/80 hover:text-foreground hover:underline"
                      : "text-muted-foreground cursor-default",
                  )}
                  title="Mostra sul canvas"
                >
                  <MapPin className="inline size-3 mr-0.5 -mt-0.5 text-muted-foreground" />
                  {bed.name}
                  {currentPlant
                    ? ` — ${currentPlant.emoji} ${currentPlant.name}`
                    : ""}
                </button>
              </>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                Aiuola rimossa
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-snug">{plan.rationale}</p>

      {action === "replace" && candidates.length > 0 ? (
        <ul className="space-y-1 rounded-md border border-border/50 bg-background/30 p-2">
          {candidates.map((c) => {
            const plant = plantById(c.plantId);
            if (!plant) return null;
            const active = selectedPlantId === c.plantId;
            return (
              <li key={c.plantId}>
                <button
                  type="button"
                  onClick={() => setSelectedPlantId(c.plantId)}
                  className={cn(
                    "w-full text-left rounded px-1.5 py-1.5 text-[11px] transition-colors",
                    active
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-muted/50 border border-transparent",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {plant.emoji} {plant.name}
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground tabular-nums">
                      {c.score}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                    {c.rotationReason}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="flex items-center justify-end gap-1.5">
        <Button variant="ghost" size="xs" onClick={onDismiss}>
          <X />
          Ignora
        </Button>
        <Button
          size="xs"
          onClick={() =>
            onAccept(action === "replace" ? selectedPlantId : undefined)
          }
          title="Aggiunge un'attività pianificata al diario"
        >
          <Check />
          Accetta
        </Button>
      </div>
    </li>
  );
}

function EmptyState({ hasPatches }: { hasPatches: boolean }) {
  return (
    <div className="p-6 text-center">
      <div className="size-10 rounded-full bg-muted/70 grid place-items-center mx-auto mb-3">
        <Shuffle className="size-4 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium tracking-tight">Nessun piano ancora</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
        {hasPatches ? (
          <>
            Premi <strong>Genera piano</strong> per ricevere proposte di rotazione
            per le colture attuali.
          </>
        ) : (
          <>
            Aggiungi piante alle aiuole, poi genera un piano di rotazione
            personalizzato.
          </>
        )}
      </p>
    </div>
  );
}
