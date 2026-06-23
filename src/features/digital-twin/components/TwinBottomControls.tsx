"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import {
  Boxes,
  Home,
  Layers,
  LayoutDashboard,
  Moon,
  Sun,
  Sunrise,
  Sunset,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  setTreeLayersVisibility,
  type LightPreset,
  type StandardConfig,
} from "@/features/map/components/MapContainer";
import { type TwinPanel, useTwinStore } from "../store/twinStore";

interface TwinBottomControlsProps {
  map?: MapboxMap;
  initial?: StandardConfig;
  onHome?: () => void;
}

const PANEL_BUTTONS: Array<{
  value: TwinPanel;
  label: string;
  icon: typeof Boxes;
}> = [
  { value: "structure", label: "BIM Structure", icon: Boxes },
  { value: "widgets", label: "Dashboard", icon: LayoutDashboard },
];

const PRESETS: Array<{ value: LightPreset; label: string; icon: typeof Sun }> = [
  { value: "dawn", label: "Dawn", icon: Sunrise },
  { value: "day", label: "Day", icon: Sun },
  { value: "dusk", label: "Dusk", icon: Sunset },
  { value: "night", label: "Night", icon: Moon },
];

type LayerState = {
  show3dObjects: boolean;
  showTrees: boolean;
  showPlaceLabels: boolean;
  showPointOfInterestLabels: boolean;
  showRoadLabels: boolean;
  showTransitLabels: boolean;
};

type LayerKey = keyof LayerState;

const OBJECT_LAYERS: Array<{ key: LayerKey; label: string }> = [
  { key: "show3dObjects", label: "3D objects" },
  { key: "showTrees", label: "Trees" },
];

const LABEL_LAYERS: Array<{ key: LayerKey; label: string }> = [
  { key: "showPlaceLabels", label: "Place labels" },
  { key: "showPointOfInterestLabels", label: "POI labels" },
  { key: "showRoadLabels", label: "Road labels" },
  { key: "showTransitLabels", label: "Transit labels" },
];

function setConfig(map: MapboxMap, key: string, value: unknown): void {
  try {
    map.setConfigProperty("basemap", key, value);
  } catch {
    // ignore on non-Standard styles
  }
}

export function TwinBottomControls({
  map,
  initial,
  onHome,
}: TwinBottomControlsProps) {
  const { activePanel, setActivePanel } = useTwinStore();
  const [preset, setPreset] = useState<LightPreset>(
    initial?.lightPreset ?? "dawn"
  );
  const [layers, setLayers] = useState<LayerState>(() =>
    getInitialLayers(initial)
  );
  const [layersOpen, setLayersOpen] = useState(false);
  const layersRef = useRef<HTMLDivElement>(null);
  const hasMapControls = !!map && !!initial;

  useEffect(() => {
    if (!layersOpen) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!layersRef.current?.contains(event.target as Node)) {
        setLayersOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLayersOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [layersOpen]);

  const selectPreset = (value: LightPreset) => {
    setPreset(value);
    if (map) setConfig(map, "lightPreset", value);
  };

  const toggleLayer = (key: LayerKey) => {
    if (!map) return;
    const next = !layers[key];
    setLayers({ ...layers, [key]: next });
    if (key === "showTrees") {
      setConfig(map, "show3dTrees", next);
      setTreeLayersVisibility(map, next);
    } else {
      setConfig(map, key, next);
    }
  };

  return (
    <div className="flex max-w-[calc(100vw-2rem)] items-center gap-1 rounded-xl border border-border bg-card/85 p-1 shadow-lg backdrop-blur-sm">
      {hasMapControls && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onHome}
                className="text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Return to site view"
              >
                <Home className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Return to site view</TooltipContent>
          </Tooltip>
          <div className="mx-0.5 h-5 w-px bg-border" />
        </>
      )}

      {PANEL_BUTTONS.map(({ value, label, icon: Icon }) => (
        <Tooltip key={value}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setActivePanel(value)}
              aria-label={label}
              aria-pressed={activePanel === value}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg transition-colors",
                activePanel === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">{label}</TooltipContent>
        </Tooltip>
      ))}

      {hasMapControls && (
        <>
          <div className="mx-0.5 h-5 w-px bg-border" />
          <Select
            value={preset}
            onValueChange={(value) => selectPreset(value as LightPreset)}
          >
            <SelectTrigger
              aria-label="Map time"
              className="h-8 w-[116px] rounded-lg border-0 bg-transparent px-2.5 text-xs shadow-none hover:bg-accent focus:ring-0 focus:ring-offset-0"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="center">
              {PRESETS.map(({ value, label, icon: Icon }) => (
                <SelectItem key={value} value={value}>
                  <span className="flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" />
                    {label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mx-0.5 h-5 w-px bg-border" />
          <div ref={layersRef} className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setLayersOpen((open) => !open)}
                  aria-label="Map layers"
                  aria-expanded={layersOpen}
                  aria-haspopup="dialog"
                  className={cn(
                    "flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors",
                    layersOpen
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Layers className="size-4" />
                  Layers
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Map layers</TooltipContent>
            </Tooltip>

            {layersOpen && (
              <div
                role="dialog"
                aria-label="Map layers"
                className="absolute bottom-full right-0 z-50 mb-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card/95 p-2 text-foreground shadow-xl backdrop-blur-md"
              >
                <LayerGroup title="Objects">
                  {OBJECT_LAYERS.map(({ key, label }) => (
                    <LayerToggle
                      key={key}
                      label={label}
                      checked={layers[key]}
                      onToggle={() => toggleLayer(key)}
                    />
                  ))}
                </LayerGroup>
                <div className="my-1 h-px bg-border" />
                <LayerGroup title="Labels">
                  {LABEL_LAYERS.map(({ key, label }) => (
                    <LayerToggle
                      key={key}
                      label={label}
                      checked={layers[key]}
                      onToggle={() => toggleLayer(key)}
                    />
                  ))}
                </LayerGroup>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function getInitialLayers(initial?: StandardConfig): LayerState {
  return {
    show3dObjects: initial?.show3dObjects ?? true,
    showTrees: initial?.showTrees ?? false,
    showPlaceLabels: initial?.showPlaceLabels ?? true,
    showPointOfInterestLabels: initial?.showPointOfInterestLabels ?? true,
    showRoadLabels: initial?.showRoadLabels ?? true,
    showTransitLabels: initial?.showTransitLabels ?? true,
  };
}

function LayerGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="px-2 py-1 text-[11px] font-medium uppercase text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}

function LayerToggle({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className="flex h-9 w-full items-center justify-between rounded-lg px-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-accent"
    >
      <span>{label}</span>
      <span
        className={cn(
          "relative h-4 w-7 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-3 rounded-full bg-background shadow-sm transition-transform",
            checked ? "translate-x-3.5" : "translate-x-0.5"
          )}
        />
      </span>
    </button>
  );
}
