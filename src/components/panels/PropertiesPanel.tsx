"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useGardenStore } from "@/lib/store";
import { LocationPicker } from "@/components/dialogs/LocationPicker";
import {
  plantActiveInMonth,
  plantById,
  MONTHS,
  MONTHS_LONG,
} from "@/lib/data/plants";
import {
  Trash2,
  Sprout,
  MapPin,
  Calendar,
  Ruler,
  Grid2x2,
  Minus,
  Plus,
  Triangle,
  Square,
  Droplets,
  Bug,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Bed,
  FertilizerDemand,
  PatchArrangement,
  Plant,
  PlantPatch,
} from "@/lib/types";
import {
  MAX_BED_SIDE_CM,
  bedAreaCm2,
  patchDensitySummaryForUI,
  patchEffectiveArrangement,
  patchOccupiedAreaCm2,
  patchSpacingCm,
  perSquareMeterLabelForPlant,
} from "@/lib/utils/spacing";
import { MIN_BED_SIDE_CM, quantizeCm } from "@/lib/utils/geometry";
import { cn } from "@/lib/utils";

/**
 * Barra 12 mesi: verde = semina, blu = trapianto, terracotta = raccolto.
 * Il mese del filtro stagione riceve l'anello di evidenziazione.
 */
function PlantSeasonTimeline({ plant }: { plant: Plant }) {
  const seasonFilter = useGardenStore((s) => s.seasonFilter);

  return (
    <div className="space-y-2.5">
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
          <Calendar className="size-3.5 shrink-0" />
          <span>Calendario colturale</span>
        </div>
        <div className="flex flex-col items-start gap-1 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-sm border border-border/50 bg-[var(--sage)]"
              aria-hidden
            />
            <span>Semina</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-sm border border-border/50 bg-[var(--ochre)]"
              aria-hidden
            />
            <span>Trapianto</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-sm border border-border/50 bg-[var(--terracotta)]"
              aria-hidden
            />
            <span>Raccolto</span>
          </span>
        </div>
      </div>

      <div
        className="grid grid-cols-12 gap-px"
        role="img"
        aria-label={`Mesi: semina ${plant.sowing.join(", ")}, trapianto ${(plant.transplanting ?? []).join(", ")}, raccolto ${plant.harvest.join(", ")}`}
      >
        {Array.from({ length: 12 }, (_, i) => {
          const m = i + 1;
          const inS = plant.sowing.includes(m);
          const inT = (plant.transplanting ?? []).includes(m);
          const inH = plant.harvest.includes(m);
          const showSeasonRing = seasonFilter === m;

          let barClass =
            "h-3 w-full rounded-sm border border-border/40 transition-shadow ";
          if (inS && inT && inH) {
            barClass +=
              "bg-gradient-to-br from-[var(--sage)]/90 via-[var(--ochre)]/90 to-[var(--terracotta)]/90";
          } else if (inS && inT) {
            barClass +=
              "bg-gradient-to-br from-[var(--sage)]/90 to-[var(--ochre)]/90";
          } else if (inS && inH) {
            barClass +=
              "bg-gradient-to-br from-[var(--sage)]/90 to-[var(--terracotta)]/90";
          } else if (inT && inH) {
            barClass +=
              "bg-gradient-to-br from-[var(--ochre)]/90 to-[var(--terracotta)]/90";
          } else if (inS) {
            barClass += "bg-[var(--sage)]/80";
          } else if (inT) {
            barClass += "bg-[var(--ochre)]/80";
          } else if (inH) {
            barClass += "bg-[var(--terracotta)]/80";
          } else {
            barClass += "bg-muted/40";
          }

          return (
            <div
              key={m}
              className="flex min-w-0 flex-col items-center gap-0.5"
            >
              <div
                className={cn(
                  barClass,
                  showSeasonRing &&
                    "ring-2 ring-primary ring-offset-1 ring-offset-background",
                )}
                title={`${MONTHS_LONG[m - 1]}: ${
                  inS && inT && inH
                    ? "Semina, trapianto e raccolto"
                    : inS && inT
                      ? "Semina e trapianto"
                      : inS && inH
                        ? "Semina e raccolto"
                        : inT && inH
                          ? "Trapianto e raccolto"
                          : inS
                            ? "Semina"
                            : inT
                              ? "Trapianto"
                              : inH
                                ? "Raccolto"
                                : "Nessun dato"
                }`}
              />
              <span className="w-full text-center text-[7px] font-mono leading-none text-muted-foreground sm:text-[8px]">
                {MONTHS[m - 1][0]}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground leading-snug">
        {plantActiveInMonth(plant, seasonFilter) ? (
          <>
            {plant.sowing.includes(seasonFilter) &&
            plant.harvest.includes(seasonFilter)
              ? MONTHS_LONG[seasonFilter - 1] + " è periodo di semina e raccolto."
              : plant.sowing.includes(seasonFilter)
                ? MONTHS_LONG[seasonFilter - 1] + " è periodo di semina."
                : MONTHS_LONG[seasonFilter - 1] + " è periodo di raccolto."}
          </>
        ) : (
          <>Nessun dato semina/raccolto in questo mese (la pianta appare
          attenuata sull&apos;aiuola).</>
        )}
      </p>
    </div>
  );
}

const DEMAND_LABELS: Record<FertilizerDemand, string> = {
  low: "poco esigente",
  medium: "mediamente esigente",
  high: "molto esigente",
  fixer: "azotofissatrice",
};

/**
 * Styling (background, text, border) for the fertilizer "demand" badge.
 * Intentionally tied to theme CSS tokens (no hardcoded hex values) for
 * consistency with the rest of the panel.
 */
function demandBadgeClass(demand: FertilizerDemand): string {
  switch (demand) {
    case "low":
      return "border-[var(--sage)]/50 text-[var(--sage)] bg-[var(--sage)]/10";
    case "medium":
      return "border-amber-500/50 text-amber-700 bg-amber-500/10 dark:text-amber-400";
    case "high":
      return "border-[var(--terracotta)]/60 text-[var(--terracotta)] bg-[var(--terracotta)]/10";
    case "fixer":
      return "border-emerald-500/50 text-emerald-700 bg-emerald-500/10 dark:text-emerald-400";
  }
}

/**
 * Collapsible section used for "Fertilization" and "Issues & remedies".
 * The summary is always visible and can include an optional preview action
 * (e.g. the demand badge for fertilization) rendered on the right.
 */
function CollapsibleSection({
  icon,
  title,
  meta,
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="flex items-center gap-1.5 min-w-0 text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
          {icon}
          <span className="truncate">{title}</span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {meta}
          <ChevronDown
            className={cn(
              "size-3.5 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </span>
      </button>
      {open ? (
        <div className="px-3 pb-3 pt-1 space-y-2 text-xs">{children}</div>
      ) : null}
    </div>
  );
}

/**
 * Compact bulleted list with typography consistent with the rest of the panel.
 * Intended for a few items (max ~6), not long lists.
 */
function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <ul className="list-disc list-outside pl-4 space-y-0.5 text-xs leading-snug marker:text-muted-foreground/60">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * Shows plant fertilization and issues/remedies in two collapsible blocks.
 * Each block is optional: if the data isn't present in the catalog entry,
 * the block isn't rendered.
 */
function PlantCareInfo({ plant }: { plant: Plant }) {
  const fert = plant.fertilizer;
  const treat = plant.treatments;
  if (!fert && !treat) return null;

  return (
    <div className="space-y-2">
      {fert ? (
        <CollapsibleSection
          icon={<Droplets className="size-3.5 shrink-0" />}
          title="Concimazione"
          meta={
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] font-mono uppercase tracking-wide px-1.5 py-0",
                demandBadgeClass(fert.demand),
              )}
            >
              {DEMAND_LABELS[fert.demand]}
            </Badge>
          }
        >
          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
              Concimi consigliati
            </div>
            <BulletList items={fert.type} />
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
              Periodicità
            </div>
            <p className="leading-snug">{fert.schedule}</p>
          </div>
          {fert.notes ? (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1.5 text-[11px] leading-snug text-amber-900 dark:text-amber-200">
              <span className="font-semibold">Nota: </span>
              {fert.notes}
            </div>
          ) : null}
        </CollapsibleSection>
      ) : null}

      {treat ? (
        <CollapsibleSection
          icon={<Bug className="size-3.5 shrink-0" />}
          title="Avversità & rimedi"
          meta={
            <span className="text-[9px] font-mono text-muted-foreground tabular-nums">
              {treat.pests.length}/{treat.remedies.length}
            </span>
          }
        >
          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
              Parassiti & malattie comuni
            </div>
            <BulletList items={treat.pests} />
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
              Rimedi (preferenza biologica)
            </div>
            <BulletList items={treat.remedies} />
          </div>
        </CollapsibleSection>
      ) : null}
    </div>
  );
}

export function PropertiesPanel() {
  const selection = useGardenStore((s) => s.selection);
  const beds = useGardenStore((s) => s.beds);
  const renameBed = useGardenStore((s) => s.renameBed);
  const resizeBedCm = useGardenStore((s) => s.resizeBedCm);
  const removeBed = useGardenStore((s) => s.removeBed);
  const removePatch = useGardenStore((s) => s.removePatch);
  const resizePatchCm = useGardenStore((s) => s.resizePatchCm);
  const setPatchSpacing = useGardenStore((s) => s.setPatchSpacing);
  const setPatchArrangement = useGardenStore((s) => s.setPatchArrangement);
  const setPatchPlantCount = useGardenStore((s) => s.setPatchPlantCount);

  if (!selection) {
    return <GardenSection />;
  }

  if (selection.kind === "bed") {
    const bed = beds.find((b) => b.id === selection.bedId);
    if (!bed) return <EmptyState title="Aiuola non trovata" />;
    return (
      <BedProperties
        bed={bed}
        onRename={renameBed}
        onResize={(id, widthCm, heightCm) => {
          const dropped = resizeBedCm(id, widthCm, heightCm);
          if (dropped > 0) {
            toast.warning(
              `${dropped} ${dropped === 1 ? "patch rimosso" : "patch rimossi"}`,
              {
                description:
                  "Il ridimensionamento ha rimosso patch fuori dall'aiuola o in collisione.",
              },
            );
          }
        }}
        onRemove={removeBed}
      />
    );
  }

  const bed = beds.find((b) => b.id === selection.bedId);
  const patch = bed?.patches.find((p) => p.id === selection.patchId);
  const plant = patch ? plantById(patch.plantId) : null;
  if (!bed || !patch || !plant) return <EmptyState title="Pianta non trovata" />;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="size-12 rounded-xl bg-muted/70 grid place-items-center text-3xl shrink-0">
          {plant.emoji}
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold tracking-tight">{plant.name}</div>
          <div className="text-xs text-muted-foreground italic truncate">
            {plant.scientific ?? "—"}
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            <Badge variant="secondary" className="font-mono text-[10px]">
              {plant.category}
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px]">
              {perSquareMeterLabelForPlant(plant)}
            </Badge>
          </div>
        </div>
      </div>

      <Separator />

      <PatchComposition
        bed={bed}
        patch={patch}
        plant={plant}
        onResize={(sizeCm) =>
          notifyOnReject(
            resizePatchCm(bed.id, patch.id, sizeCm),
            "Dimensione rifiutata",
          )
        }
        onSpacingChange={(cm) =>
          notifyOnReject(
            setPatchSpacing(bed.id, patch.id, cm),
            "Spaziatura rifiutata",
          )
        }
        onArrangementChange={(arrangement) =>
          notifyOnReject(
            setPatchArrangement(bed.id, patch.id, arrangement),
            "Disposizione rifiutata",
          )
        }
        onPlantCountChange={(plantCount) =>
          setPatchPlantCount(bed.id, patch.id, plantCount)
        }
      />

      <Separator />

      <PlantSeasonTimeline plant={plant} />

      {plant.fertilizer || plant.treatments ? (
        <>
          <Separator />
          <PlantCareInfo plant={plant} />
        </>
      ) : null}

      <Separator />

      <Button
        variant="outline"
        size="sm"
        className="w-full text-destructive hover:text-destructive"
        onClick={() => removePatch(bed.id, patch.id)}
      >
        <Trash2 className="size-4" />
        Rimuovi pianta
      </Button>
    </div>
  );
}

function BedProperties({
  bed,
  onRename,
  onResize,
  onRemove,
}: {
  bed: Bed;
  onRename: (id: string, name: string) => void;
  onResize: (id: string, widthCm: number, heightCm: number) => void;
  onRemove: (id: string) => void;
}) {
  const [name, setName] = React.useState(bed.name);
  React.useEffect(() => setName(bed.name), [bed.name]);

  const occupiedAreaCm2 = React.useMemo(() => {
    let area = 0;
    for (const patch of bed.patches) {
      area += patchOccupiedAreaCm2(patch);
    }
    return area;
  }, [bed]);
  const totalAreaCm2 = bedAreaCm2(bed);
  const pct =
    totalAreaCm2 === 0
      ? 0
      : Math.round((occupiedAreaCm2 / totalAreaCm2) * 100);

  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
          Aiuola
        </div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            const next = name.trim() || bed.name;
            if (next !== bed.name) onRename(bed.id, next);
          }}
          className="h-9 mt-1 font-semibold tracking-tight"
        />
      </div>


      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Ruler className="size-3.5" />
            Dimensioni
          </Label>
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
            {bed.widthCm}×{bed.heightCm} cm
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MetricDimensionInput
            label="Larghezza"
            sizeCm={bed.widthCm}
            onChangeCm={(widthCm) => onResize(bed.id, widthCm, bed.heightCm)}
          />
          <MetricDimensionInput
            label="Altezza"
            sizeCm={bed.heightCm}
            onChangeCm={(heightCm) => onResize(bed.id, bed.widthCm, heightCm)}
          />
        </div>
        <p className="text-[10px] text-muted-foreground leading-snug">
          Lato tra {MIN_BED_SIDE_CM / 100} m e {MAX_BED_SIDE_CM / 100} m, passo 0,5 cm.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 space-y-1.5">
        <FootprintRow
          label="Totale"
          value={`${(bed.widthCm / 100).toFixed(2)}×${(bed.heightCm / 100).toFixed(2)} m`}
          hint={`${bed.widthCm}×${bed.heightCm} cm`}
        />
        <FootprintRow
          label="Occupazione"
          value={`${pct}%`}
          hint={`${Math.round(occupiedAreaCm2)} / ${totalAreaCm2} cm²`}
        />
        <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <Separator />

      <Button
        variant="outline"
        size="sm"
        className="w-full text-destructive hover:text-destructive"
        onClick={() => onRemove(bed.id)}
      >
        <Trash2 className="size-4" />
        Elimina aiuola
      </Button>
    </div>
  );
}

