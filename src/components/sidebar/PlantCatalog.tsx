"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { SeasonFilter } from "@/components/sidebar/SeasonFilter";
import { TipOfTheDayCard } from "@/components/sidebar/TipOfTheDay";

export function PlantCatalog() {
  return (
    <aside className="hidden md:flex w-[240px] xl:w-[260px] shrink-0 border-r border-border bg-sidebar/80 backdrop-blur supports-[backdrop-filter]:bg-sidebar/60 flex flex-col">
      <PlantCatalogContent />
    </aside>
  );
}

export function PlantCatalogContent({
  scrollMode = "scroll-area",
}: {
  scrollMode?: "scroll-area" | "native";
}) {
  const body = (
    <div className="p-3 space-y-3">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
          Orto
        </div>
        <h2 className="text-sm font-semibold tracking-tight">Stagione</h2>
      </div>

      <SeasonFilter />

      <TipOfTheDayCard />

      <LegendBar />
    </div>
  );

  if (scrollMode === "native") {
    return <div className="flex-1 min-h-0 overflow-y-auto touch-pan-y">{body}</div>;
  }

  return <ScrollArea className="flex-1">{body}</ScrollArea>;
}

function LegendBar() {
  return (
    <div className="rounded-xl border border-border bg-card/60 px-2.5 py-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
          Legenda
        </div>
        <div className="text-[9px] font-mono uppercase tracking-wide text-muted-foreground">
          canvas
        </div>
      </div>

      <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
        <LegendItem label="Semina" className="bg-[var(--sage)]" />
        <LegendItem label="Trapianto" className="bg-[var(--ochre)]" />
        <LegendItem label="Raccolto" className="bg-[var(--terracotta)]" />
        <LegendItem label="Fuori stagione" className="bg-muted-foreground/40" hint="opaco" />
        <LegendItem label="Vicini OK" className="bg-[var(--sage)]/70" hint="bordo" />
        <LegendItem label="Conflitto" className="bg-[var(--terracotta)]/70" hint="bordo" />
      </div>
    </div>
  );
}

function LegendItem({
  label,
  className,
  hint,
}: {
  label: string;
  className: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 min-w-0">
        <span
          className={"size-2.5 rounded-sm border border-border/50 shrink-0 " + className}
          aria-hidden
        />
        <span className="truncate">{label}</span>
      </span>
      {hint ? (
        <span className="text-[9px] font-mono uppercase tracking-wide text-muted-foreground/80 shrink-0">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
