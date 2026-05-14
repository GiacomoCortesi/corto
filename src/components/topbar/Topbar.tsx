"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Download,
  Heart,
  Info,
  MoreHorizontal,
  PanelLeft,
  PanelRight,
  Redo2,
  RotateCcw,
  Undo2,
} from "lucide-react";
import { useGardenStore } from "@/lib/store";
import { ThemeToggle } from "@/components/topbar/ThemeToggle";
import { toast } from "sonner";
import { exportElementToPng, safeFilename } from "@/lib/utils/export";
import { exportProjectJson, importProjectJsonText } from "@/lib/utils/project-io";
import { PlantTypeSummary } from "@/components/panels/PlantTypeSummary";
import { track } from "@/lib/analytics";
import { SatispayDonateDialog } from "@/components/support/SatispayDonateDialog";
import { GitHubIcon } from "@/components/icons/GitHubIcon";
import { FruitPlusIcon } from "@/components/icons/FruitPlusIcon";
import { AddPlantDialog } from "@/components/dialogs/AddPlantDialog";
import { RightPanelContent } from "@/components/panels/RightPanel";
import { PlantCatalogContent } from "@/components/sidebar/PlantCatalog";

type Props = {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onReset: () => void;
};

export function Topbar({ canvasRef, onReset }: Props) {
  const meta = useGardenStore((s) => s.meta);
  const beds = useGardenStore((s) => s.beds);
  const renameGarden = useGardenStore((s) => s.renameGarden);
  const undo = useGardenStore((s) => s.undo);
  const redo = useGardenStore((s) => s.redo);
  const past = useGardenStore((s) => s.past.length);
  const future = useGardenStore((s) => s.future.length);

  const [name, setName] = React.useState(meta.name);
  const [addPlantOpen, setAddPlantOpen] = React.useState(false);
  React.useEffect(() => setName(meta.name), [meta.name]);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const commitName = () => {
    const next = name.trim() || "Il mio orto";
    if (next !== meta.name) renameGarden(next);
    setName(next);
  };

  const onExport = async () => {
    const el = canvasRef.current;
    if (!el) {
      toast.error("Canvas non pronto");
      return;
    }
    try {
      toast.loading("Genero PNG...", { id: "export" });
      await exportElementToPng(
        el,
        `${safeFilename(meta.name)}-${new Date().toISOString().slice(0, 10)}.png`
      );
      toast.success("PNG scaricato", { id: "export" });
      track("export_png");
    } catch (e) {
      console.error(e);
      toast.error("Errore export", { id: "export" });
    }
  };

  const onExportProject = () => {
    try {
      exportProjectJson(
        `${safeFilename(meta.name)}-${new Date().toISOString().slice(0, 10)}.json`,
      );
      toast.success("Progetto esportato");
      track("export_project");
    } catch (e) {
      console.error(e);
      toast.error("Errore export progetto");
    }
  };

  const onImportProject = async (file: File) => {
    try {
      toast.loading("Importo progetto...", { id: "import-project" });
      const text = await file.text();
      importProjectJsonText(text);
      toast.success("Progetto importato", { id: "import-project" });
      track("import_project");
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error ? e.message : "Errore import progetto",
        { id: "import-project" },
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <header className="h-14 shrink-0 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65 px-4 flex items-center gap-3 z-10">
      <div className="flex items-center gap-2.5 min-w-0">
        <Link
          href="/"
          aria-label="Home"
          className="size-9 rounded-xl brand-gradient ring-1 ring-primary/15 grid place-items-center shrink-0 cursor-pointer hover:ring-primary/30 transition-[box-shadow,ring-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Image
            src="/logo.png"
            alt="Corto"
            width={28}
            height={28}
            priority
            className="size-7 object-contain"
          />
        </Link>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-primary/80 leading-none">
            Corto
          </span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="h-7 -ml-2 px-2 border-transparent bg-transparent text-sm font-semibold tracking-tight shadow-none hover:bg-muted/60 focus-visible:bg-card focus-visible:border-input"
            aria-label="Nome dell'orto"
          />
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Aggiungi frutta e verdura all'aiuola"
          title="Aggiungi all'aiuola"
          className="relative md:h-9 md:w-auto md:px-3 md:gap-2"
          onClick={() => setAddPlantOpen(true)}
        >
          <FruitPlusIcon />
          <span className="hidden md:inline text-[10px] font-mono uppercase tracking-[0.18em]">
            Aggiungi
          </span>
        </Button>
        <AddPlantDialog open={addPlantOpen} onOpenChange={setAddPlantOpen} />

        <div className="flex items-center gap-1 md:hidden">
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Apri stagione e calendario" />
              }
            >
              <PanelLeft className="size-4" />
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col overflow-hidden p-0">
              <div className="flex min-h-0 flex-1 flex-col border-r border-border bg-sidebar/80 backdrop-blur supports-[backdrop-filter]:bg-sidebar/60">
                <PlantCatalogContent scrollMode="native" />
              </div>
            </SheetContent>
          </Sheet>

          <Sheet>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Apri pannello" />
              }
            >
              <PanelRight className="size-4" />
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col overflow-hidden p-0">
              <div className="flex min-h-0 flex-1 flex-col border-l border-border bg-sidebar/80 backdrop-blur supports-[backdrop-filter]:bg-sidebar/60">
                <RightPanelContent scrollMode="native" />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onImportProject(file);
          }}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={undo}
              disabled={past === 0}
              aria-label="Annulla"
              className="hidden sm:inline-flex"
            >
              <Undo2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Annulla</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={redo}
              disabled={future === 0}
              aria-label="Ripeti"
              className="hidden sm:inline-flex"
            >
              <Redo2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ripeti</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-2 h-6 hidden md:block" />

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Riepilogo orto"
              className="hidden md:inline-flex"
            >
              <Info className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={8} className="w-80">
            <PlantTypeSummary
              beds={beds}
              title={meta.name}
              subtitle={
                beds.length === 0
                  ? "Nessuna aiuola"
                  : `${beds.length} ${beds.length === 1 ? "aiuola" : "aiuole"} · per tipo`
              }
            />
          </PopoverContent>
        </Popover>

        <SatispayDonateDialog />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Apri profilo GitHub"
              className="hidden md:inline-flex"
              onClick={() => {
                window.open("https://github.com/GiacomoCortesi", "_blank", "noopener,noreferrer");
                track("open_github_profile");
              }}
            >
              <GitHubIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>GitHub</TooltipContent>
        </Tooltip>

        <div className="hidden md:block">
          <ThemeToggle />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Altre azioni">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              className="sm:hidden"
              onClick={() => {
                undo();
              }}
              disabled={past === 0}
            >
              <Undo2 className="size-4" />
              Annulla
            </DropdownMenuItem>
            <DropdownMenuItem
              className="sm:hidden"
              onClick={() => {
                redo();
              }}
              disabled={future === 0}
            >
              <Redo2 className="size-4" />
              Ripeti
            </DropdownMenuItem>
            <DropdownMenuItem
              className="md:hidden"
              onClick={() => {
                window.open("https://github.com/GiacomoCortesi", "_blank", "noopener,noreferrer");
                track("open_github_profile");
              }}
            >
              <GitHubIcon className="size-4" />
              GitHub
            </DropdownMenuItem>
            <DropdownMenuSeparator className="md:hidden" />
            <DropdownMenuItem onClick={onExport}>
              <Download className="size-4" />
              Esporta PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportProject}>
              <Download className="size-4" />
              Esporta progetto (.json)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                fileInputRef.current?.click();
              }}
            >
              <Download className="size-4 rotate-180" />
              Importa progetto (.json)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (
                  window.confirm(
                    "Vuoi ricominciare da zero? Perderai tutte le aiuole e le piante."
                  )
                ) {
                  onReset();
                }
              }}
            >
              <RotateCcw className="size-4" />
              Ricomincia da zero
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="text-xs">
              v0.0.1
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
