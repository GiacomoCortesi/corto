"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type PlantChip = {
  id: string;
  emoji: string;
  name: string;
};

const PLANTS: Record<string, PlantChip> = {
  tomato: { id: "tomato", emoji: "🍅", name: "Pomodoro" },
  basil: { id: "basil", emoji: "🌿", name: "Basilico" },
  onion: { id: "onion", emoji: "🧅", name: "Cipolla" },
  carrot: { id: "carrot", emoji: "🥕", name: "Carota" },
  cucumber: { id: "cucumber", emoji: "🥒", name: "Cetriolo" },
};

type Cell = {
  plant?: PlantChip;
  ring?: "good" | "bad";
  season?: "sowing" | "transplanting" | "harvest" | "sowing+transplanting";
  dim?: boolean;
  ghost?: boolean;
};

function makeGrid(cols: number, rows: number): Cell[] {
  return Array.from({ length: cols * rows }, () => ({}));
}

function idx(col: number, row: number, cols: number) {
  return row * cols + col;
}

function buildState(step: number) {
  const cols = 8;
  const rows = 5;
  const grid = makeGrid(cols, rows);

  // “Bed” outline area within the demo grid
  const bed = { x: 1, y: 1, w: 6, h: 3 };
  const inBed = (c: number, r: number) =>
    c >= bed.x && c < bed.x + bed.w && r >= bed.y && r < bed.y + bed.h;

  // Base: subtle dim outside bed for focus
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!inBed(c, r)) grid[idx(c, r, cols)].dim = true;
    }
  }

  if (step >= 1) {
    // Step 2: ghost hover
    grid[idx(3, 2, cols)] = { ...grid[idx(3, 2, cols)], ghost: true };
  }

  if (step >= 2) {
    // Step 3: good companions
    grid[idx(3, 2, cols)] = { ...grid[idx(3, 2, cols)], plant: PLANTS.cucumber };
    grid[idx(4, 2, cols)] = { ...grid[idx(4, 2, cols)], plant: PLANTS.basil };
    grid[idx(3, 2, cols)].ring = "good";
    grid[idx(4, 2, cols)].ring = "good";
  }

  if (step >= 3) {
    // Step 4 (April): seasonal highlighting like the app
    // semina = sage, trapianto = sky, raccolto = terracotta
    // Pomodoro in aprile: semina+trapianto. Basilico: semina. Carota: semina.
    grid[idx(3, 2, cols)] = {
      ...grid[idx(3, 2, cols)],
      plant: PLANTS.tomato,
      season: "sowing+transplanting",
    };
    grid[idx(4, 2, cols)] = {
      ...grid[idx(4, 2, cols)],
      plant: PLANTS.basil,
      season: "sowing",
    };
    grid[idx(2, 2, cols)] = {
      ...grid[idx(2, 2, cols)],
      plant: PLANTS.carrot,
      season: "sowing",
    };
  }

  if (step >= 4) {
    // Step 5: AI suggestions hint (keep it visual + lightweight)
    grid[idx(5, 1, cols)].ring = "good";
  }

  return { cols, rows, bed, grid };
}

