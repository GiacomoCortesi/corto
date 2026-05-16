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
import { FloatingProduceHero, ProduceHeroBackdrop } from "@/components/landing/FloatingProduceHero";
import { SatispayDonateDialog } from "@/components/support/SatispayDonateDialog";
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
    eyebrow: "Le aiuole",
    title: "Disegna lo spazio che hai davvero",
    body: (
      <>
        Terrazzo, orto di casa o piccolo appezzamento: crei <strong>aiuole alle misure giuste</strong>{" "}
        e vedi tutto l’orto in <em>un’unica mappa</em>, senza fogli sparsi.
      </>
    ),
    icon: <Grid3X3 className="size-4" />,
  },
  {
    id: "step-2",
    eyebrow: "Le colture",
    title: "Dal catalogo alla griglia, con un gesto",
    body: (
      <>
        Scegli le piante e le <strong>trascini in posto</strong>. Se cambi idea, le sposti: niente
        disegno da rifare, come quando sistemi le file in campagna.
      </>
    ),
    icon: <Leaf className="size-4" />,
  },
  {
    id: "step-3",
    eyebrow: "Vicinato",
    title: "Buoni vicini, cattivi vicini",
    body: (
      <>
        Vedi subito chi va d’accordo e chi no. Meno errori tra le file, meno malattie — la{" "}
        <strong>saggezza degli orti locali</strong>, sempre sotto mano con <em>Vicino</em>.
      </>
    ),
    icon: <Sparkles className="size-4" />,
  },
  {
    id: "step-4",
    eyebrow: "Stagioni",
    title: "Cosa fare oggi, non un giorno a caso",
    body: (
      <>
        Imposti la data e capisci <strong>a colpo d’occhio</strong> semina, trapianto e raccolto. Il
        catalogo ti propone solo ciò che ha senso <em>in quel periodo</em>, come in un calendario
        dell’orto bio.
      </>
    ),
    icon: <CalendarDays className="size-4" />,
  },
  {
    id: "step-5",
    eyebrow: "Suggerimenti",
    title: "Un promemoria che conosce il tuo orto",
    body: (
      <>
        Consigli leggeri su <strong>cosa fare dopo</strong>, con meteo e storico delle tue colture.
        Per <em>ruotare le colture</em> e curare il suolo, stagione dopo stagione.
      </>
    ),
    icon: <BrainCircuit className="size-4" />,
  },
  {
    id: "step-6",
    eyebrow: "Inizia",
    title: "Pronto a seminare?",
    body: (
      <>
        In due minuti hai la mappa del tuo orto bio. Poi aggiungi le piante, controlli{" "}
        <strong>vicinati e stagioni</strong> — e vai in campo con più tranquillità.
      </>
    ),
    icon: <ArrowRight className="size-4" />,
  },
];

const HEADER_OFFSET_PX = 56;

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
      lenis.scrollTo(target as HTMLElement, { offset: -HEADER_OFFSET_PX, duration: 1.05 });
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const smoothToStep = React.useCallback(
    (idx: number) => {
      const el = pinRef.current;
      if (!el) return;
      const scrollY = window.__lenis?.scroll ?? window.scrollY;
      const top = el.getBoundingClientRect().top + scrollY;
      const vh = Math.max(1, window.innerHeight);
      const y = top + idx * vh;
      const lenis = window.__lenis;
      if (lenis) {
        lenis.scrollTo(y, { offset: -HEADER_OFFSET_PX, duration: 1.05 });
        return;
      }
      window.scrollTo({ top: y - HEADER_OFFSET_PX, behavior: "smooth" });
    },
    []
  );

  React.useEffect(() => {
    const update = () => {
      const el = pinRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = Math.max(1, window.innerHeight);
      const total = vh * (STEPS.length - 1);
      const progressed = Math.min(Math.max(-rect.top, 0), total);
      const next = Math.min(STEPS.length - 1, Math.max(0, Math.floor(progressed / vh)));
      const t = Math.min(1, Math.max(0, (progressed - next * vh) / vh));
      setActiveStep((prev) => (prev === next ? prev : next));
      setStepT(t);
    };

    const tick = () => {
      update();
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
            <Link
              href="/"
              aria-label="Home"
              className="size-9 shrink-0 rounded-xl overflow-hidden ring-1 ring-primary/15 cursor-pointer hover:ring-primary/30 transition-[box-shadow,ring-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Image
                src="/logo.png"
                alt="Corto"
                width={36}
                height={36}
                priority
                unoptimized
                className="size-9 object-cover"
              />
            </Link>
            <span className="text-sm font-semibold tracking-tight">Corto</span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <SatispayDonateDialog />

            <Link href="/app" className={buttonVariants({ variant: "default" })}>
              Entra nell&apos;orto <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <div className="relative min-h-dvh">
          <ProduceHeroBackdrop className="absolute inset-0" />
          <section className="relative z-10 mx-auto flex min-h-dvh max-w-6xl items-center px-6 py-14">
            <div className="grid w-full lg:grid-cols-12 lg:items-center lg:gap-10">
            <div className="lg:col-span-6">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Il tuo orto,{" "}
                <span className="text-primary">gestito in maniera semplice</span>
              </h1>
              <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl">
                Corto ti aiuta a pianificare e gestire il tuo orto in maniera pratica ed efficace. <br />
                Ricrealo in pochi click e ottieni suggerimenti sulle attività, informazioni meteo, e consigli personalizzati.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/app"
                  className={buttonVariants({
                    size: "lg",
                    className:
                      "h-12 rounded-xl px-8 text-base sm:h-14 sm:px-10 sm:text-lg [&_svg]:size-5",
                  })}
                >
                  Inizia l&apos;orto <ArrowRight className="ml-2 size-5" />
                </Link>
              </div>
            </div>

            <div className="mt-10 lg:col-span-6 lg:mt-0">
              <FloatingProduceHero className="mx-auto h-[min(42vh,380px)] w-full max-w-md lg:max-w-none" />
            </div>
          </div>
        </section>
        </div>

        {/* Pin + reveal (Apple-style timeline) */}
        <section
          id="demo"
          ref={(el) => {
            pinRef.current = el;
          }}
          className="relative mx-auto min-h-dvh max-w-6xl px-6"
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
                  {i === STEPS.length - 1 ? (
                    <div className="mt-5">
                      <Link
                        href="/app"
                        className={buttonVariants({
                          size: "lg",
                          className:
                            "h-12 w-full rounded-xl text-base sm:h-14 sm:text-lg [&_svg]:size-5",
                        })}
                      >
                        Inizia l&apos;orto <ArrowRight className="ml-2 size-5" />
                      </Link>
                    </div>
                  ) : null}
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
            <div style={{ height: `${(STEPS.length - 1) * 130}vh` }}>
              <div className="sticky top-14">
                <div className="flex min-h-[calc(100dvh-3.5rem)] items-center">
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
                          {i === STEPS.length - 1 ? (
                            <div className="mt-5">
                              <Link
                                href="/app"
                                className={buttonVariants({
                                  size: "lg",
                                  className:
                                    "h-12 w-full rounded-xl text-base sm:h-14 sm:text-lg [&_svg]:size-5",
                                })}
                              >
                                Inizia l&apos;orto <ArrowRight className="ml-2 size-5" />
                              </Link>
                            </div>
                          ) : null}

                        </Card>
                      ))}
                      {/* reserve height for the absolutely-positioned cards */}
                      <div className="h-[400px] sm:h-[340px]" aria-hidden />
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
                                aria-label={`Vai a: ${s.eyebrow}`}
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

