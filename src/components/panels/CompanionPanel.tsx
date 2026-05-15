"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { useGardenStore } from "@/lib/store";
import { plantById } from "@/lib/data/plants";
import { uniqueCompanionPairs } from "@/lib/utils/companions";
import { PlantCompanionCatalog } from "@/components/panels/PlantCompanionCatalog";
import { CheckCircle2, AlertTriangle, Leaf } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function CompanionPanel() {
  const beds = useGardenStore((s) => s.beds);
  const selection = useGardenStore((s) => s.selection);

  const targetBed =
    selection && (selection.kind === "bed" || selection.kind === "plant")
      ? beds.find((b) => b.id === selection.bedId)
      : null;

  const selectedPlant =
    selection?.kind === "plant" && targetBed
      ? plantById(
          targetBed.patches.find((p) => p.id === selection.patchId)?.plantId ??
            "",
        )
      : null;

  if (!targetBed) {
    return (
      <div className="p-8 text-center">
        <div className="size-10 rounded-full bg-muted/70 grid place-items-center mx-auto mb-3">
          <Leaf className="size-4 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium tracking-tight">
          Seleziona un&apos;aiuola
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Per vedere le coppie compagne e i conflitti di vicinato.
        </p>
      </div>
    );
  }

  const pairs = uniqueCompanionPairs(targetBed);
  const good = pairs.filter((p) => p.type === "good");
  const bad = pairs.filter((p) => p.type === "bad");

  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
          Vicinato
        </div>
        <h3 className="text-sm font-semibold tracking-tight">
          {targetBed.name}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile
          tone="good"
          icon={<CheckCircle2 className="size-3.5" />}
          label="Compagne"
          value={good.length}
        />
        <StatTile
          tone="bad"
          icon={<AlertTriangle className="size-3.5" />}
          label="Conflitti"
          value={bad.length}
        />
      </div>

      {pairs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          Nessuna coppia adiacente da segnalare.
        </div>
      ) : (
        <div className="space-y-1.5">
          {pairs.map((p) => (
            <PairRow key={`${p.a.id}-${p.b.id}`} pair={p} />
          ))}
        </div>
      )}
      {selectedPlant ? (
        <>
          <Separator />
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-2">
              {selectedPlant.name}
            </div>
            <PlantCompanionCatalog plant={selectedPlant} />
          </div>
        </>
      ) : null}

    </div>
  );
}

function StatTile({
  tone,
  icon,
  label,
  value,
}: {
  tone: "good" | "bad";
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  const isGood = tone === "good";
  return (
    <div
      className={
        "rounded-xl border p-3 " +
        (isGood
          ? "border-[var(--sage)]/30 bg-[var(--sage-soft)]/40"
          : "border-[var(--terracotta)]/30 bg-[var(--terracotta-soft)]/40")
      }
    >
      <div
        className={
          "flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide " +
          (isGood ? "text-[var(--sage)]" : "text-[var(--terracotta)]")
        }
      >
        {icon}
        {label}
      </div>
      <div className="text-2xl font-semibold tabular-nums mt-1">{value}</div>
    </div>
  );
}

function PairRow({
  pair,
}: {
  pair: ReturnType<typeof uniqueCompanionPairs>[number];
}) {
  const a = plantById(pair.a.plantId);
  const b = plantById(pair.b.plantId);
  if (!a || !b) return null;
  const isGood = pair.type === "good";
  const reason =
    isGood
      ? (a.companions.find((c) => c.plantId === pair.b.plantId)?.reason ??
        b.companions.find((c) => c.plantId === pair.a.plantId)?.reason)
      : (a.antagonists.find((e) => e.plantId === pair.b.plantId)?.reason ??
        b.antagonists.find((e) => e.plantId === pair.a.plantId)?.reason);
  return (
    <div className="rounded-lg border border-border bg-card p-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-sm min-w-0">
          <span className="text-base shrink-0">{a.emoji}</span>
          <span className="font-medium truncate">{a.name}</span>
        </div>
        <span
          className={
            "h-px flex-1 shrink " +
            (isGood ? "bg-[var(--sage)]" : "bg-[var(--terracotta)]")
          }
        />
        <Badge
          variant="outline"
          className={
            "font-mono text-[10px] shrink-0 " +
            (isGood
              ? "border-[var(--sage)]/40 text-[var(--sage)]"
              : "border-[var(--terracotta)]/40 text-[var(--terracotta)]")
          }
        >
          {isGood ? "ok" : "evitare"}
        </Badge>
        <span
          className={
            "h-px flex-1 shrink " +
            (isGood ? "bg-[var(--sage)]" : "bg-[var(--terracotta)]")
          }
        />
        <div className="flex items-center gap-1 text-sm min-w-0 justify-end">
          <span className="font-medium truncate">{b.name}</span>
          <span className="text-base shrink-0">{b.emoji}</span>
        </div>
      </div>
      {reason ? (
        <p className="text-[10px] text-muted-foreground leading-snug border-t border-border/50 pt-1.5">
          {reason}
        </p>
      ) : null}
    </div>
  );
}