export function DemoGrid({ step, stepT }: { step: number; stepT?: number }) {
  const states = React.useMemo(
    () => [0, 1, 2, 3, 4].map((s) => buildState(s)),
    []
  );

  if (step === 0) {
    return (
      <div
        className="relative mx-auto w-fit"
        style={
          {
            // Match the grid width exactly (8 cols + 7 gaps)
            ["--demo-cell" as never]: "clamp(28px, 5.2vw, 56px)",
            ["--demo-gap" as never]: "0.5rem",
            width: "calc(8 * var(--demo-cell) + 7 * var(--demo-gap))",
            maxWidth: "92vw",
          } as React.CSSProperties
        }
      >
        <div
          className="relative overflow-hidden rounded-2xl bg-card/20"
          style={
            {
              width: "calc(8 * var(--demo-cell) + 7 * var(--demo-gap))",
              height: "calc(5 * var(--demo-cell) + 4 * var(--demo-gap))",
              maxWidth: "92vw",
            } as React.CSSProperties
          }
        >
          <Image
            src="/landing/step1-beds.png"
            alt="Esempio aiuole e griglia"
            fill
            sizes="(min-width: 1024px) 520px, 92vw"
            className="object-cover"
            priority={false}
          />
        </div>
      </div>
    );
  }

  const active = states[Math.max(0, Math.min(4, step))]!;
  const { cols, bed, grid } = active;

  const t = stepT ?? 0;
  const showFly = step === 1;
  const flyT = showFly ? Math.min(1, Math.max(0, t)) : 0;

  return (
    <div
      className="relative mx-auto w-fit"
      style={
        {
          // Bigger, “hero” cells on desktop, still responsive on mobile.
          // Keep as CSS var so we can use it for width/height too.
          ["--demo-cell" as never]: "clamp(28px, 5.2vw, 56px)",
          ["--demo-gap" as never]: "0.5rem",
        } as React.CSSProperties
      }
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, var(--demo-cell))`,
          gap: "var(--demo-gap)",
        }}
      >
        {grid.map((cell, i) => {
          const c = i % cols;
          const r = Math.floor(i / cols);
          const isBedEdge =
            c >= bed.x &&
            c < bed.x + bed.w &&
            r >= bed.y &&
            r < bed.y + bed.h &&
            (c === bed.x || c === bed.x + bed.w - 1 || r === bed.y || r === bed.y + bed.h - 1);

          return (
            <div
              key={i}
              className={cn(
                "relative rounded-xl border bg-card/40",
                cell.dim && "opacity-45",
                isBedEdge && "border-primary/30",
                cell.season === "sowing" && "bg-[var(--sage)]/12 border-[var(--sage)]/30",
                cell.season === "transplanting" && "bg-[var(--sky)]/12 border-[var(--sky)]/30",
                cell.season === "harvest" && "bg-[var(--terracotta)]/12 border-[var(--terracotta)]/30",
                cell.season === "sowing+transplanting" &&
                  "bg-gradient-to-br from-[var(--sage)]/14 to-[var(--sky)]/14 border-primary/25",
                cell.ring === "good" && "ring-2 ring-[var(--sage)]/45 bg-[var(--sage-soft)]/55",
                cell.ring === "bad" && "ring-2 ring-[var(--terracotta)]/55 bg-[var(--terracotta-soft)]/55",
                cell.ghost && "ring-2 ring-primary/35 bg-[color-mix(in_oklab,var(--primary)_10%,var(--card))]"
              )}
              style={{
                width: "var(--demo-cell)",
                height: "var(--demo-cell)",
              }}
            >
              {cell.plant ? (
                <div
                  className={cn(
                    "absolute inset-0 grid place-items-center",
                    step >= 2 && "plant-pop"
                  )}
                >
                  <span className="text-2xl">{cell.plant.emoji}</span>
                </div>
              ) : null}

              {cell.ghost ? (
                <div className="absolute inset-0 grid place-items-center">
                  <span className="text-2xl opacity-70">{PLANTS.cucumber.emoji}</span>
                </div>
              ) : null}

            </div>
          );
        })}
      </div>

      {/* Step 2: fly-in tomato (on scroll) */}
      {showFly ? (
        <div
          className="pointer-events-none absolute left-0 top-0"
          style={
            {
              width: "var(--demo-cell)",
              height: "var(--demo-cell)",
              transform: `translate3d(calc(${(-2 + flyT * (3 + 2))} * (var(--demo-cell) + var(--demo-gap))), calc(1 * (var(--demo-cell) + var(--demo-gap))), 0)`,
              transition: "opacity 120ms ease-out",
              opacity: flyT < 0.02 ? 0 : 1,
              filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.10))",
            } as React.CSSProperties
          }
        >
          <div className="absolute inset-0 grid place-items-center rounded-xl bg-card/85 border border-primary/20 ring-2 ring-primary/15 backdrop-blur">
            <span className="text-2xl">{PLANTS.tomato.emoji}</span>
          </div>
        </div>
      ) : null}

      {/* Step 3: companion info card (like the app) */}
      {step === 2 ? (
        <div className="pointer-events-none absolute -right-3 -bottom-3">
          <div className="w-[340px] max-w-[72vw] rounded-2xl border bg-card/88 backdrop-blur px-4 py-4 shadow-sm ring-1 ring-primary/10 fade-in-up">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-primary/70">
              Vicinato
            </div>
            <div className="mt-1 text-base font-semibold tracking-tight">
              Aiuola dietro casa
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-[var(--sage)]/30 bg-[var(--sage-soft)]/55 px-3 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-[color-mix(in_oklab,var(--sage)_75%,black)]">
                  <span className="grid size-5 place-items-center rounded-full bg-card/70 ring-1 ring-[var(--sage)]/20">
                    ✓
                  </span>
                  COMPAGNE
                </div>
                <div className="mt-1 text-3xl font-semibold leading-none text-foreground/95">
                  1
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--terracotta)]/30 bg-[var(--terracotta-soft)]/55 px-3 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-[color-mix(in_oklab,var(--terracotta)_72%,black)]">
                  <span className="grid size-5 place-items-center rounded-full bg-card/70 ring-1 ring-[var(--terracotta)]/20">
                    !
                  </span>
                  CONFLITTI
                </div>
                <div className="mt-1 text-3xl font-semibold leading-none text-foreground/95">
                  1
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="rounded-2xl border bg-background/35 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">🧅</span>
                    <span className="font-medium truncate">Scalogno</span>
                  </div>
                  <span className="rounded-full border border-[var(--sage)]/35 bg-[var(--sage-soft)]/60 px-2 py-0.5 text-[11px] font-semibold text-[color-mix(in_oklab,var(--sage)_70%,black)]">
                    ok
                  </span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">Pomodoro</span>
                    <span className="text-lg">🍅</span>
                  </div>
                </div>
                <div className="mt-2 text-[12px] leading-snug text-muted-foreground">
                  Aromi e allestimento aiutano a ridurre stress e parassiti: buona
                  combinazione in aiuola.
                </div>
              </div>

              <div className="rounded-2xl border bg-background/35 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">🥒</span>
                    <span className="font-medium truncate">Cetriolo</span>
                  </div>
                  <span className="rounded-full border border-[var(--terracotta)]/35 bg-[var(--terracotta-soft)]/60 px-2 py-0.5 text-[11px] font-semibold text-[color-mix(in_oklab,var(--terracotta)_72%,black)]">
                    evitare
                  </span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">Zucchina</span>
                    <span className="text-lg">🥒</span>
                  </div>
                </div>
                <div className="mt-2 text-[12px] leading-snug text-muted-foreground">
                  Nella stessa aiuola stretta aumenta il rischio di malattie
                  fogliari comuni.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Step 4: informative calendar (April) + seasonal color cue */}
      {step === 3 ? (
        <div className="pointer-events-none absolute -right-3 -top-3">
          <div className="rounded-2xl border bg-card/85 backdrop-blur px-4 py-3 shadow-sm ring-1 ring-primary/10 fade-in-up">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Calendario</div>
                <div className="text-sm font-semibold tracking-tight">Aprile</div>
              </div>
              <div className="h-8 w-8 rounded-xl bg-[var(--sky-soft)] ring-1 ring-[var(--sky)]/25 grid place-items-center">
                <span className="text-xs font-semibold text-[color-mix(in_oklab,var(--sky)_70%,black)]">
                  04
                </span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1">
              {["L", "M", "M", "G", "V", "S", "D"].map((d, i) => (
                <div key={`${d}-${i}`} className="text-[10px] text-muted-foreground/80 text-center">
                  {d}
                </div>
              ))}
              {Array.from({ length: 14 }, (_, i) => i + 1).map((n) => {
                const active = n === 12;
                return (
                  <div
                    key={n}
                    className={cn(
                      "h-6 w-6 rounded-lg grid place-items-center text-[10px] border",
                      active
                        ? "bg-[var(--primary)] text-primary-foreground border-primary/30"
                        : "bg-background/40 text-foreground/80 border-border/60"
                    )}
                  >
                    {n}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[var(--sage)] ring-1 ring-border/30" />
                semina
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[var(--sky)] ring-1 ring-border/30" />
                trapianto
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[var(--terracotta)] ring-1 ring-border/30" />
                raccolto
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Step 5: real Suggestions UI example */}
      {step === 4 ? (
        <div className="pointer-events-none absolute -right-3 -bottom-3">
          <div className="w-[360px] max-w-[78vw] rounded-2xl border bg-card/88 backdrop-blur px-4 py-4 shadow-sm ring-1 ring-primary/10 fade-in-up">
            <div className="flex items-start gap-2">
              <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                <span className="text-base">✨</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold tracking-tight">
                  Chiedi suggerimenti
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
                  Un assistente ragiona per attività: cosa fare, quando farlo e perché
                  (cadenze, diario, meteo).
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-primary-foreground text-xs font-semibold">
                <span className="opacity-90">↻</span>
                Aggiorna
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                ultimo: 12:32
              </span>
            </div>

            <div className="mt-3 rounded-2xl border bg-muted/35 px-3 py-3">
              <div className="text-[10px] font-mono text-muted-foreground">
                Prossimi 14 gg @ Europe/Rome
              </div>
              <div className="mt-1 text-[11px] leading-snug text-muted-foreground">
                Pioggia: nessuna significativa • Temp: 20–27°C • ETo ~4.8 mm/g
              </div>
            </div>

            <div className="mt-3 rounded-2xl border bg-background/35 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">💧</span>
                  <span className="font-semibold truncate">
                    Annaffiatura: valutazione per aiuole
                  </span>
                </div>
                <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-primary">
                  alta
                </span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                tra 2 gg (±2gg) • 16 da fare / 19 valutate
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
