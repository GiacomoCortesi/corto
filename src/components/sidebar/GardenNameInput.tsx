"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { useGardenStore } from "@/lib/store";

export function GardenNameInput() {
  const meta = useGardenStore((s) => s.meta);
  const renameGarden = useGardenStore((s) => s.renameGarden);

  const [name, setName] = React.useState(meta.name);
  React.useEffect(() => setName(meta.name), [meta.name]);

  const commitName = () => {
    const next = name.trim() || "Il mio orto";
    if (next !== meta.name) renameGarden(next);
    setName(next);
  };

  return (
    <Input
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={commitName}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className="h-8 -ml-2 px-2 border-transparent bg-transparent text-sm font-semibold tracking-tight shadow-none hover:bg-muted/60 focus-visible:bg-card focus-visible:border-input"
      aria-label="Nome dell'orto"
    />
  );
}
