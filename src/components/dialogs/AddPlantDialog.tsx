"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PLANTS } from "@/lib/data/plants";
import { PLANT_CATEGORIES, type PlantCategoryFilter } from "@/lib/data/plant-categories";
import { PlantCard } from "@/components/sidebar/PlantCard";
import { cn } from "@/lib/utils";
import { Search, Sprout } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddPlantDialog({ open, onOpenChange }: Props) {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<PlantCategoryFilter>("all");

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setCategory("all");
    }
  }, [open]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = PLANTS.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.scientific?.toLowerCase().includes(q))
        return false;
      return true;
    });
    return [...base].sort((a, b) => a.name.localeCompare(b.name, "it"));
  }, [category, query]);

  const handleAdded = React.useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex h-[min(88dvh,720px)] w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-12">
          <DialogTitle>Aggiungi all&apos;aiuola</DialogTitle>
          <DialogDescription>
            Scegli una pianta: esigenze di sole e acqua, periodi di semina e trapianto.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 space-y-3 border-b border-border px-4 py-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca pianta..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 pl-8 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {PLANT_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={cn(
                  "rounded-full border px-2 py-1 text-[10px] font-mono uppercase tracking-wide transition-colors",
                  category === c.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-3">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Sprout className="mx-auto mb-2 size-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Nessuna pianta corrisponde ai filtri.
              </p>
            </div>
          ) : (
            <div className="space-y-2 pb-1">
              {filtered.map((plant, i) => (
                <PlantCard
                  key={plant.id}
                  plant={plant}
                  index={i}
                  draggable={false}
                  showTodayHints={false}
                  onAdded={handleAdded}
                />
              ))}
            </div>
          )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
