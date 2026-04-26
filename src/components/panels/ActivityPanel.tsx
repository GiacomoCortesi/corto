"use client";

import * as React from "react";
import { useGardenStore } from "@/lib/store";
import type { GardenActivityKind } from "@/lib/types";
import { plantById } from "@/lib/data/plants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CalendarClock, Check, Trash2, Link2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const KIND_ORDER: GardenActivityKind[] = [
  "sowing",
  "weeding",
  "watering",
  "transplanting",
  "treatment",
  "harvest",
  "note",
  "other",
];

const KIND_LABEL: Record<GardenActivityKind, string> = {
  sowing: "Semina",
  weeding: "Sarchiatura / diserbo",
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

function toDatetimeLocalValue(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localDayKey(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDayHeading(ts: number): string {
  return new Date(ts).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityPanel() {
  const events = useGardenStore((s) => s.events);
  const addActivity = useGardenStore((s) => s.addActivity);
  const removeActivity = useGardenStore((s) => s.removeActivity);
  const updateActivity = useGardenStore((s) => s.updateActivity);
  const beds = useGardenStore((s) => s.beds);
  const selection = useGardenStore((s) => s.selection);

  const [atStr, setAtStr] = React.useState(() =>
    toDatetimeLocalValue(Date.now()),
  );
  const [kind, setKind] = React.useState<GardenActivityKind>("sowing");
  const [notes, setNotes] = React.useState("");

  const context = React.useMemo(() => {
    if (!selection) {
      return {
        bedId: undefined as string | undefined,
        patchId: undefined as string | undefined,
        plantId: undefined as string | undefined,
        line: null as string | null,
      };
    }
    const bed = beds.find((b) => b.id === selection.bedId);
    if (!bed) {
      return { bedId: undefined, patchId: undefined, plantId: undefined, line: null };
    }
    if (selection.kind === "bed") {
      return {
        bedId: bed.id,
        patchId: undefined,
        plantId: undefined,
        line: bed.name,
      };
    }
    const patch = bed.patches.find((p) => p.id === selection.patchId);
    const plant = patch ? plantById(patch.plantId) : undefined;
    return {
      bedId: bed.id,
      patchId: patch?.id,
      plantId: patch?.plantId,
      line: plant ? `${bed.name} — ${plant.name}` : bed.name,
    };
  }, [beds, selection]);

  const groups = React.useMemo(() => {
    const m = new Map<string, typeof events>();
    for (const e of events) {
      const k = localDayKey(e.at);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    }
    const keys = [...m.keys()].sort((a, b) => b.localeCompare(a));
    return keys.map((dayKey) => ({
      dayKey,
      headerTs: m.get(dayKey)![0].at,
      items: m.get(dayKey)!,
    }));
  }, [events]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const at = new Date(atStr).getTime();
    if (Number.isNaN(at)) {
      toast.error("Data non valida");
      return;
    }
    addActivity({
      at,
      kind,
      notes: notes.trim() || undefined,
      bedId: context.bedId,
      patchId: context.patchId,
      plantId: context.plantId,
    });
    setNotes("");
    setAtStr(toDatetimeLocalValue(Date.now()));
    toast.success("Attività registrata", { duration: 2000 });
  };

  return (
    <div className="p-4 space-y-4">
      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-border bg-card/40 p-3">
        <p className="text-xs text-muted-foreground">
          Registra cosa hai fatto nell&apos;orto. È distinto dal calendario colturale
          delle specie nelle Proprietà.
        </p>

        {context.line ? (
          <div
            className="flex items-start gap-2 rounded-md bg-muted/50 px-2 py-1.5 text-xs text-foreground/90"
            title="Contesto dalla selezione sul canvas"
          >
            <Link2 className="size-3.5 shrink-0 text-muted-foreground mt-0.5" />
            <span>
              <span className="text-muted-foreground">Contesto: </span>
              {context.line}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="size-3.5" />
            <span>Nessuna aiuola o pianta selezionata — attività generica.</span>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="act-datetime" className="text-xs">
            Quando
          </Label>
          <Input
            id="act-datetime"
            type="datetime-local"
            value={atStr}
            onChange={(e) => setAtStr(e.target.value)}
            className="font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="act-kind" className="text-xs">
            Tipo
          </Label>
          <Select
            value={kind}
            onValueChange={(v) => setKind(v as GardenActivityKind)}
          >
            <SelectTrigger id="act-kind" size="sm" className="w-full">
              <SelectValue placeholder="Tipo attività" />
            </SelectTrigger>
            <SelectContent>
              {KIND_ORDER.map((k) => (
                <SelectItem key={k} value={k}>
                  <span className="flex items-center gap-2">
                    <span>{KIND_EMOJI[k]}</span>
                    {KIND_LABEL[k]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="act-notes" className="text-xs">
            Note (opzionale)
          </Label>
          <Input
            id="act-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="es. terreno ancora umido, dose concime…"
            maxLength={500}
            className="text-xs"
          />
        </div>

        <Button type="submit" size="sm" className="w-full">
          Registra
        </Button>
      </form>

      <div className="space-y-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Cronologia
        </h3>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            Nessuna attività ancora. Usa il modulo sopra per iniziare.
          </p>
        ) : (
          groups.map(({ dayKey, headerTs, items }) => (
            <div key={dayKey} className="space-y-2">
              <div className="text-xs font-medium text-foreground/90 capitalize border-b border-border/80 pb-1">
                {formatDayHeading(headerTs)}
              </div>
              <ul className="space-y-2">
                {items.map((act) => {
                  const isPlannedFuture =
                    act.planned === true && act.at > Date.now();
                  return (
                    <li
                      key={act.id}
                      className={cn(
                        "group flex gap-2 rounded-md border border-border/60 bg-card/30 px-2 py-1.5 text-sm",
                        isPlannedFuture &&
                          "opacity-80 border-dashed bg-muted/20",
                      )}
                    >
                      <span className="shrink-0 text-base" aria-hidden>
                        {KIND_EMOJI[act.kind]}
                      </span>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="flex items-center gap-1.5 font-medium leading-tight">
                            {KIND_LABEL[act.kind]}
                            {isPlannedFuture ? (
                              <Badge
                                variant="outline"
                                className="text-[9px] uppercase tracking-wide gap-1"
                              >
                                <CalendarClock className="size-2.5" />
                                pianificata
                              </Badge>
                            ) : null}
                          </span>
                          <span className="shrink-0 text-[10px] font-mono text-muted-foreground tabular-nums">
                            {formatTime(act.at)}
                          </span>
                        </div>
                        {act.notes ? (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {act.notes}
                          </p>
                        ) : null}
                        <ContextLine activity={act} beds={beds} />
                      </div>
                      <div className="flex flex-col items-center gap-0.5 -mr-0.5">
                        {isPlannedFuture ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0 opacity-70 hover:opacity-100"
                            aria-label="Segna come fatta"
                            title="Segna come fatta"
                            onClick={() => {
                              updateActivity(act.id, {
                                at: Date.now(),
                                planned: false,
                              });
                              toast.success("Segnata come fatta", {
                                duration: 1500,
                              });
                            }}
                          >
                            <Check className="size-3.5" />
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0 opacity-60 hover:opacity-100"
                          aria-label="Elimina attività"
                          onClick={() => {
                            removeActivity(act.id);
                            toast("Voce eliminata", { duration: 1500 });
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ContextLine({
  activity,
  beds,
}: {
  activity: { bedId?: string; plantId?: string };
  beds: { id: string; name: string }[];
}) {
  if (!activity.bedId) {
    return (
      <p className="text-[10px] text-muted-foreground/80">Tutto l&apos;orto</p>
    );
  }
  const bed = beds.find((b) => b.id === activity.bedId);
  const bedName = bed?.name ?? "Aiuola (rimossa)";
  if (!activity.plantId) {
    return <p className="text-[10px] text-muted-foreground/80">{bedName}</p>;
  }
  const plant = plantById(activity.plantId);
  return (
    <p className="text-[10px] text-muted-foreground/80">
      {bedName}
      {plant ? ` — ${plant.name}` : ""}
    </p>
  );
}
