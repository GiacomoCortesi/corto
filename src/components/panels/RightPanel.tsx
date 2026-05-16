"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PropertiesPanel } from "@/components/panels/PropertiesPanel";
import { CompanionPanel } from "@/components/panels/CompanionPanel";
import { StatsDashboard } from "@/components/panels/StatsDashboard";
import { ActivityPanel } from "@/components/panels/ActivityPanel";
import { SuggestionsPanel } from "@/components/panels/SuggestionsPanel";
import { EvolutionPanel } from "@/components/panels/EvolutionPanel";
import { useGardenStore } from "@/lib/store";
import {
  BarChart3Icon,
  LightbulbIcon,
  NotebookPenIcon,
  ShuffleIcon,
  SlidersHorizontalIcon,
  UsersIcon,
} from "lucide-react";

/** UI flag: rotation/evolution tab stays in codebase but is hidden from users. */
const ROTATION_TAB_VISIBLE = false;

const PANEL_TABS = [
  { value: "properties", label: "Proprietà", icon: SlidersHorizontalIcon },
  { value: "companions", label: "Compagne", icon: UsersIcon },
  { value: "stats", label: "Statistiche", icon: BarChart3Icon },
  { value: "diary", label: "Diario", icon: NotebookPenIcon },
  { value: "suggestions", label: "Suggerimenti", icon: LightbulbIcon },
  { value: "rotation", label: "Rotazione", icon: ShuffleIcon },
] as const;

function PanelTabTrigger({
  value,
  label,
  icon: Icon,
}: {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <TabsTrigger value={value} className="text-xs px-2">
          <Icon className="size-4" aria-hidden />
          <span className="sr-only">{label}</span>
        </TabsTrigger>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

export function RightPanel() {
  return (
    <aside className="hidden md:flex w-[360px] xl:w-[400px] shrink-0 border-l border-border bg-sidebar/80 backdrop-blur supports-[backdrop-filter]:bg-sidebar/60 flex-col">
      <RightPanelContent />
    </aside>
  );
}

export function RightPanelContent({
  scrollMode = "scroll-area",
}: {
  scrollMode?: "scroll-area" | "native";
}) {
  const selection = useGardenStore((s) => s.selection);
  const [tab, setTab] = React.useState("properties");

  React.useEffect(() => {
    if (selection) setTab("properties");
  }, [selection]);

  React.useEffect(() => {
    if (!ROTATION_TAB_VISIBLE && tab === "rotation") {
      setTab("properties");
    }
  }, [tab]);

  const panels = (
    <>
      <TabsContent value="properties" className="m-0">
        <PropertiesPanel />
      </TabsContent>
      <TabsContent value="companions" className="m-0">
        <CompanionPanel />
      </TabsContent>
      <TabsContent value="stats" className="m-0">
        <StatsDashboard />
      </TabsContent>
      <TabsContent value="diary" className="m-0">
        <ActivityPanel />
      </TabsContent>
      <TabsContent value="suggestions" className="m-0">
        <SuggestionsPanel />
      </TabsContent>
      <TabsContent
        value="rotation"
        className={ROTATION_TAB_VISIBLE ? "m-0" : "m-0 hidden"}
        hidden={!ROTATION_TAB_VISIBLE}
      >
        <EvolutionPanel />
      </TabsContent>
    </>
  );

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-3 pt-9 lg:pt-9">
        <TabsList className="w-full">
          {PANEL_TABS.filter(
            (t) => ROTATION_TAB_VISIBLE || t.value !== "rotation",
          ).map((t) => (
            <PanelTabTrigger
              key={t.value}
              value={t.value}
              label={t.label}
              icon={t.icon}
            />
          ))}
        </TabsList>
      </div>
      <div className="min-h-0 flex-1">
        {scrollMode === "native" ? (
          <div
            className="h-full min-h-0 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
            onWheel={(e) => e.stopPropagation()}
          >
            {panels}
          </div>
        ) : (
          <ScrollArea className="h-full">{panels}</ScrollArea>
        )}
      </div>
    </Tabs>
  );
}
