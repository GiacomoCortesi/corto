"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { PLANTS, plantActiveInMonth } from "@/lib/data/plants";
import { PlantCard } from "@/components/sidebar/PlantCard";
import { SeasonFilter } from "@/components/sidebar/SeasonFilter";
import { useGardenStore } from "@/lib/store";
import { Search, Sprout } from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "Tutte" },
  { id: "ortaggio", label: "Ortaggi" },
  { id: "frutto", label: "Frutti" },
  { id: "frutti-di-bosco", label: "Bosco" },
  { id: "foglia", label: "Foglia" },
  { id: "radice", label: "Radici" },
  { id: "leguminosa", label: "Legumi" },
  { id: "aromatica", label: "Aromat." },
] as const;

type Category = (typeof CATEGORIES)[number]["id"];

export function PlantCatalog() {
  return (
    <aside className="hidden md:flex w-[260px] xl:w-[300px] shrink-0 border-r border-border bg-sidebar/80 backdrop-blur supports-[backdrop-filter]:bg-sidebar/60 flex flex-col">
      <PlantCatalogContent />
    </aside>
  );
}

export function PlantCatalogContent({
  scrollMode = "scroll-area",
}: {
  scrollMode?: "scroll-area" | "native";
}) {
  const seasonFilter = useGardenStore((s) => s.seasonFilter);
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<Category>("all");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = PLANTS.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.scientific?.toLowerCase().includes(q))
        return false;
      return true;
    });
    if (seasonFilter === null) return base;
    return [...base].sort((a, b) => {
      const ao = plantActiveInMonth(a, seasonFilter) ? 0 : 1;
      const bo = plantActiveInMonth(b, seasonFilter) ? 0 : 1;
      return ao - bo;
    });
  }, [query, category, seasonFilter]);

  return (
    <>
      <div className="p-3 space-y-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
              Catalogo
            </div>
            <h2 className="text-sm font-semibold tracking-tight">Piante</h2>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Cerca pianta..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>

        <SeasonFilter />

        <LegendBar />

        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={
                "px-2 py-1 rounded-full text-[10px] font-mono uppercase tracking-wide border transition-colors " +
                (category === c.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/40")
              }
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {scrollMode === "native" ? (
        <div className="flex-1 min-h-0 overflow-y-auto touch-pan-y">
          <div className="p-3 space-y-2">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <Sprout className="size-5 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  Nessuna pianta corrisponde ai filtri.
                </p>
              </div>
            ) : (
              filtered.map((p, i) => (
                <PlantCard
                  key={p.id}
                  plant={p}
                  index={i}
                  outOfSeason={seasonFilter !== null && !plantActiveInMonth(p, seasonFilter)}
                />
              ))
            )}
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <Sprout className="size-5 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  Nessuna pianta corrisponde ai filtri.
                </p>
              </div>
            ) : (
              filtered.map((p, i) => (
                <PlantCard
                  key={p.id}
                  plant={p}
                  index={i}
                  outOfSeason={seasonFilter !== null && !plantActiveInMonth(p, seasonFilter)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </>
  );
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
        <LegendItem label="Trapianto" className="bg-[var(--sky)]" />
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
