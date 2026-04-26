"use client";

import * as React from "react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { Heart, Smartphone } from "lucide-react";
import confetti from "canvas-confetti";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { getSupportersCount, incrementSupportersCount } from "@/lib/supporters";
import { toast } from "sonner";

const SATISPAY_USER_CODE = "S6Y-CON--3FE31A74-9679-4A48-9EE2-AA7931A56921";

function amountUrl(cents: number) {
  const base = `https://www.satispay.com/app/match/link/user/${SATISPAY_USER_CODE}`;
  return `${base}?amount=${cents}&currency=EUR`;
}

const AMOUNTS = [
  { label: "1€", cents: 100, hint: "Un caffè" },
  { label: "5€", cents: 500, hint: "Supporto" },
  { label: "10€", cents: 1000, hint: "Sponsor" },
] as const;

export function SatispayDonateDialog() {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<(typeof AMOUNTS)[number]>(AMOUNTS[1]);
  const url = amountUrl(selected.cents);
  const [supporters, setSupporters] = React.useState<number | null>(null);
  const [thanked, setThanked] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    track("donation_open_support_page", { provider: "satispay" });
    setThanked(false);
    void (async () => {
      const n = await getSupportersCount();
      if (n !== null) setSupporters(n);
    })();
  }, [open]);

  const onThanks = async () => {
    setThanked(true);
    track("donation_thanks", { provider: "satispay", cents: selected.cents });
    try {
      const burst = (particleCount: number, opts?: Parameters<typeof confetti>[0]) =>
        confetti({
          particleCount: 1000,
          spread: 360,
          startVelocity: 55,
          decay: 0.92,
          scalar: 1.5,
          ticks: 260,
          origin: { x: 0.5, y: 0.5 },
          ...opts,
        });

      // Full-screen feel: multiple bursts with wide spread.
      burst(280);
      window.setTimeout(() => burst(220, { startVelocity: 45, scalar: 0.95 }), 120);
      window.setTimeout(() => burst(180, { startVelocity: 35, scalar: 0.9 }), 240);
    } catch {
      // ignore
    }
    toast.success("Grazie, sono commosso ❤️", { duration: 2500 });
    const n = await incrementSupportersCount();
    if (n !== null) setSupporters(n);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="secondary" size="sm" title="Dona con Satispay">
            <Heart className="size-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dona con Satispay</DialogTitle>
          <DialogDescription>
            <span className="inline-flex items-center gap-1 whitespace-nowrap align-middle">
              Corto
              <Image
                src="/logo.png"
                alt=""
                width={14}
                height={14}
                className="size-3.5 shrink-0 rounded-sm"
              />
            </span>{" "}
            è gratis e lo sarà sempre. Qui supporti, se ti va, i deliranti esperimenti di uno
            sviluppatore.
          </DialogDescription>
        </DialogHeader>

        {supporters !== null ? (
          <div className="text-[11px] text-muted-foreground">
            Supporter: <span className="font-mono tabular-nums text-foreground">{supporters}</span>
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-2">
          {AMOUNTS.map((a) => {
            const active = a.cents === selected.cents;
            return (
              <button
                key={a.cents}
                type="button"
                onClick={() => setSelected(a)}
                className={cn(
                  "rounded-lg border px-2 py-2 text-left transition-colors",
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted/40",
                )}
              >
                <div className="text-sm font-semibold tabular-nums">{a.label}</div>
                <div className="text-[10px] text-muted-foreground">{a.hint}</div>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-border bg-card/40 p-4 grid place-items-center">
          <QRCodeSVG value={url} size={180} level="M" includeMargin />
          <div className="mt-2 text-[11px] text-muted-foreground text-center">
            Scan QR (desktop) · oppure apri Satispay (mobile)
          </div>
        </div>

        <div className="grid gap-2">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ size: "default", variant: "default", className: "w-full" })}
            onClick={() =>
              track("donation_click", { provider: "satispay", cents: selected.cents })
            }
          >
            <Smartphone className="size-4" />
            Apri Satispay
          </a>

          <Button
            type="button"
            variant="outline"
            onClick={() => void onThanks()}
            disabled={thanked}
          >
            {thanked ? "Grazie!" : "Ho donato"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

