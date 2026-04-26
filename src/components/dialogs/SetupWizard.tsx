"use client";

import * as React from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, ArrowRight, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { LocationPicker } from "@/components/dialogs/LocationPicker";
import type { GardenLocation, SunOrientation } from "@/lib/types";

type Props = {
  open: boolean;
  onComplete: (
    name: string,
    sunOrientation: SunOrientation,
    location?: GardenLocation,
  ) => void;
};

type Step = 0 | 1 | 2;
const TOTAL_STEPS = 3;

const ORIENTATIONS: {
  id: SunOrientation;
  label: string;
  description: string;
}[] = [
  { id: "S", label: "Sud", description: "Massima esposizione, ideale per ortaggi da frutto" },
  { id: "N", label: "Nord", description: "Mezzombra, indicata per foglia e radici" },
  { id: "E", label: "Est", description: "Sole del mattino, fresco al pomeriggio" },
  { id: "O", label: "Ovest", description: "Sole del pomeriggio, più caldo e secco" },
];

export function SetupWizard({ open, onComplete }: Props) {
  const [step, setStep] = React.useState<Step>(0);
  const [name, setName] = React.useState("Il mio orto");
  const [orientation, setOrientation] = React.useState<SunOrientation>("S");
  const [location, setLocation] = React.useState<GardenLocation | undefined>(
    undefined,
  );

  React.useEffect(() => {
    if (open) {
      setStep(0);
      setName("Il mio orto");
      setOrientation("S");
      setLocation(undefined);
    }
  }, [open]);

  const finish = () => {
    onComplete(name.trim() || "Il mio orto", orientation, location);
  };

  const handleNext = () => {
    if (step === 0) {
      if (name.trim().length === 0) return;
      setStep(1);
    } else if (step === 1) {
      setStep(2);
    } else {
      finish();
    }
  };

  const handleBack = () => {
    if (step === 0) return;
    setStep((s) => (s - 1) as Step);
  };

  const titles = [
    "Diamo un nome al tuo orto",
    "Dove guarda l'orto?",
    "Dov'è il tuo orto?",
  ];
  const descriptions = [
    "Useremo questo nome nei tuoi salvataggi e nelle esportazioni PNG.",
    "L'orientamento prevalente influenza la scelta delle piante e l'esposizione al sole.",
    "Serve a recuperare il meteo locale per i suggerimenti. Puoi saltare questo passo e impostarla più tardi dalle Proprietà.",
  ];
  const nextLabels = ["Avanti", "Avanti", "Inizia a piantare"];

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl brand-gradient ring-1 ring-primary/15 grid place-items-center shrink-0">
              <Image
                src="/logo.png"
                alt="Corto"
                width={28}
                height={28}
                className="size-7 object-contain"
              />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-primary/80">
              Benvenuto in Corto · Step {step + 1} di {TOTAL_STEPS}
            </span>
          </div>
          <DialogTitle className="text-2xl tracking-tight pt-2">
            {titles[step]}
          </DialogTitle>
          <DialogDescription>{descriptions[step]}</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {step === 0 ? (
            <div className="space-y-2">
              <Label htmlFor="garden-name">Nome dell&apos;orto</Label>
              <Input
                id="garden-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleNext();
                }}
                autoFocus
                className="h-10"
              />
              <p className="text-[11px] text-muted-foreground">
                Suggerimento: &quot;Orto in terrazza&quot;, &quot;Aiuole sotto il melo&quot;...
              </p>
            </div>
          ) : step === 1 ? (
            <RadioGroup
              value={orientation}
              onValueChange={(v) => setOrientation(v as SunOrientation)}
              className="grid grid-cols-2 gap-2"
            >
              {ORIENTATIONS.map((o) => {
                const active = orientation === o.id;
                return (
                  <Label
                    key={o.id}
                    htmlFor={`orient-${o.id}`}
                    className={cn(
                      "rounded-xl border p-3 cursor-pointer transition-colors flex items-start gap-2",
                      active
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <RadioGroupItem
                      id={`orient-${o.id}`}
                      value={o.id}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Compass
                          className={cn(
                            "size-3.5",
                            active ? "text-primary" : "text-muted-foreground",
                          )}
                        />
                        <span className="text-sm font-semibold tracking-tight">
                          {o.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        {o.description}
                      </p>
                    </div>
                  </Label>
                );
              })}
            </RadioGroup>
          ) : (
            <LocationPicker
              current={location}
              onPick={(loc) => setLocation(loc)}
              onClear={() => setLocation(undefined)}
            />
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          {step > 0 ? (
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="size-4" />
              Indietro
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {step === 2 && !location ? (
              <Button variant="ghost" size="sm" onClick={finish}>
                Salta
              </Button>
            ) : null}
            <Button onClick={handleNext} size="sm">
              {nextLabels[step]}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
