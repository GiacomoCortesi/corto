"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PropertiesPanel } from "@/components/panels/PropertiesPanel";
import { CompanionPanel } from "@/components/panels/CompanionPanel";
import { StatsDashboard } from "@/components/panels/StatsDashboard";
import { ActivityPanel } from "@/components/panels/ActivityPanel";
import { SuggestionsPanel } from "@/components/panels/SuggestionsPanel";
import { useGardenStore } from "@/lib/store";

export function RightPanel() {
  return (
    <aside className="hidden md:flex w-[300px] xl:w-[340px] shrink-0 border-l border-border bg-sidebar/80 backdrop-blur supports-[backdrop-filter]:bg-sidebar/60 flex-col">
      <RightPanelContent />
    </aside>
  );
}

export function RightPanelContent() {
  const selection = useGardenStore((s) => s.selection);
  const [tab, setTab] = React.useState("properties");

  // Auto switch to properties when user selects something on the canvas
  React.useEffect(() => {
    if (selection) setTab("properties");
  }, [selection]);

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
      <div className="px-3 pt-3">
        <TabsList className="w-full">
          <TabsTrigger value="properties" className="text-xs">
            Proprietà
          </TabsTrigger>
          <TabsTrigger value="companions" className="text-xs">
            Compagne
          </TabsTrigger>
          <TabsTrigger value="stats" className="text-xs">
            Statistiche
          </TabsTrigger>
          <TabsTrigger value="diary" className="text-xs">
            Diario
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="text-xs">
            Suggerimenti
          </TabsTrigger>
        </TabsList>
      </div>
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
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
        </ScrollArea>
      </div>
    </Tabs>
  );
}