/**
 * Input dimensione in metri con commit diretto in cm (quantizzato 0,5 cm).
 */
function MetricDimensionInput({
  label,
  sizeCm,
  onChangeCm,
}: {
  label: string;
  sizeCm: number;
  onChangeCm: (cm: number) => void;
}) {
  const meters = sizeCm / 100;
  const formatted = meters.toFixed(2);
  const [draft, setDraft] = React.useState(formatted);
  const [lastSynced, setLastSynced] = React.useState(formatted);
  if (lastSynced !== formatted) {
    setLastSynced(formatted);
    setDraft(formatted);
  }

  const maxMeters = MAX_BED_SIDE_CM / 100;
  const minMeters = MIN_BED_SIDE_CM / 100;

  const commit = () => {
    const trimmed = draft.replace(",", ".").trim();
    if (trimmed === "") {
      setDraft(meters.toFixed(2));
      return;
    }
    const m = Number(trimmed);
    if (!Number.isFinite(m) || m <= 0) {
      setDraft(meters.toFixed(2));
      return;
    }
    const cm = quantizeCm(Math.round(m * 100));
    const clamped = Math.max(MIN_BED_SIDE_CM, Math.min(MAX_BED_SIDE_CM, cm));
    if (clamped !== sizeCm) onChangeCm(clamped);
    else setDraft((clamped / 100).toFixed(2));
  };

  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          step={0.05}
          min={minMeters}
          max={maxMeters}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="h-8 pr-7 font-mono tabular-nums"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground pointer-events-none">
          m
        </span>
      </div>
      <div className="text-[10px] font-mono text-muted-foreground tabular-nums text-right">
        {sizeCm} cm
      </div>
    </div>
  );
}

