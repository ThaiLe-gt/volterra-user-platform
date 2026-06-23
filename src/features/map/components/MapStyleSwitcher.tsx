"use client";

import { useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import { Building2, Home, Moon, Sun, Sunrise, Sunset } from "lucide-react";
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
import type { LightPreset, StandardConfig } from "./MapContainer";

interface MapStyleSwitcherProps {
  map: MapboxMap;
  initial: StandardConfig;
  onHome?: () => void;
}

const PRESETS: Array<{ value: LightPreset; label: string; icon: typeof Sun }> = [
  { value: "dawn", label: "Dawn", icon: Sunrise },
  { value: "day", label: "Day", icon: Sun },
  { value: "dusk", label: "Dusk", icon: Sunset },
  { value: "night", label: "Night", icon: Moon },
];

function setConfig(map: MapboxMap, key: string, value: unknown): void {
  try {
    map.setConfigProperty("basemap", key, value);
  } catch {
    // ignore on non-Standard styles
  }
}

export function MapStyleSwitcher({
  map,
  initial,
  onHome,
}: MapStyleSwitcherProps) {
  const [preset, setPreset] = useState<LightPreset>(initial.lightPreset);
  const [show3d, setShow3d] = useState(initial.show3dObjects);

  const selectPreset = (value: LightPreset) => {
    setPreset(value);
    setConfig(map, "lightPreset", value);
  };

  const toggle3d = () => {
    const next = !show3d;
    setShow3d(next);
    setConfig(map, "show3dObjects", next);
  };

  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-card/85 p-1 shadow-lg backdrop-blur-sm">
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
      <Select value={preset} onValueChange={(value) => selectPreset(value as LightPreset)}>
        <SelectTrigger
          aria-label="Map time"
          className="h-8 w-[120px] rounded-lg border-0 bg-transparent px-2.5 text-xs shadow-none hover:bg-accent focus:ring-0 focus:ring-offset-0"
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
      <button
        type="button"
        onClick={toggle3d}
        aria-pressed={show3d}
        title="Toggle 3D buildings"
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors",
          show3d
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        <Building2 className="size-4" />
        3D
      </button>
    </div>
  );
}
