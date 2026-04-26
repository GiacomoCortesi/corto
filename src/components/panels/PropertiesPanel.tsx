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
  bedCellSizeCm,
  maxGridDimForCellSizeCm,
  patchCellRect,
  patchEffectiveArrangement,
  patchDensitySummaryForUI,
  patchFootprintCm,
  patchOccupiedCells,
  patchSpacingCm,
  perCellLabelForCellSize,
} from "@/lib/utils/spacing";
import { cn } from "@/lib/utils";

/**
 * Barra 12 mesi: verde = semina, blu = trapianto, terracotta = raccolto.
 * Il mese del filtro stagione (se attivo) o il mese del calendario (se disattivo)
 * riceve l'anello di evidenziazione.
 */
function PlantSeasonTimeline({ plant }: { plant: Plant }) {
  const seasonFilter = useGardenStore((s) => s.seasonFilter);
  const calendarMonth = new Date().getMonth() + 1;
  const highlightMonth = seasonFilter ?? calendarMonth;

  return (
    <div className="space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
          <Calendar className="size-3.5 shrink-0" />
          <span>Calendario colturale</span>
        </div>
        <div className="flex flex-col items-end gap-1 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-sm border border-border/50 bg-[var(--sage)]"
              aria-hidden
            />
            <span>Semina</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-sm border border-border/50 bg-[var(--sky)]"
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
          const isFilter = seasonFilter !== null;
          const showSeasonRing = isFilter && seasonFilter === m;
          const showCalendarRing = !isFilter && calendarMonth === m;

          let barClass =
            "h-3 w-full rounded-sm border border-border/40 transition-shadow ";
          if (inS && inT && inH) {
            barClass +=
              "bg-gradient-to-br from-[var(--sage)]/90 via-[var(--sky)]/90 to-[var(--terracotta)]/90";
          } else if (inS && inT) {
            barClass +=
              "bg-gradient-to-br from-[var(--sage)]/90 to-[var(--sky)]/90";
          } else if (inS && inH) {
            barClass +=
              "bg-gradient-to-br from-[var(--sage)]/90 to-[var(--terracotta)]/90";
          } else if (inT && inH) {
            barClass +=
              "bg-gradient-to-br from-[var(--sky)]/90 to-[var(--terracotta)]/90";
          } else if (inS) {
            barClass += "bg-[var(--sage)]/80";
          } else if (inT) {
            barClass += "bg-[var(--sky)]/80";
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
                  showCalendarRing &&
                    !showSeasonRing &&
                    "ring-1 ring-dashed ring-primary/60",
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
        {seasonFilter === null ? (
          <>
            <span className="font-mono text-foreground/80">Mese oggi</span> (anello
            tratteggiato): {MONTHS_LONG[highlightMonth - 1]}.
            {plantActiveInMonth(plant, highlightMonth) ? (
              <>
                {" "}
                {plant.sowing.includes(highlightMonth) &&
                (plant.transplanting ?? []).includes(highlightMonth) &&
                plant.harvest.includes(highlightMonth)
                  ? "Semina, trapianto e raccolto."
                  : plant.sowing.includes(highlightMonth) &&
                      (plant.transplanting ?? []).includes(highlightMonth)
                    ? "Periodo di semina e trapianto."
                    : plant.sowing.includes(highlightMonth) &&
                        plant.harvest.includes(highlightMonth)
                      ? "Periodo di semina e raccolto."
                      : (plant.transplanting ?? []).includes(highlightMonth) &&
                          plant.harvest.includes(highlightMonth)
                        ? "Periodo di trapianto e raccolto."
                        : plant.sowing.includes(highlightMonth)
                          ? "Periodo di semina."
                          : (plant.transplanting ?? []).includes(highlightMonth)
                            ? "Periodo di trapianto."
                            : "Periodo di raccolto."}
              </>
            ) : (
              <> Nessuna semina, trapianto o raccolto indicato per questo mese.</>
            )}
          </>
        ) : (
          <>
            <span className="font-mono text-foreground/80">Filtro stagione</span> (anello
            pieno): {MONTHS_LONG[seasonFilter - 1]}.{" "}
            {plantActiveInMonth(plant, seasonFilter) ? (
              <>
                {plant.sowing.includes(seasonFilter) &&
                plant.harvest.includes(seasonFilter)
                  ? "In questo mese: semina e raccolto."
                  : plant.sowing.includes(seasonFilter)
                    ? "In questo mese: semina."
                    : "In questo mese: raccolto."}
              </>
            ) : (
              <>Nessun dato semina/raccolto in questo mese (la pianta appare
              attenuata sull&apos;aiuola).</>
            )}
          </>
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
 * Stile (background, testo, bordo) del badge "demand" della concimazione.
 * Volutamente legato ai token CSS del tema (non hex hardcoded) per
 * coerenza con il resto del pannello.
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
 * Sezione collassabile usata per "Concimazione" e "Avversità & rimedi".
 * Il summary è sempre visibile e include un'azione di anteprima opzionale
 * (es. il badge demand per la concimazione) renderizzata a destra.
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
 * Lista compatta a bullet con tipografia coerente con il resto del
 * pannello. Pensata per pochi item (max ~6), non per lunghi elenchi.
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
 * Mostra concimazione e avversità/rimedi della pianta in due blocchi
 * collassabili. Ogni blocco è opzionale: se i dati non sono presenti
 * nel catalogo per la voce, il blocco non viene renderizzato.
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
  const resizeBed = useGardenStore((s) => s.resizeBed);
  const setBedCellSize = useGardenStore((s) => s.setBedCellSize);
  const removeBed = useGardenStore((s) => s.removeBed);
  const removePatch = useGardenStore((s) => s.removePatch);
  const resizePatch = useGardenStore((s) => s.resizePatch);
  const setPatchSpacing = useGardenStore((s) => s.setPatchSpacing);
  const setPatchArrangement = useGardenStore((s) => s.setPatchArrangement);

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
        onResize={resizeBed}
        onRemove={removeBed}
        onCellSizeChange={(id, cellSizeCm) => {
          const dropped = setBedCellSize(id, cellSizeCm);
          if (dropped > 0) {
            toast.warning(
              `${dropped} ${dropped === 1 ? "patch rimosso" : "patch rimossi"}`,
              {
                description:
                  "Il riscalamento ha causato collisioni o uscite dalla griglia.",
              },
            );
          }
        }}
      />
    );
  }

  const bed = beds.find((b) => b.id === selection.bedId);
  const patch = bed?.patches.find((p) => p.id === selection.patchId);
  const plant = patch ? plantById(patch.plantId) : null;
  if (!bed || !patch || !plant) return <EmptyState title="Pianta non trovata" />;
  const cellNumber = patch.anchor.row * bed.cols + patch.anchor.col + 1;
  const bedCell = bedCellSizeCm(bed);
  const bedWidthM = (bed.cols * bedCell) / 100;
  const bedHeightM = (bed.rows * bedCell) / 100;

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
              {perCellLabelForCellSize(plant, bedCell)}
            </Badge>
          </div>
        </div>
      </div>

      <Separator />

      <KV icon={<MapPin className="size-3.5" />} label="Aiuola">
        {bed.name} ·{" "}
        <span className="font-mono tabular-nums">
          {bedWidthM.toFixed(2)}×{bedHeightM.toFixed(2)} m
        </span>{" "}
        · cella #{cellNumber}
      </KV>

      <Separator />

      <PatchComposition
        bed={bed}
        patch={patch}
        plant={plant}
        onResize={(cols, rows) =>
          notifyOnReject(
            resizePatch(bed.id, patch.id, cols, rows),
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
      />

      <Separator />

      <PlantSeasonTimeline plant={plant} />

      <Separator />

      <div>
        <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1.5">
          Compagne consigliate
        </div>
        <ul className="space-y-1.5">
          {plant.companions.length === 0 ? (
            <li className="text-xs text-muted-foreground">—</li>
          ) : (
            plant.companions.map((entry) => {
              const p = plantById(entry.plantId);
              const emoji = p?.emoji ?? "🌱";
              return (
                <li
                  key={entry.plantId}
                  className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5"
                >
                  <div className="text-[11px] font-medium">
                    {emoji} {entry.name}
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                    {entry.reason}
                  </p>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <div>
        <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1.5">
          Da evitare
        </div>
        <ul className="space-y-1.5">
          {plant.antagonists.length === 0 ? (
            <li className="text-xs text-muted-foreground">—</li>
          ) : (
            plant.antagonists.map((entry) => {
              const p = plantById(entry.plantId);
              const emoji = p?.emoji ?? "🌱";
              return (
                <li
                  key={entry.plantId}
                  className="rounded-md border border-[var(--terracotta)]/35 bg-[var(--terracotta-soft)]/25 px-2 py-1.5"
                >
                  <div className="text-[11px] font-medium text-[var(--terracotta)]">
                    {emoji} {entry.name}
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                    {entry.reason}
                  </p>
                </li>
              );
            })
          )}
        </ul>
      </div>

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

const CELL_SIZE_OPTIONS: number[] = [5, 10, 15, 30, 60];

function BedProperties({
  bed,
  onRename,
  onResize,
  onRemove,
  onCellSizeChange,
}: {
  bed: Bed;
  onRename: (id: string, name: string) => void;
  onResize: (id: string, cols: number, rows: number) => void;
  onRemove: (id: string) => void;
  onCellSizeChange: (id: string, cellSizeCm: number) => void;
}) {
  const [name, setName] = React.useState(bed.name);
  React.useEffect(() => setName(bed.name), [bed.name]);

  const cell = bedCellSizeCm(bed);
  const widthCm = bed.cols * cell;
  const heightCm = bed.rows * cell;

  const occupied = React.useMemo(() => {
    let cells = 0;
    for (const patch of bed.patches) {
      const plant = plantById(patch.plantId);
      if (!plant) continue;
      const o = patchOccupiedCells(patch, bed, plant);
      cells += o.cols * o.rows;
    }
    return cells;
  }, [bed]);
  const total = bed.cols * bed.rows;
  const pct = total === 0 ? 0 : Math.round((occupied / total) * 100);

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
            <Grid2x2 className="size-3.5" />
            Risoluzione griglia
          </Label>
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
            passo: {cell} cm
          </span>
        </div>
        <SegmentedGroup
          options={CELL_SIZE_OPTIONS.map((v) => ({
            value: String(v),
            label: `${v} cm`,
          }))}
          value={String(cell)}
          onChange={(v) => onCellSizeChange(bed.id, Number(v))}
        />
        <p className="text-[10px] text-muted-foreground leading-snug">
          Passo della griglia. Cambiarlo riscala l&apos;aiuola e i patch in modo
          proporzionale.
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Ruler className="size-3.5" />
            Dimensioni
          </Label>
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
            {bed.cols}×{bed.rows} celle
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MetricDimensionInput
            label="Larghezza"
            cells={bed.cols}
            cellSizeCm={cell}
            onChangeCells={(c) => onResize(bed.id, c, bed.rows)}
          />
          <MetricDimensionInput
            label="Altezza"
            cells={bed.rows}
            cellSizeCm={cell}
            onChangeCells={(c) => onResize(bed.id, bed.cols, c)}
          />
        </div>
        <p className="text-[10px] text-muted-foreground leading-snug">
          Lato massimo {MAX_BED_SIDE_CM / 100} m: fino a{" "}
          {maxGridDimForCellSizeCm(cell)} celle con passo {cell} cm.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 space-y-1.5">
        <FootprintRow
          label="Totale"
          value={`${(widthCm / 100).toFixed(2)}×${(heightCm / 100).toFixed(2)} m`}
          hint={`${widthCm}×${heightCm} cm`}
        />
        <FootprintRow
          label="Occupazione"
          value={`${pct}%`}
          hint={`${occupied}/${total} celle`}
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
 * Input dimensione in metri: l'utente vede e digita metri (es. 1.20),
 * ma internamente snappiamo al numero intero di celle che meglio
 * approssima la dimensione richiesta. Mostra anche un hint con il
 * conteggio celle e il valore in cm.
 */
function MetricDimensionInput({
  label,
  cells,
  cellSizeCm,
  onChangeCells,
}: {
  label: string;
  cells: number;
  cellSizeCm: number;
  onChangeCells: (cells: number) => void;
}) {
  const meters = (cells * cellSizeCm) / 100;
  const formatted = meters.toFixed(2);
  // Keep the local draft in sync with the canonical value (cells x
  // cellSize) without an effect. React docs: "You don't need an effect
  // to adjust state based on prop changes" -- compare-and-set during
  // render is the recommended pattern.
  const [draft, setDraft] = React.useState(formatted);
  const [lastSynced, setLastSynced] = React.useState(formatted);
  if (lastSynced !== formatted) {
    setLastSynced(formatted);
    setDraft(formatted);
  }

  const maxDim = maxGridDimForCellSizeCm(cellSizeCm);
  const maxMeters = (maxDim * cellSizeCm) / 100;

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
    const cm = Math.round(m * 100);
    const nextCells = Math.max(
      1,
      Math.min(maxDim, Math.round(cm / cellSizeCm)),
    );
    if (nextCells !== cells) onChangeCells(nextCells);
    else setDraft(meters.toFixed(2));
  };

  const stepM = cellSizeCm / 100;
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          step={stepM}
          min={stepM}
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
        {cells} celle · {cells * cellSizeCm} cm
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
}: {
  bed: Bed;
  patch: PlantPatch;
  plant: Plant;
  onResize: (cols: number, rows: number) => void;
  onSpacingChange: (cm: number | undefined) => void;
  onArrangementChange: (arrangement: PatchArrangement | undefined) => void;
}) {
  const spacing = patchSpacingCm(patch, plant);
  const arrangement = patchEffectiveArrangement(patch, plant);
  const density = patchDensitySummaryForUI(patch, bed, plant);
  const { displayFootprint, occupied } = density;

  // Largest plantCols/plantRows that still fits inside the bed at the
  // current anchor, given the active spacing mode and arrangement. We
  // grow each axis independently and stop when the resulting footprint
  // would extend past the grid. Overlap with other patches is handled by
  // the store (toast on rejection); this only constrains "fits in bed".
  const { maxCols, maxRows } = React.useMemo(() => {
    const gridCap = maxGridDimForCellSizeCm(bedCellSizeCm(bed));
    const grow = (axis: "cols" | "rows") => {
      let n = 1;
      while (n < gridCap) {
        const candidate: PlantPatch = {
          ...patch,
          plantCols: axis === "cols" ? n + 1 : patch.plantCols,
          plantRows: axis === "rows" ? n + 1 : patch.plantRows,
        };
        const rect = patchCellRect(candidate, bed, plant);
        if (axis === "cols" ? rect.col1 >= bed.cols : rect.row1 >= bed.rows) {
          break;
        }
        n++;
      }
      return Math.max(1, n);
    };
    return { maxCols: grow("cols"), maxRows: grow("rows") };
  }, [bed, patch, plant]);

  const [spacingDraft, setSpacingDraft] = React.useState<string>(String(spacing));
  React.useEffect(() => setSpacingDraft(String(spacing)), [spacing]);

  const isCustomSpacing = patch.spacingCm !== undefined;
  const isCustomArrangement = patch.arrangement !== undefined;

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
        <Stepper
          label="Colonne"
          value={patch.plantCols}
          min={1}
          max={maxCols}
          onChange={(v) => onResize(v, patch.plantRows)}
        />
        <Stepper
          label="Righe"
          value={patch.plantRows}
          min={1}
          max={maxRows}
          onChange={(v) => onResize(patch.plantCols, v)}
        />
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

      <div className="rounded-xl border border-border bg-card p-3 space-y-1.5">
        <FootprintRow
          label="Piante totali"
          value={density.showTotalLessThanOne ? "<1" : String(density.totalPlants)}
          hint={`${patch.plantCols}×${patch.plantRows}`}
        />
        <FootprintRow
          label="Ingombro"
          value={`${Math.round(displayFootprint.widthCm)}×${Math.round(displayFootprint.heightCm)} cm`}
          hint={`${(displayFootprint.widthCm / 100).toFixed(2)}×${(displayFootprint.heightCm / 100).toFixed(2)} m`}
        />
        <FootprintRow
          label="Celle occupate"
          value={`${occupied.cols}×${occupied.rows}`}
          hint={`${occupied.cols * occupied.rows}/${bed.cols * bed.rows}`}
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
 * Stato di "nessuna selezione" della pannellatura Proprietà: mostra
 * informazioni e impostazioni dell'orto (nome, esposizione e posizione
 * geografica usata dai Suggerimenti per il meteo).
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
