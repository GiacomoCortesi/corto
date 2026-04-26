"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  CalendarDays,
  Download,
  Grid3X3,
  Leaf,
  Sparkles,
  Undo2,
  BrainCircuit,
} from "lucide-react";
import { DemoGrid } from "@/components/landing/DemoGrid";
import { FloatingProduceHero } from "@/components/landing/FloatingProduceHero";
import { cn } from "@/lib/utils";

type Step = {
  id: string;
  eyebrow: string;
  title: React.ReactNode;
  body: React.ReactNode;
  icon: React.ReactNode;
};

const STEPS: Step[] = [
  {
    id: "step-1",
    eyebrow: "Step 1",
    title: "Aiuole componibili, come il tuo spazio",
    body: (
      <>
        Crea <strong>aiuole modulari</strong> e adattale alle misure reali. Se hai più appezzamenti,
        organizzali in aiuole separate e ottieni una <em>visione completa</em> di tutto l’orto.
      </>
    ),
    icon: <Grid3X3 className="size-4" />,
  },
  {
    id: "step-2",
    eyebrow: "Step 2",
    title: "Trascina dal catalogo alla griglia",
    body: (
      <>
        Scegli dal <strong>catalogo</strong> e posiziona le piante direttamente nelle celle. Poi
        riorganizza tutto <em>trascinando gli elementi</em>: perfetto per modifiche e pianificazione.
      </>
    ),
    icon: <Leaf className="size-4" />,
  },
  {
    id: "step-3",
    eyebrow: "Step 3",
    title: (
      <>
        Info mirate + modalità <em>Vicino</em>
      </>
    ),
    body: (
      <>
        Per ogni pianta ottieni <strong>indicazioni pratiche</strong>: trattamenti, possibili malattie
        e soluzioni. Con <em>“Vicino”</em> vedi subito gli abbinamenti corretti e quelli che possono
        ostacolare la crescita.
      </>
    ),
    icon: <Sparkles className="size-4" />,
  },
  {
    id: "step-4",
    eyebrow: "Step 4",
    title: "Stagioni: tutto parla la stessa lingua",
    body: (
      <>
        Seleziona una data e leggi l’orto <strong>a colpo d’occhio</strong>: semina, trapianto e
        raccolta diventano immediati. Anche il catalogo si filtra automaticamente, mostrando solo
        ciò che ha senso <em>ora</em>.
      </>
    ),
    icon: <CalendarDays className="size-4" />,
  },
  {
    id: "step-5",
    eyebrow: "Step 5",
    title: "AI per pianificare le prossime attività",
    body: (
      <>
        <strong>Suggerimenti intelligenti</strong> basati sul tuo storico: cosa fare, quando farlo e
        perché. Con supporto alla <em>rotazione delle colture</em> per mantenere l’orto sano e
        produttivo.
      </>
    ),
    icon: <BrainCircuit className="size-4" />,
  },
];