function KV({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-xs">{children}</div>
    </div>
  );
}

/**
 * Mostra un toast quando lo store rifiuta una modifica (overlap o
 * overflow). Restituisce il flag originale per poter essere usato in
 * espressioni booleane.
 */
function notifyOnReject(applied: boolean, title: string): boolean {
  if (!applied) {
    toast.error(title, {
      description: "Sovrappone un altro patch o esce dall'aiuola.",
      duration: 1800,
    });
  }
  return applied;
}

const ARRANGEMENTS: Array<{
  value: PatchArrangement;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "square", label: "Quadrata", Icon: Square },
  { value: "triangular", label: "Triangolare", Icon: Triangle },
];

function PatchComposition({
  bed,
  patch,
  plant,
  onResize,
  onSpacingChange,
  onArrangementChange,
  onPlantCountChange,
}: {
  bed: Bed;
  patch: PlantPatch;
  plant: Plant;
  onResize: (sizeCm: { width: number; height: number }) => void;
  onSpacingChange: (cm: number | undefined) => void;
  onArrangementChange: (arrangement: PatchArrangement | undefined) => void;
  onPlantCountChange: (plantCount: number | undefined) => void;
}) {
  const spacing = patchSpacingCm(patch, plant);
  const arrangement = patchEffectiveArrangement(patch, plant);
  const density = patchDensitySummaryForUI(patch, bed, plant);
  const { displayFootprint } = density;

  const [widthDraft, setWidthDraft] = React.useState(String(patch.sizeCm.width));
  const [heightDraft, setHeightDraft] = React.useState(String(patch.sizeCm.height));
  React.useEffect(() => setWidthDraft(String(patch.sizeCm.width)), [patch.sizeCm.width]);
  React.useEffect(() => setHeightDraft(String(patch.sizeCm.height)), [patch.sizeCm.height]);

  const commitSize = () => {
    const w = quantizeCm(Number(widthDraft.replace(",", ".")));
    const h = quantizeCm(Number(heightDraft.replace(",", ".")));
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      setWidthDraft(String(patch.sizeCm.width));
      setHeightDraft(String(patch.sizeCm.height));
      return;
    }
    onResize({ width: w, height: h });
  };

  const [spacingDraft, setSpacingDraft] = React.useState<string>(String(spacing));
  React.useEffect(() => setSpacingDraft(String(spacing)), [spacing]);

  const isCustomSpacing = patch.spacingCm !== undefined;
  const isCustomArrangement = patch.arrangement !== undefined;
  const isCustomPlantCount = patch.plantCount !== undefined;

  const [plantCountDraft, setPlantCountDraft] = React.useState(
    isCustomPlantCount
      ? String(patch.plantCount)
      : density.showTotalLessThanOne
        ? ""
        : String(density.calculatedPlants),
  );
  React.useEffect(() => {
    setPlantCountDraft(
      patch.plantCount !== undefined
        ? String(patch.plantCount)
        : density.showTotalLessThanOne
          ? ""
          : String(density.calculatedPlants),
    );
  }, [density.calculatedPlants, density.showTotalLessThanOne, patch.plantCount]);

  const commitPlantCount = () => {
    const trimmed = plantCountDraft.trim();
    if (trimmed === "") {
      onPlantCountChange(undefined);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setPlantCountDraft(
        patch.plantCount !== undefined
          ? String(patch.plantCount)
          : density.showTotalLessThanOne
            ? ""
            : String(density.calculatedPlants),
      );
      return;
    }
    const clamped = Math.max(1, Math.min(9999, Math.round(parsed)));
    onPlantCountChange(
      clamped === density.calculatedPlants ? undefined : clamped,
    );
  };

  const commitSpacing = () => {
    const trimmed = spacingDraft.trim();
    if (trimmed === "") {
      onSpacingChange(undefined);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setSpacingDraft(String(spacing));
      return;
    }
    const clamped = Math.max(1, Math.min(200, Math.round(parsed)));
    onSpacingChange(clamped === plant.defaultSpacingCm ? undefined : clamped);
  };

  return (
    <div className="space-y-3">
      <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        <Grid2x2 className="size-3.5" />
        Composizione del blocco
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
            Larghezza (cm)
          </Label>
          <Input
            type="number"
            inputMode="decimal"
            min={1}
            value={widthDraft}
            onChange={(e) => setWidthDraft(e.target.value)}
            onBlur={commitSize}
            className="h-8 font-mono tabular-nums"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
            Altezza (cm)
          </Label>
          <Input
            type="number"
            inputMode="decimal"
            min={1}
            value={heightDraft}
            onChange={(e) => setHeightDraft(e.target.value)}
            onBlur={commitSize}
            className="h-8 font-mono tabular-nums"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="patch-spacing"
            className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"
          >
            <Ruler className="size-3.5" />
            Distanza (cm)
          </Label>
          {isCustomSpacing ? (
            <button
              type="button"
              onClick={() => onSpacingChange(undefined)}
              className="text-[10px] font-mono text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              ripristina ({plant.defaultSpacingCm})
            </button>
          ) : (
            <span className="text-[10px] font-mono text-muted-foreground">
              default
            </span>
          )}
        </div>
        <Input
          id="patch-spacing"
          type="number"
          inputMode="numeric"
          min={1}
          max={200}
          value={spacingDraft}
          onChange={(e) => setSpacingDraft(e.target.value)}
          onBlur={commitSpacing}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="h-8 font-mono tabular-nums"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
            Disposizione
          </Label>
          {isCustomArrangement ? (
            <button
              type="button"
              onClick={() => onArrangementChange(undefined)}
              className="text-[10px] font-mono text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              ripristina
            </button>
          ) : null}
        </div>
        <SegmentedGroup
          options={ARRANGEMENTS.map((opt) => ({
            value: opt.value,
            label: opt.label,
            icon: <opt.Icon className="size-3" />,
          }))}
          value={arrangement}
          onChange={(v) => onArrangementChange(v)}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="patch-plant-count"
            className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground"
          >
            Piante totali
          </Label>
          {isCustomPlantCount ? (
            <button
              type="button"
              onClick={() => onPlantCountChange(undefined)}
              className="text-[10px] font-mono text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              ripristina ({density.calculatedPlants || "—"})
            </button>
          ) : (
            <span className="text-[10px] font-mono text-muted-foreground">
              {density.showTotalLessThanOne ? "stima <1" : "da densità"}
            </span>
          )}
        </div>
        <Input
          id="patch-plant-count"
          type="number"
          inputMode="numeric"
          min={1}
          placeholder={density.showTotalLessThanOne ? "<1" : undefined}
          value={plantCountDraft}
          onChange={(e) => setPlantCountDraft(e.target.value)}
          onBlur={commitPlantCount}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="h-8 font-mono tabular-nums"
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-3 space-y-1.5">
        <FootprintRow
          label="Ingombro"
          value={`${Math.round(displayFootprint.widthCm)}×${Math.round(displayFootprint.heightCm)} cm`}
          hint={`${(displayFootprint.widthCm / 100).toFixed(2)}×${(displayFootprint.heightCm / 100).toFixed(2)} m`}
        />
        <FootprintRow
          label="Posizione"
          value={`${patch.positionCm.x}×${patch.positionCm.y} cm`}
          hint="angolo sup-sin"
        />
      </div>
    </div>
  );
}

function SegmentedGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{
    value: T;
    label: string;
    title?: string;
    icon?: React.ReactNode;
  }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="flex items-stretch rounded-md border border-border overflow-hidden"
      role="radiogroup"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.title}
            onClick={() => {
              if (!active) onChange(opt.value);
            }}
            className={cn(
              "flex-1 px-2 py-1 text-[11px] font-medium tracking-tight transition-colors flex items-center justify-center gap-1",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const canDec = value > min;
  const canInc = value < max;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
          {label}
        </Label>
        <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
          max {max}
        </span>
      </div>
      <div className="flex items-stretch rounded-md border border-border overflow-hidden">
        <button
          type="button"
          disabled={!canDec}
          onClick={() => canDec && onChange(value - 1)}
          className="px-2 grid place-items-center text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label={`Diminuisci ${label.toLowerCase()}`}
        >
          <Minus className="size-3.5" />
        </button>
        <div className="flex-1 grid place-items-center text-sm font-semibold tabular-nums px-2">
          {value}
        </div>
        <button
          type="button"
          disabled={!canInc}
          onClick={() => canInc && onChange(value + 1)}
          className="px-2 grid place-items-center text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label={`Aumenta ${label.toLowerCase()}`}
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function FootprintRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono tabular-nums font-medium">{value}</span>
        {hint ? (
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
            {hint}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="p-8 text-center">
      <div className="size-10 rounded-full bg-muted/70 grid place-items-center mx-auto mb-3">
        <Sprout className="size-4 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium tracking-tight">{title}</p>
      {body ? (
        <p className="text-xs text-muted-foreground mt-1">{body}</p>
      ) : null}
    </div>
  );
}

/**
 * "No selection" state of the Properties panel: shows garden info and settings
 * (name, sun exposure, and geographic location used by Suggestions for weather).
 */
function GardenSection() {
  const meta = useGardenStore((s) => s.meta);
  const setGardenLocation = useGardenStore((s) => s.setGardenLocation);

  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">
          Orto
        </div>
        <div className="text-base font-semibold tracking-tight">{meta.name}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Esposizione: <span className="font-mono">{meta.sunOrientation}</span>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
          <MapPin className="size-3.5" />
          Posizione
        </div>
        <p className="text-[11px] text-muted-foreground">
          Serve a recuperare il meteo locale per generare i Suggerimenti.
          È opzionale e resta nel tuo browser.
        </p>
        <LocationPicker
          current={meta.location}
          onPick={(loc) => {
            setGardenLocation(loc);
            toast.success("Posizione aggiornata", { duration: 1800 });
          }}
          onClear={() => {
            setGardenLocation(undefined);
            toast("Posizione rimossa", { duration: 1500 });
          }}
          compact
        />
      </div>

      <Separator />

      <div className="text-center text-[11px] text-muted-foreground">
        Seleziona un&apos;aiuola o una pianta sul canvas per modificarne
        le proprietà.
      </div>
    </div>
  );
}
