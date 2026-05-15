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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { quickAddPlantsToGarden } from "@/lib/utils/quick-add-plant";
import { Search, Sprout } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddPlantDialog({ open, onOpenChange }: Props) {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<PlantCategoryFilter>("all");
  const [multiSelect, setMultiSelect] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setCategory("all");
      setMultiSelect(false);
      setSelectedIds(new Set());
    }
  }, [open]);

  const togglePlantSelection = React.useCallback((plantId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(plantId)) next.delete(plantId);
      else next.add(plantId);
      return next;
    });
  }, []);

  const selectedPlants = React.useMemo(
    () => PLANTS.filter((p) => selectedIds.has(p.id)),
    [selectedIds],
  );

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

  const handleBatchAdd = React.useCallback(() => {
    if (selectedPlants.length === 0) return;
    quickAddPlantsToGarden(selectedPlants, {
      onAdded: () => {
        setSelectedIds(new Set());
        onOpenChange(false);
      },
    });
  }, [onOpenChange, selectedPlants]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "!grid h-[min(88dvh,720px)] w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] gap-0 overflow-hidden p-0 sm:max-w-xl",
          multiSelect && selectedIds.size > 0
            ? "grid-rows-[auto_auto_minmax(0,1fr)_auto]"
            : "grid-rows-[auto_auto_minmax(0,1fr)]",
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-12">
          <DialogTitle>Aggiungi all&apos;aiuola</DialogTitle>
          <DialogDescription>
            Scegli una o più piante: tocca per aggiungere subito, oppure attiva la selezione
            multipla per inserirle in batch.
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

          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setMultiSelect((v) => {
                  if (v) setSelectedIds(new Set());
                  return !v;
                });
              }}
              className={cn(
                "rounded-full border px-2 py-1 text-[10px] font-mono uppercase tracking-wide transition-colors",
                multiSelect
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              Selezione multipla
            </button>
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
          className="min-h-0 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
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
                  selectable={multiSelect}
                  selected={selectedIds.has(plant.id)}
                  onToggleSelect={() => togglePlantSelection(plant.id)}
                  onAdded={multiSelect ? undefined : handleAdded}
                />
              ))}
            </div>
          )}
          </div>
        </div>

        {multiSelect && selectedIds.size > 0 ? (
          <div className="flex shrink-0 items-center gap-2 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
            <Button type="button" className="flex-1" onClick={handleBatchAdd}>
              Aggiungi {selectedIds.size}{" "}
              {selectedIds.size === 1 ? "pianta" : "piante"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedIds(new Set())}
            >
              Deseleziona
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
