"use client";

import * as React from "react";
import { useGardenStore } from "@/lib/store";
import type {
  GardenActivityKind,
  Suggestion,
  SuggestionConfidence,
} from "@/lib/types";
import { plantById } from "@/lib/data/plants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  CloudSun,
  Loader2,
  MapPin,
  RefreshCcw,
  Sparkles,
  Sprout,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  SuggestionsRequest,
  SuggestionsResponse,
} from "@/lib/suggestions/types";

const KIND_LABEL: Record<GardenActivityKind, string> = {
  sowing: "Semina",
  weeding: "Sarchiatura",
  watering: "Annaffiatura",
  transplanting: "Trapianto",
  treatment: "Trattamento",
  harvest: "Raccolta",
  note: "Nota",
  other: "Altro",
};

const KIND_EMOJI: Record<GardenActivityKind, string> = {
  sowing: "🌱",
  weeding: "⛏️",
  watering: "💧",
  transplanting: "🪴",
  treatment: "🧪",
  harvest: "🧺",
  note: "📝",
  other: "📌",
};

const CONF_LABEL: Record<SuggestionConfidence, string> = {
  low: "bassa",
  medium: "media",
  high: "alta",
};

const CONF_VARIANT: Record<
  SuggestionConfidence,
  "outline" | "secondary" | "default"
> = {
  low: "outline",
  medium: "secondary",
  high: "default",
};