export function LandingScrollDemo() {
  const [activeStep, setActiveStep] = React.useState(0);
  const [stepT, setStepT] = React.useState(0);
  const pinRef = React.useRef<HTMLElement | null>(null);
  const rafRef = React.useRef<number>(0);

  const smoothTo = React.useCallback((hash: string) => {
    const target = document.querySelector(hash);
    if (!target) return;
    const lenis = window.__lenis;
    if (lenis) {
      lenis.scrollTo(target as HTMLElement, { offset: -88, duration: 1.05 });
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const smoothToStep = React.useCallback(
    (idx: number) => {
      const el = pinRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const vh = Math.max(1, window.innerHeight);
      const y = top + idx * vh;
      const lenis = window.__lenis;
      if (lenis) {
        lenis.scrollTo(y, { offset: -88, duration: 1.05 });
        return;
      }
      window.scrollTo({ top: y - 88, behavior: "smooth" });
    },
    []
  );

  React.useEffect(() => {
    const tick = () => {
      const el = pinRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const vh = Math.max(1, window.innerHeight);
        const total = vh * (STEPS.length - 1);
        const progressed = Math.min(Math.max(-rect.top, 0), total);
        const next = Math.min(STEPS.length - 1, Math.max(0, Math.floor(progressed / vh)));
        const t = Math.min(1, Math.max(0, (progressed - next * vh) / vh));
        setActiveStep((prev) => (prev === next ? prev : next));
        setStepT(t);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="min-h-dvh">
      <header className="h-14 shrink-0 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65 px-4 flex items-center gap-3 sticky top-0 z-40">
        <div className="w-full flex items-center gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-9 rounded-xl brand-gradient ring-1 ring-primary/15 grid place-items-center shrink-0">
              <Image
                src="/logo.png"
                alt="Corto"
                width={28}
                height={28}
                priority
                className="size-7 object-contain"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-primary/80 leading-none">
                Corto
              </span>
              <span className="text-sm font-semibold tracking-tight leading-tight text-foreground/95">
                Home
              </span>
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">

            <Link href="/app" className={buttonVariants({ variant: "default" })}>
              Apri il planner <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pt-12 pb-6">
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-6">
              <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight">
                Pianifica l’orto. <span className="text-primary">Senza fogli, senza caos.</span>
              </h1>
              <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl">
                Aiuole a griglia, drag &amp; drop, compagne/antagoniste, stagioni, statistiche e
                suggerimenti. Tutto in un canvas semplice e veloce.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link href="/app" className={buttonVariants({ size: "lg" })}>
                  Inizia ora <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </div>
            </div>

            <div className="hidden lg:block lg:col-span-6">
              <FloatingProduceHero className="h-[320px] xl:h-[360px] w-[calc(100%+3rem)] -ml-6" />
            </div>
          </div>
        </section>

        {/* Pin + reveal (Apple-style timeline) */}
        <section
          id="demo"
          ref={(el) => {
            pinRef.current = el;
          }}
          className="mx-auto max-w-6xl px-6"
        >
          {/* Mobile: each step becomes a pair (text + demo) */}
          <div className="lg:hidden py-10 space-y-10">
            {STEPS.map((s, i) => (
              <div key={s.id} className="space-y-4">
                <Card className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/80">
                        {s.eyebrow}
                      </div>
                      <div className="mt-2 text-[18px] font-semibold tracking-tight leading-snug">
                        {s.title}
                      </div>
                    </div>
                    <div className="shrink-0 rounded-2xl border px-3 py-2.5 text-muted-foreground bg-background/50 shadow-sm">
                      {s.icon}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    {s.body}
                  </p>
                </Card>

                <Card className="relative border-primary/10 bg-[var(--canvas-bg)]">
                  <div className="p-4">
                    <DemoGrid step={i} stepT={1} />
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[color-mix(in_oklab,var(--canvas-bg)_92%,transparent)] to-transparent" />
                </Card>
              </div>
            ))}
          </div>

          {/* Desktop/tablet: sticky timeline */}
          <div className="hidden lg:block">
            {/* long scroll duration that drives the timeline */}
            <div className="h-[520vh]">
              <div className="sticky top-[64px]">
                <div className="min-h-[calc(100vh-64px)] flex items-center">
                  <div className="grid lg:grid-cols-12 gap-10 items-start w-full">
                    <div className="lg:col-span-4 lg:order-1 order-2">
                    <div className="relative max-w-[420px]">
                      {STEPS.map((s, i) => (
                        <Card
                          key={s.id}
                          className={cn(
                            "absolute inset-0 p-6 sm:p-7 transition-all duration-500 will-change-transform",
                            i === activeStep
                              ? "opacity-100 translate-y-0 scale-100 border-primary/35 ring-1 ring-primary/15 bg-card shadow-sm"
                              : "opacity-0 translate-y-2 scale-[0.985] blur-[1px] pointer-events-none bg-card/60"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/80">
                                {s.eyebrow}
                              </div>
                              <div className="mt-2 text-[18px] sm:text-[20px] font-semibold tracking-tight leading-snug">
                                {s.title}
                              </div>
                            </div>
                            <div
                              className={cn(
                                "shrink-0 rounded-2xl border px-3 py-2.5 text-muted-foreground bg-background/50 shadow-sm",
                                i === activeStep && "text-primary border-primary/30"
                              )}
                            >
                              {s.icon}
                            </div>
                          </div>
                          <p className="mt-3 text-sm sm:text-[15px] text-muted-foreground leading-relaxed">
                            {s.body}
                          </p>

                        </Card>
                      ))}
                      {/* reserve height for the absolutely-positioned cards */}
                      <div className="h-[340px] sm:h-[280px]" aria-hidden />
                    </div>
                    </div>

                    <div className="lg:col-span-8 lg:order-2 order-1">
                      <Card className="relative overflow-hidden border-primary/10 bg-[var(--canvas-bg)]">
                        <div className="p-4 sm:p-6">
                          <div className="flex items-center justify-between gap-3"></div>

                          <div className="mt-5">
                            <DemoGrid step={activeStep} stepT={stepT} />
                          </div>

                          <div className="mt-5 flex items-center justify-center gap-2">
                            {STEPS.map((s, i) => (
                              <button
                                key={s.id}
                                type="button"
                                className={cn(
                                  "h-2.5 w-2.5 rounded-full border transition-all",
                                  i === activeStep
                                    ? "bg-primary border-primary/40 scale-110"
                                    : "bg-card border-border/70 opacity-70 hover:opacity-100"
                                )}
                                onClick={() => smoothToStep(i)}
                                aria-label={`Vai a ${s.eyebrow}`}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[color-mix(in_oklab,var(--canvas-bg)_92%,transparent)] to-transparent" />
                      </Card>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <Card className="border-primary/15 bg-card/60">
            <div className="px-6 py-10 sm:px-10 sm:py-12 text-center">
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                Pronto?
              </div>
              <p className="mt-3 text-sm sm:text-[15px] text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Crea le aiuole, trascina le piante e ottieni suggerimenti: in pochi minuti hai una
                vista completa del tuo orto.
              </p>
              <div className="mt-6 flex justify-center">
                <Link href="/app" className={buttonVariants({ size: "lg", variant: "default" })}>
                  Inizia ora <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </div>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4 bg-card/60">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </Card>
  );
}

