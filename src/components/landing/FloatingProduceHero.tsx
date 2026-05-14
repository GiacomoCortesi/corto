"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ProduceItem = {
  emoji: string;
  leftPct: number;
  topPct: number;
  scale: number;
  blurPx?: number;
  opacity?: number;
  anim: "a" | "b" | "c";
  delayS: number;
  durationS: number;
};

type BaseItem = Omit<ProduceItem, "blurPx" | "opacity"> &
  Partial<Pick<ProduceItem, "blurPx" | "opacity">>;

const BASE_ITEMS: BaseItem[] = [
  { emoji: "🍅", leftPct: 18, topPct: 22, scale: 1.15, anim: "a", delayS: 0.0, durationS: 4.8 },
  { emoji: "🥕", leftPct: 72, topPct: 16, scale: 1.1, anim: "b", delayS: 0.6, durationS: 5.3 },
  { emoji: "🥒", leftPct: 58, topPct: 48, scale: 1.0, anim: "c", delayS: 0.2, durationS: 5.9 },
  { emoji: "🧅", leftPct: 28, topPct: 55, scale: 0.95, anim: "b", delayS: 1.0, durationS: 6.2 },
  { emoji: "🍆", leftPct: 84, topPct: 56, scale: 0.95, anim: "a", delayS: 1.4, durationS: 5.6 },
  { emoji: "🌶️", leftPct: 46, topPct: 20, scale: 0.9, anim: "c", delayS: 1.8, durationS: 5.1 },
  { emoji: "🍓", leftPct: 40, topPct: 70, scale: 1.05, anim: "a", delayS: 0.9, durationS: 6.6 },
  { emoji: "🥬", leftPct: 66, topPct: 72, scale: 1.05, anim: "b", delayS: 1.6, durationS: 6.8 },
  { emoji: "🌽", leftPct: 12, topPct: 66, scale: 0.95, anim: "c", delayS: 0.4, durationS: 6.4 },
  { emoji: "🍋", leftPct: 86, topPct: 30, scale: 0.85, anim: "b", delayS: 2.0, durationS: 7.2, opacity: 0.9 },
  { emoji: "🍄", leftPct: 52, topPct: 34, scale: 0.9, anim: "a", delayS: 2.4, durationS: 7.0, opacity: 0.9 },
  { emoji: "🫑", leftPct: 24, topPct: 34, scale: 0.88, anim: "c", delayS: 2.8, durationS: 7.3, opacity: 0.88 },
  { emoji: "🥔", leftPct: 78, topPct: 76, scale: 0.9, anim: "a", delayS: 3.1, durationS: 7.6, opacity: 0.88 },
  { emoji: "🍎", leftPct: 14, topPct: 42, scale: 0.82, anim: "b", delayS: 3.4, durationS: 7.8, opacity: 0.86 },
] ;

const ITEMS: ProduceItem[] = BASE_ITEMS.map((it, i) => ({
  ...it,
  blurPx: it.blurPx ?? (i % 6 === 0 ? 0.5 : 0),
  opacity: it.opacity ?? 1,
}));

function animClass(a: ProduceItem["anim"]) {
  if (a === "a") return "produce-float-a";
  if (a === "b") return "produce-float-b";
  return "produce-float-c";
}

export function ProduceHeroBackdrop({ className }: { className?: string }) {
  return (
    <div
      className={cn("pointer-events-none select-none", className)}
      aria-hidden="true"
    >
      <div className="absolute inset-0 produce-hero-blob" />
      <div className="absolute inset-0 produce-hero-mask" />
    </div>
  );
}

export function FloatingProduceHero({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none select-none relative",
        className
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-0 pointer-events-none">
        {ITEMS.map((it, i) => (
          <div
            key={`${it.emoji}-${i}`}
            className={cn(
              "absolute will-change-transform motion-reduce:animate-none",
              animClass(it.anim)
            )}
            style={
              {
                left: `${it.leftPct}%`,
                top: `${it.topPct}%`,
                opacity: it.opacity,
                filter: it.blurPx ? `blur(${it.blurPx}px)` : undefined,
                ["--p-scale" as never]: it.scale,
                animationDelay: `${it.delayS}s`,
                animationDuration: `${it.durationS}s`,
              } as React.CSSProperties
            }
          >
            <span className="select-none text-4xl sm:text-[44px] drop-shadow-[0_10px_18px_rgba(0,0,0,0.10)]">
              {it.emoji}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