function relativeDay(ts: number, now: number): string {
  const diffMs = ts - now;
  const days = Math.round(diffMs / 86_400_000);
  if (days === 0) return "oggi";
  if (days === 1) return "domani";
  if (days === -1) return "ieri";
  if (days > 1 && days < 7) return `tra ${days} gg`;
  if (days < -1 && days > -7) return `${Math.abs(days)} gg fa`;
  return new Date(ts).toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function absoluteDate(ts: number): string {
  return new Date(ts).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function SuggestionsPanel() {
  const meta = useGardenStore((s) => s.meta);
  const beds = useGardenStore((s) => s.beds);
  const events = useGardenStore((s) => s.events);
  const dismissedIds = useGardenStore((s) => s.dismissedSuggestionIds);
  const cached = useGardenStore((s) => s.cachedSuggestions);
  const setCached = useGardenStore((s) => s.setCachedSuggestions);
  const acceptSuggestion = useGardenStore((s) => s.acceptSuggestion);
  const dismissSuggestion = useGardenStore((s) => s.dismissSuggestion);
  const setSelection = useGardenStore((s) => s.setSelection);

  const [items, setItems] = React.useState<Suggestion[]>(() => cached?.items ?? []);
  const [weatherSummary, setWeatherSummary] = React.useState<string | null>(
    () => cached?.weatherSummary ?? null,
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = React.useState<number | null>(
    () => cached?.savedAt ?? null,
  );

  const visible = React.useMemo(() => {
    const dismissed = new Set(dismissedIds);
    return items.filter((s) => !dismissed.has(s.id));
  }, [items, dismissedIds]);

  const ask = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: SuggestionsRequest = {
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
      };
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as SuggestionsResponse;
      setWeatherSummary(data.weatherSummary ?? null);
      setItems(data.suggestions ?? []);
      const savedAt = Date.now();
      setLastRefresh(savedAt);
      setCached({
        items: data.suggestions ?? [],
        weatherSummary: data.weatherSummary ?? undefined,
        savedAt,
      });

      if (data.error) {
        setError(data.error);
        toast.error("Suggerimenti non disponibili", { description: data.error });
      } else if ((data.suggestions ?? []).length === 0) {
        toast.message("Nessun suggerimento per ora", {
          description:
            "Riprova più tardi: il modello non ha trovato attività concrete da consigliare.",
        });
      }
    } catch (e) {
      const msg = (e as Error).message || "Errore inatteso";
      setError(msg);
      toast.error("Errore richiesta suggerimenti", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [meta.name, meta.sunOrientation, meta.location, beds, events, dismissedIds]);

  const handleAccept = (s: Suggestion) => {
    const grouped = s.items && s.items.length > 0;
    const needCount = grouped
      ? s.items!.filter((i) => i.needsAction).length
      : 1;
    acceptSuggestion(s);
    setItems((prev) => prev.filter((x) => x.id !== s.id));
    if (grouped) {
      if (needCount === 0) {
        toast.message("Nessuna attività da pianificare", {
          description:
            "Per questa categoria nessun patch richiedeva intervento. Il suggerimento è stato chiuso.",
          duration: 2400,
        });
      } else {
        toast.success(
          needCount === 1
            ? "1 attività aggiunta al diario"
            : `${needCount} attività aggiunte al diario`,
          {
            description:
              KIND_LABEL[s.kind] + " · " + absoluteDate(s.suggestedFor),
            duration: 2200,
          },
        );
      }
    } else {
      toast.success("Aggiunto al diario", {
        description: KIND_LABEL[s.kind] + " · " + absoluteDate(s.suggestedFor),
        duration: 2200,
      });
    }
  };

  const handleDismiss = (s: Suggestion) => {
    dismissSuggestion(s.id);
    setItems((prev) => prev.filter((x) => x.id !== s.id));
  };

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-lg border border-border bg-card/40 p-3 space-y-3">
        <div className="flex items-start gap-2">
          <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold tracking-tight">
              Chiedi suggerimenti
            </h3>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Un assistente ragiona per tipo di attività: per ognuna
              vedi tutte le piante, se serve l&apos;intervento o no, e
              il perché (cadenze, diario, meteo).
            </p>
          </div>
        </div>

        {!meta.location ? (
          <div className="flex items-start gap-2 rounded-md border border-dashed border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">
            <MapPin className="size-3.5 mt-0.5 shrink-0" />
            <span>
              Imposta la posizione dell&apos;orto dalle{" "}
              <strong>Proprietà</strong> per integrare il meteo locale.
            </span>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Button onClick={ask} disabled={loading} size="sm">
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RefreshCcw />
            )}
            {loading
              ? "Sto pensando…"
              : items.length > 0
                ? "Aggiorna"
                : "Chiedi suggerimenti"}
          </Button>
          {lastRefresh ? (
            <span className="text-[10px] text-muted-foreground font-mono">
              ultimo: {new Date(lastRefresh).toLocaleTimeString("it-IT", {
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
              className="h-24 rounded-lg border border-border bg-muted/30 animate-pulse"
            />
          ))}
        </div>
      ) : visible.length === 0 && !loading ? (
        <EmptyState />
      ) : (
        <ul className="space-y-2">
          {visible.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              onAccept={() => handleAccept(s)}
              onDismiss={() => handleDismiss(s)}
              onSelectPatch={(bedId, patchId) => {
                setSelection({
                  kind: "plant",
                  bedId,
                  patchId,
                });
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SuggestionCard({
  suggestion: s,
  onAccept,
  onDismiss,
  onSelectPatch,
}: {
  suggestion: Suggestion;
  onAccept: () => void;
  onDismiss: () => void;
  onSelectPatch: (bedId: string, patchId: string) => void;
}) {
  const beds = useGardenStore((s) => s.beds);
  const bed = s.bedId ? beds.find((b) => b.id === s.bedId) : undefined;
  const patch = bed && s.patchId ? bed.patches.find((p) => p.id === s.patchId) : undefined;
  const plant = patch ? plantById(patch.plantId) : s.plantId ? plantById(s.plantId) : null;

  const [now] = React.useState<number>(() => Date.now());
  const grouped = s.items && s.items.length > 0;
  const groupedItems = React.useMemo(() => {
    if (!grouped) return null;

    // Group rows by species (plantId or plantName) so multiple patches of the
    // same plant become a single entry.
    type Agg = {
      key: string;
      plantName: string;
      needsAction: boolean;
      bedId?: string;
      patchId?: string;
      patchSuffixes: string[];
      rationales: string[];
    };

    const m = new Map<string, Agg>();
    for (const it of s.items!) {
      const key = it.plantId ?? it.plantName ?? "unknown";
      const name = it.plantName ?? "Pianta";
      const suffix = it.patchId ? it.patchId.slice(-6) : "";

      const prev = m.get(key);
      if (!prev) {
        m.set(key, {
          key,
          plantName: name,
          needsAction: it.needsAction,
          bedId: it.bedId,
          patchId: it.patchId,
          patchSuffixes: suffix ? [suffix] : [],
          rationales: [it.rationale],
        });
      } else {
        prev.needsAction = prev.needsAction || it.needsAction;
        // Prefer to keep a selectable patch that actually needs action.
        if (it.needsAction && it.bedId && it.patchId) {
          prev.bedId = it.bedId;
          prev.patchId = it.patchId;
        }
        if (suffix) prev.patchSuffixes.push(suffix);
        prev.rationales.push(it.rationale);
      }
    }

    return [...m.values()].sort((a, b) => {
      if (a.needsAction !== b.needsAction) return a.needsAction ? -1 : 1;
      return a.plantName.localeCompare(b.plantName);
    });
  }, [grouped, s.items]);

  const needCount = groupedItems
    ? groupedItems.filter((i) => i.needsAction).length
    : 0;

  const target = !grouped && s.bedId ? (
    <button
      type="button"
      onClick={() => {
        if (s.patchId && s.bedId) onSelectPatch(s.bedId, s.patchId);
      }}
      className="text-[11px] text-foreground/80 hover:text-foreground hover:underline text-left truncate"
      title="Mostra sul canvas"
    >
      <MapPin className="inline size-3 mr-0.5 -mt-0.5 text-muted-foreground" />
      {bed?.name ?? "Aiuola rimossa"}
      {plant ? ` — ${plant.emoji} ${plant.name}` : ""}
    </button>
  ) : !grouped ? (
    <span className="text-[11px] text-muted-foreground">Tutto l&apos;orto</span>
  ) : null;

  return (
    <li className="rounded-lg border border-border bg-card/30 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <span className="text-lg leading-none mt-0.5" aria-hidden>
          {KIND_EMOJI[s.kind]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-sm font-semibold tracking-tight leading-tight">
              {s.title}
            </h4>
            <Badge variant={CONF_VARIANT[s.confidence]} className="text-[9px] uppercase tracking-wide">
              {CONF_LABEL[s.confidence]}
            </Badge>
          </div>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[11px] font-medium text-foreground/90">
              {KIND_LABEL[s.kind]}
            </span>
            <span className="text-[11px] text-muted-foreground">·</span>
            <span
              className={cn(
                "text-[11px] font-mono tabular-nums",
                s.suggestedFor < now
                  ? "text-destructive"
                  : "text-foreground/80",
              )}
              title={absoluteDate(s.suggestedFor)}
            >
              {relativeDay(s.suggestedFor, now)}
              {s.windowDays ? ` (±${s.windowDays}gg)` : ""}
            </span>
            {target ? (
              <>
                <span className="text-[11px] text-muted-foreground">·</span>
                {target}
              </>
            ) : null}
            {grouped ? (
              <>
                <span className="text-[11px] text-muted-foreground">·</span>
                <span className="text-[10px] text-muted-foreground">
                  {needCount} da fare / {s.items!.length} valutate
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-snug">{s.rationale}</p>

      {s.weatherNote ? (
        <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground bg-muted/30 rounded px-1.5 py-1">
          <CloudSun className="size-3 mt-0.5 shrink-0" />
          <span>{s.weatherNote}</span>
        </div>
      ) : null}

      {grouped ? (
        <ul className="space-y-1.5 rounded-md border border-border/50 bg-background/30 p-2 max-h-64 overflow-y-auto">
          {(groupedItems ?? []).map((it, idx) => {
            const canSelect = Boolean(it.bedId && it.patchId);
            const patches =
              it.patchSuffixes.length > 1
                ? ` · ${it.patchSuffixes.length} patch`
                : it.patchSuffixes.length === 1
                  ? ` · patch ${it.patchSuffixes[0]}`
                  : "";
            const rationale =
              it.rationales.length <= 1
                ? it.rationales[0]!
                : `${it.rationales[0]}\n(${Math.min(
                    it.rationales.length - 1,
                    3,
                  )} altri: ${it.rationales
                    .slice(1, 4)
                    .map((r) => r.slice(0, 80))
                    .join(" · ")}${it.rationales.length > 4 ? " …" : ""})`;
            return (
              <li
                key={it.key ?? idx}
                className={cn(
                  "text-[11px] rounded border border-transparent px-1.5 py-1.5 -mx-1.5",
                  it.needsAction
                    ? "border-border/40 bg-primary/5"
                    : "opacity-80",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    disabled={!canSelect}
                    onClick={() => {
                      if (it.bedId && it.patchId) onSelectPatch(it.bedId, it.patchId);
                    }}
                    className={cn(
                      "min-w-0 text-left font-medium",
                      canSelect
                        ? "text-foreground/90 hover:underline cursor-pointer"
                        : "cursor-default",
                    )}
                  >
                    {it.plantName}
                    <span className="ml-1 font-mono text-[9px] text-muted-foreground">
                      {patches}
                    </span>
                  </button>
                  <Badge
                    variant={it.needsAction ? "default" : "outline"}
                    className="shrink-0 text-[9px] uppercase"
                  >
                    {it.needsAction ? "Necessario" : "Non necess."}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                  {rationale}
                </p>
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
        <Button size="xs" onClick={onAccept} title="Aggiunge al diario le piante con «Necessario»">
          <Check />
          Accetta
        </Button>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="p-6 text-center">
      <div className="size-10 rounded-full bg-muted/70 grid place-items-center mx-auto mb-3">
        <Sprout className="size-4 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium tracking-tight">
        Nessun suggerimento ancora
      </p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
        Premi <strong>Chiedi suggerimenti</strong> per ricevere proposte di
        attività basate su piante, eventi recenti e meteo.
      </p>
    </div>
  );
}
