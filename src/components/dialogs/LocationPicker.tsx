"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Navigation, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { geocode, geocodeLabel, type GeocodeResult } from "@/lib/weather/geocoding";
import type { GardenLocation } from "@/lib/types";

type Props = {
  /** Posizione attualmente impostata (per mostrare lo stato corrente) */
  current?: GardenLocation;
  /** Chiamato quando l'utente sceglie una località */
  onPick: (loc: GardenLocation) => void;
  /** Mostra il pulsante "Rimuovi posizione" se c'è già una `current` */
  onClear?: () => void;
  /** Etichetta del campo cerca (default "Cerca città o località") */
  searchLabel?: string;
  /** Layout compatto per usarlo dentro pannelli laterali stretti */
  compact?: boolean;
};

const browserTimezone = (): string | undefined => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};

export function LocationPicker({
  current,
  onPick,
  onClear,
  searchLabel = "Cerca città o località",
  compact = false,
}: Props) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<GeocodeResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [geoLoading, setGeoLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reqIdRef = React.useRef(0);

  // Debounce ricerca su input. Nota: lo stato "vuoto" viene gestito
  // direttamente in onChange per evitare setState dentro l'effect quando
  // la query e' troppo corta (lint react-hooks/set-state-in-effect).
  React.useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const myId = ++reqIdRef.current;
    const t = window.setTimeout(async () => {
      const r = await geocode(trimmed, 6);
      if (reqIdRef.current !== myId) return;
      setResults(r);
      setSearching(false);
    }, 300);
    return () => {
      window.clearTimeout(t);
    };
  }, [query]);

  const handleUseGeolocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocalizzazione non disponibile sul browser.");
      return;
    }
    setError(null);
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        onPick({
          lat: Number(pos.coords.latitude.toFixed(4)),
          lon: Number(pos.coords.longitude.toFixed(4)),
          label: "Posizione corrente",
          timezone: browserTimezone(),
        });
      },
      (err) => {
        setGeoLoading(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Permesso negato. Cerca per nome, oppure consenti la posizione e riprova."
            : "Impossibile ottenere la posizione.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60_000 },
    );
  };

  const handlePick = (r: GeocodeResult) => {
    onPick({
      lat: Number(r.lat.toFixed(4)),
      lon: Number(r.lon.toFixed(4)),
      label: geocodeLabel(r),
      timezone: r.timezone ?? browserTimezone(),
    });
  };

  return (
    <div className="space-y-3">
      {current ? (
        <div
          className={cn(
            "flex items-start gap-2 rounded-md border border-border bg-muted/40 p-2",
            compact ? "text-xs" : "text-sm",
          )}
        >
          <MapPin className="size-3.5 mt-0.5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="font-medium leading-tight">
              {current.label ?? "Posizione impostata"}
            </div>
            <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
              {current.lat.toFixed(4)}, {current.lon.toFixed(4)}
              {current.timezone ? ` · ${current.timezone}` : ""}
            </div>
          </div>
          {onClear ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onClear}
              aria-label="Rimuovi posizione"
            >
              <X />
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="loc-search" className={cn(compact ? "text-xs" : undefined)}>
          {searchLabel}
        </Label>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            id="loc-search"
            value={query}
            onChange={(e) => {
              const v = e.target.value;
              setQuery(v);
              setError(null);
              if (v.trim().length < 2) {
                setResults([]);
                setSearching(false);
              } else {
                setSearching(true);
              }
            }}
            placeholder="es. Bologna, Trento, Milano…"
            className="pl-7"
            autoComplete="off"
          />
          {searching ? (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground animate-spin" />
          ) : null}
        </div>
      </div>

      {results.length > 0 ? (
        <ul className="max-h-48 overflow-y-auto rounded-md border border-border divide-y divide-border bg-card">
          {results.map((r) => (
            <li key={`${r.lat}-${r.lon}-${r.name}`}>
              <button
                type="button"
                onClick={() => handlePick(r)}
                className="w-full flex items-start gap-2 px-2 py-1.5 text-left hover:bg-muted/50"
              >
                <MapPin className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-tight truncate">
                    {geocodeLabel(r)}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    {r.lat.toFixed(4)}, {r.lon.toFixed(4)}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : query.trim().length >= 2 && !searching ? (
        <p className="text-xs text-muted-foreground">
          Nessun risultato. Prova un nome diverso.
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseGeolocation}
          disabled={geoLoading}
        >
          {geoLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Navigation />
          )}
          Usa la mia posizione
        </Button>
      </div>

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
