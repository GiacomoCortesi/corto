"use client";

import * as React from "react";
import Image from "next/image";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  type Node,
  type NodeChange,
  type NodeMouseHandler,
  applyNodeChanges,
} from "@xyflow/react";
import { useGardenStore } from "@/lib/store";
import { BedNode } from "@/components/canvas/BedNode";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Bed } from "@/lib/types";

const nodeTypes = { bed: BedNode };

type Props = {
  innerRef?: React.RefObject<HTMLDivElement | null>;
};

function FlowInner({ innerRef }: Props) {
  const beds = useGardenStore((s) => s.beds);
  const moveBed = useGardenStore((s) => s.moveBed);
  const setSelection = useGardenStore((s) => s.setSelection);
  const selection = useGardenStore((s) => s.selection);
  const addBed = useGardenStore((s) => s.addBed);

  const [rfNodes, setRfNodes] = React.useState<Node[]>([]);

  // Sync store -> RF nodes (preserve drag position from local state)
  React.useEffect(() => {
    setRfNodes((current) => {
      const positions = new Map(current.map((n) => [n.id, n.position]));
      return beds.map<Node>((bed) => ({
        id: bed.id,
        type: "bed",
        position: positions.get(bed.id) ?? bed.position,
        data: { bed },
        selected:
          selection?.kind === "bed" && selection.bedId === bed.id
            ? true
            : selection?.kind === "plant" && selection.bedId === bed.id
              ? true
              : false,
        dragHandle: ".bed-drag-handle",
      }));
    });
  }, [beds, selection]);

  const onNodesChange = React.useCallback(
    (changes: NodeChange[]) => {
      setRfNodes((current) => applyNodeChanges(changes, current));
      for (const change of changes) {
        if (change.type === "position" && change.position && !change.dragging) {
          moveBed(change.id, change.position);
        }
      }
    },
    [moveBed]
  );

  const onNodeClick: NodeMouseHandler = React.useCallback(
    (_, node) => {
      const bed = (node.data as { bed: Bed }).bed;
      setSelection({ kind: "bed", bedId: bed.id });
    },
    [setSelection]
  );

  const onPaneClick = React.useCallback(() => {
    setSelection(null);
  }, [setSelection]);

  return (
    <div ref={innerRef} className="flex-1 min-h-0 relative">
      <ReactFlow
        nodes={rfNodes}
        edges={[]}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        snapToGrid
        snapGrid={[16, 16]}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1, minZoom: 0.4 }}
        minZoom={0.3}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={null}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1.4}
          color="var(--canvas-dot)"
        />
        <Controls
          showInteractive={false}
          position="bottom-left"
          className="!shadow-sm"
        />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          maskColor="color-mix(in oklab, var(--canvas-bg) 70%, transparent)"
          nodeColor="var(--primary)"
          nodeStrokeColor="var(--border)"
          nodeBorderRadius={8}
          className="!w-40 !h-28 hidden md:!flex"
        />

        <Panel position="top-left" className="!m-3">
          <Button
            size="sm"
            onClick={() => addBed()}
            className="shadow-sm"
          >
            <Plus className="size-4" />
            Nuova aiuola
          </Button>
        </Panel>

        {beds.length === 0 ? (
          <Panel
            position="top-center"
            className="!m-0 inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="text-center px-8 py-10 rounded-2xl border border-dashed border-primary/20 bg-card/70 backdrop-blur max-w-md pointer-events-auto fade-in-up shadow-sm">
              <div className="size-14 rounded-2xl brand-gradient ring-1 ring-primary/15 grid place-items-center mx-auto mb-3">
                <Image
                  src="/logo.png"
                  alt="Corto"
                  width={44}
                  height={44}
                  className="size-11 object-contain"
                />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">
                L&apos;orto è vuoto
              </h2>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Crea la prima aiuola e trascina le piante dal catalogo a
                sinistra per cominciare a progettare.
              </p>
              <Button onClick={() => addBed()} size="sm">
                <Plus className="size-4" />
                Crea la prima aiuola
              </Button>
            </div>
          </Panel>
        ) : null}
      </ReactFlow>
    </div>
  );
}

export function GardenCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <FlowInner {...props} />
    </ReactFlowProvider>
  );
}
